const express = require('express');
const mongoose = require('mongoose');
const { connectDatabase, pingDatabase, databaseDiagnostic } = require('../../../../database');
const { getEventsUpToSimulationTime, getNextVerifiedEvent } = require('../services/eventService');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'history-engine' }));
app.get('/ready', async (_req, res) => {
  try {
    await pingDatabase();
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unavailable', error: 'DATABASE_UNAVAILABLE' });
  }
});

// Available only from the local development server; the normal timeline API
// never reveals future events.
app.get('/api/events/next', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  const simulationTime = parseSimulationTime(req.query.simulationTime);
  if (!simulationTime) {
    return res.status(400).json({ error: 'INVALID_SIMULATION_TIME', message: 'A valid UTC simulationTime is required.' });
  }
  try {
    const event = await getNextVerifiedEvent(simulationTime);
    if (!event) return res.status(404).json({ error: 'NO_NEXT_EVENT', message: 'There are no more verified events.' });
    return res.json({ status: 'success', simulationTime: simulationTime.toISOString(), event });
  } catch {
    return res.status(503).json({ error: 'DATABASE_UNAVAILABLE', message: 'The event database is unavailable.' });
  }
});

const ISO_UTC_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/;

function parseSimulationTime(value) {
  if (typeof value !== 'string') return null;

  const timestamp = value.trim();
  const match = timestamp.match(ISO_UTC_TIMESTAMP);
  if (!match) return null;

  const normalizedTimestamp = timestamp.replace(
    /\.(\d+)Z$/,
    (_, fraction) => `.${fraction.padEnd(3, '0').slice(0, 3)}Z`
  );
  const parsed = new Date(normalizedTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;

  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second
  ) {
    return null;
  }

  return parsed;
}

/**
 * GET /api/events
 * Query Parameters:
 *   - simulationTime: ISO-8601 timestamp representing the current authoritative simulation clock.
 */
app.get('/api/events', async (req, res) => {
  try {
    const { simulationTime } = req.query;
    const authoritativeClock = parseSimulationTime(simulationTime);

    if (!authoritativeClock) {
      return res.status(400).json({
        error: 'INVALID_SIMULATION_TIME',
        message: 'A valid UTC simulationTime is required.'
      });
    }

    const events = await getEventsUpToSimulationTime(authoritativeClock);

    return res.status(200).json({
      status: 'success',
      authoritativeClock: authoritativeClock.toISOString(),
      count: events.length,
      data: events
    });
  } catch (error) {
    return res.status(503).json({
      error: 'DATABASE_UNAVAILABLE',
      message: 'The event database is unavailable. Check the history engine configuration and Atlas connection.'
    });
  }
});

// If run directly
if (require.main === module) {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exit(1);
  }
  connectDatabase()
    .then(() => {
      const server = app.listen(PORT, '127.0.0.1', () => {
        console.log(`[API Server] Chernobyl simulation event service running on port ${PORT}`);
      });
      server.on('error', async () => {
        console.error('History engine could not listen. Check PORT and whether it is already in use.');
        await mongoose.disconnect();
        process.exitCode = 1;
      });
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
        server.close(async () => { await mongoose.disconnect(); process.exit(0); });
        setTimeout(() => process.exit(1), 5000).unref();
      });
    })
    .catch(async error => {
      console.error(databaseDiagnostic(error));
      await mongoose.disconnect();
      process.exitCode = 1;
    });
}

module.exports = app;
