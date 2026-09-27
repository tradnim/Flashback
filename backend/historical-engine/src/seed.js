const mongoose = require('mongoose');
const { connectDatabase, databaseDiagnostic } = require('./database');
const { initializeDatabase } = require('./src/models/src/services/eventService');

(async () => {
  try {
    await connectDatabase();
    console.log('Seed complete:', await initializeDatabase());
  } catch (error) {
    console.error(databaseDiagnostic(error));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
