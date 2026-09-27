import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolveAudioUrl } from '../src/audio-url.js';

// Lightweight DOM harness exercises the app's real event handlers and requests.
class Element {
  textContent = ''; innerHTML = ''; hidden = false; checked = false; value = ''; disabled = false;
  children = []; handlers = {}; firstChild = { textContent: '' };
  classList = { add() {}, remove() {}, toggle() {} };
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  get childElementCount() { return this.children.length; }
  addEventListener(name, action) { this.handlers[name] = action; }
  setAttribute() {} removeAttribute() {} hasAttribute() { return false; } pause() {}
}
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
const settle = () => new Promise(resolve => setImmediate(resolve));
const row = { eventId: 'live', timestamp: '1986-04-25T14:00:00Z', title: 'Live record', isVerified: true };
function app() {
  const elements = new Map();
  const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const calls = [];
  let response = { data: [row] }, error;
  const fetch = async (path, options) => { calls.push({ path, options }); if (error) throw error; return { ok: true, json: async () => response }; };
  vm.runInNewContext(source, { document: { querySelector: el, querySelectorAll: () => [], createElement: () => new Element() }, window: { location: { origin: 'http://127.0.0.1:5173' } }, Date, URL, URLSearchParams, AbortSignal, fetch, resolveAudioUrl, setInterval() {} });
  return { el, calls, fail: () => { error = Error('Connection lost'); } };
}

test('live timeline, explicit demo and independent service errors', async () => {
  const ui = app();
  await settle();
  assert.match(ui.calls[0].path, /simulationTime=/);
  assert.equal(ui.el('#event-count').textContent, '1 event');
  assert.equal(ui.el('#timeline-events').children[0].children[1].textContent, 'Live record');
  ui.fail();
  ui.el('#question-input').value = 'What is known?';
  await ui.el('#question-form').handlers.submit({ preventDefault() {} });
  assert.match(ui.el('#answer-status').textContent, /Question unavailable/);
  await ui.el('#broadcast-button').handlers.click();
  assert.match(ui.el('#broadcast-status').textContent, /Audio unavailable/);
  assert.equal(ui.el('#event-count').textContent, '1 event');
  assert.equal(JSON.parse(ui.calls[1].options.body).question, 'What is known?');
  assert.ok(JSON.parse(ui.calls[1].options.body).simulationTime);
  const callCount = ui.calls.length;
  ui.el('#demo-mode').checked = true;
  ui.el('#demo-mode').handlers.change();
  await ui.el('#question-form').handlers.submit({ preventDefault() {} });
  await ui.el('#broadcast-button').handlers.click();
  assert.equal(ui.calls.length, callCount);
  assert.equal(ui.el('#event-count').textContent, '2 events');
  assert.match(ui.el('#answer-status').textContent, /not AI-generated/);
  ui.el('#demo-mode').checked = false;
  ui.el('#demo-mode').handlers.change();
  await settle();
  assert.equal(ui.el('#event-count').textContent, '1 event');
  assert.match(ui.el('#timeline-status').textContent, /last successful timeline/);
  assert.equal(ui.el('#connection-status').textContent, 'TIMELINE DISCONNECTED');
});
