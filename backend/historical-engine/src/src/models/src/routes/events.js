const express = require('express');
const mongoose = require('mongoose');
const { initializeDatabase, getEventsUpToSimulationTime } = require('../services/eventService');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chernobyl_simulation';

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
    console.error('Error fetching simulation events:', error);
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while evaluating simulation event triggers.'
    });
  }
});

// If run directly
if (require.main === module) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      await initializeDatabase();
      app.listen(PORT, () => {
        console.log(`[API Server] Chernobyl simulation event service running on port ${PORT}`);
      });
    })
    .catch(err => console.error('MongoDB connection error:', err));
}

module.exports = app;
