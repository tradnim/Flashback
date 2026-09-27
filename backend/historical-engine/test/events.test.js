const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const app = require('../src/src/models/src/routes/events');
const Model = require('../src/src/models/src/models/chernobylEvent');
const { initializeDatabase } = require('../src/src/models/src/services/eventService');
const { connectDatabase } = require('../src/database');
const server = app.listen(0, '127.0.0.1');
after(() => new Promise(resolve => server.close(resolve)));
const get = async path => {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  return fetch(`http://127.0.0.1:${server.address().port}${path}`);
};

test('missing/invalid timestamps reject before querying the database', async () => {
  for (const value of ['', '?simulationTime=invalid', '?simulationTime=1986-02-30T00:00:00Z', '?simulationTime=1986-04-26T01:00:00', '?simulationTime=1986-04-26T01:00:00%2B03:00']) {
    assert.equal((await get('/api/events' + value)).status, 400);
  }
});
test('cutoff is inclusive and verification is required in database query', async t => {
  const cutoff = '1986-04-26T01:23:40.000Z';
  const rows = [
    { timestamp: new Date(cutoff), isVerified: true, eventId: 'boundary' },
    { timestamp: new Date('1986-04-26T01:23:41Z'), isVerified: true, eventId: 'future' },
    { timestamp: new Date(cutoff), isVerified: false, eventId: 'unverified' },
  ];
  t.mock.method(Model, 'find', query => ({ sort() { return this; }, maxTimeMS() { return this; }, lean: async () => rows.filter(row => row.timestamp <= query.timestamp.$lte && row.isVerified === query.isVerified) }));
  const response = await get('/api/events?simulationTime=' + cutoff);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authoritativeClock, cutoff);
  assert.deepEqual(body.data.map(row => row.eventId), ['boundary']);
});
test('database outage is distinct from liveness', async () => {
  assert.equal((await get('/health')).status, 200);
  assert.equal((await get('/ready')).status, 503);
  const response = await get('/api/events?simulationTime=1986-04-26T01:00:00Z');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'DATABASE_UNAVAILABLE');
});
test('seed is insert-only and safe to repeat (repository fixture)', async t => {
  const records = new Map();
  t.mock.method(Model, 'createIndexes', async () => {});
  t.mock.method(Model, 'countDocuments', async () => records.size);
  t.mock.method(Model, 'updateOne', async (filter, update, options) => {
    assert.equal(options.timestamps, false);
    assert.equal(update.$set, undefined);
    const existed = records.has(filter.eventId);
    if (!existed) records.set(filter.eventId, structuredClone(update.$setOnInsert));
    return { upsertedCount: Number(!existed) };
  });
  const first = await initializeDatabase();
  records.values().next().value.title = 'Team-edited title';
  const before = structuredClone([...records]);
  const second = await initializeDatabase();
  assert.ok(first.inserted > 0);
  assert.equal(second.inserted, 0);
  assert.equal(second.total, first.total);
  assert.deepEqual([...records], before);
});
test('missing database configuration has no localhost fallback', async () => {
  const original = process.env.MONGO_URI;
  process.env.MONGO_URI = '';
  try { await assert.rejects(connectDatabase, /MONGO_URI_REQUIRED/); }
  finally { if (original === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = original; }
});
test('startup fails nonzero and never logs credential-bearing invalid URIs', () => {
  for (const uri of ['', 'not-a-mongo-uri:DO_NOT_LOG_PASSWORD']) {
    const child = spawnSync(process.execPath, [resolve(__dirname, '../src/src/models/src/routes/events.js')], {
      env: { ...process.env, MONGO_URI: uri }, encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    assert.equal(child.status, 1);
    assert.match(child.stderr, /MONGO_URI/);
    assert.doesNotMatch(child.stderr, /DO_NOT_LOG_PASSWORD/);
  }
});
