const express = require('express');
const mongoose = require('mongoose');
const { initializeDatabase, getEventsUpToSimulationTime } = require('../services/eventService');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chernobyl_simulation';

/**
 * GET /api/events
 * Query Parameters:
 *   - simulationTime: ISO-8601 timestamp representing the current authoritative simulation clock.
 */
app.get('/api/events', async (req, res) => {
  try {
    const { simulationTime } = req.query;

    // Fallback to current real-world time if simulation clock is omitted during testing,
    // though integration clients (UI/AI) must supply the authoritative simulation timestamp.
    const authoritativeClock = simulationTime ? new Date(simulationTime) : new Date();

    if (isNaN(authoritativeClock.getTime())) {
      return res.status(400).json({
        error: 'INVALID_SIMULATION_TIME',
        message: 'The provided simulationTime query parameter is not a valid ISO-8601 date string.'
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

// Connect to MongoDB and start server
mongoose.connect(MONGO_URI)
  .asyncConnect = async () => {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`[API Server] Chernobyl simulation event service running on port ${PORT}`);
    });
  };

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