const ChernobylEvent = require('../models/chernobylEvent');
const initialEvents = require('../data/initialEvents');

/**
 * Ensures initial seed data exists in the database.
 */
async function initializeDatabase() {
  try {
    for (const eventData of initialEvents) {
      await ChernobylEvent.updateOne(
        { eventId: eventData.eventId },
        { $set: eventData },
        { upsert: true }
      );
    }
    console.log('[EventService] Initial Chernobyl event dataset verified and synced.');
  } catch (error) {
    console.error('[EventService] Failed to initialize event dataset:', error);
  }
}

/**
 * Retrieves all events unlocked at or before the requested simulation timestamp.
 * Strictly filters out future events to maintain simulation integrity for UI and AI.
 * 
 * @param {Date|string} simulationTimestamp - The authoritative simulation clock time.
 * @returns {Promise<Array>} List of unlocked events with citations.
 */
async function getEventsUpToSimulationTime(simulationTimestamp) {
  const targetTime = simulationTimestamp ? new Date(simulationTimestamp) : new Date();

  // Strict simulation time rule: timestamp <= targetTime
  const query = {
    timestamp: { $lte: targetTime }
  };

  return await ChernobylEvent.find(query)
    .sort({ timestamp: 1 })
    .lean();
}

module.exports = {
  initializeDatabase,
  getEventsUpToSimulationTime
};