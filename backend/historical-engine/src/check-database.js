const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const { connectDatabase, databaseDiagnostic } = require('./database');
const Model = require('./src/models/src/models/chernobylEvent');
const { initializeDatabase, getEventsUpToSimulationTime } = require('./src/models/src/services/eventService');

(async () => {
  try {
    await connectDatabase();
    console.log('Database ping: OK');
    if (process.argv.includes('--verify-seed')) {
      console.log('First seed:', await initializeDatabase());
      const snapshot = async () => createHash('sha256').update(JSON.stringify(await Model.find().sort({ eventId: 1 }).lean())).digest('hex');
      const before = await snapshot();
      const second = await initializeDatabase();
      if (second.inserted !== 0 || before !== await snapshot()) throw new Error('SEED_CHANGED_EXISTING_RECORDS');
      console.log('Second seed: unchanged records and stable count', second.total);
    }
    const rows = await getEventsUpToSimulationTime('1986-04-25T23:45:00Z');
    console.log('Verified events at starting simulationTime:', rows.length);
    console.log('Total records:', await Model.countDocuments());
  } catch (error) {
    console.error(error.message === 'SEED_CHANGED_EXISTING_RECORDS' ? 'Seed verification failed: existing records changed.' : databaseDiagnostic(error));
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
})();
