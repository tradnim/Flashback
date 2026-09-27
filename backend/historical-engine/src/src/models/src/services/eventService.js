const ChernobylEvent = require('../models/chernobylEvent');
const initialEvents = require('../data/initialEvents');

/**
 * Ensures initial seed data exists in the database.
 */
async function initializeDatabase() {
  await ChernobylEvent.createIndexes();
  let inserted = 0;
  for (const eventData of initialEvents) {
    const result = await ChernobylEvent.updateOne(
      { eventId: eventData.eventId },
      { $setOnInsert: eventData },
      { upsert: true, timestamps: false }
    );
    inserted += result.upsertedCount;
  }
  return { inserted, total: await ChernobylEvent.countDocuments() };
}

/**
 * Retrieves all events unlocked at or before the requested simulation timestamp.
 * Strictly filters out future events to maintain simulation integrity for UI and AI.
 * 
 * @param {Date|string} simulationTimestamp - The authoritative simulation clock time.
 * @returns {Promise<Array>} List of unlocked events with citations.
 */
async function getEventsUpToSimulationTime(simulationTimestamp) {
  if (simulationTimestamp === undefined || simulationTimestamp === null || simulationTimestamp === '') {
    throw new TypeError('simulationTimestamp is required');
  }

  const targetTime = new Date(simulationTimestamp);
  if (Number.isNaN(targetTime.getTime())) {
    throw new TypeError('simulationTimestamp must be a valid date');
  }

  // Strict simulation time rule: timestamp <= targetTime
  const query = {
    timestamp: { $lte: targetTime },
    isVerified: true
  };

  return await ChernobylEvent.find(query)
    .sort({ timestamp: 1 })
    .maxTimeMS(5000).lean();
}

async function getNextVerifiedEvent(simulationTimestamp) {
  const targetTime = new Date(simulationTimestamp);
  if (Number.isNaN(targetTime.getTime())) throw new TypeError('simulationTime must be a valid date');
  return ChernobylEvent.findOne({
    timestamp: { $gt: targetTime },
    isVerified: true
  }).sort({ timestamp: 1 }).maxTimeMS(5000).lean();
}

module.exports = {
  initializeDatabase,
  getEventsUpToSimulationTime,
  getNextVerifiedEvent
};
