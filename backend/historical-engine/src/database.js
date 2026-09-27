const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);
// Creating collections/indexes is an explicit seed responsibility, not startup work.
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

async function connectDatabase() {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error('MONGO_URI_REQUIRED');
  }
  await mongoose.connect(uri, {
    dbName: 'chernobyl_simulation',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
    maxPoolSize: 10,
  });
  await pingDatabase();
}

async function pingDatabase() {
  if (mongoose.connection.readyState !== 1) throw new Error('DATABASE_UNAVAILABLE');
  await mongoose.connection.db.command({ ping: 1 }, { timeoutMS: 5000 });
}

function databaseDiagnostic(error) {
  if (error.code === 18) return 'Database authentication failed. Check the Atlas database user and password in the private MONGO_URI.';
  if (error.code === 13) return 'Database permissions are insufficient. The engine needs readWrite on chernobyl_simulation.';
  if (error.code === 11000) return 'Duplicate event IDs prevent index creation or seeding. Review shared records without overwriting them.';
  return error.message === 'MONGO_URI_REQUIRED'
    ? 'Set MONGO_URI privately in backend/historical-engine/.env. No local database fallback is used.'
    : 'Database unavailable. Check Atlas availability, network/IP access, database credentials and connection string. Credentials are not logged.';
}

module.exports = { connectDatabase, pingDatabase, databaseDiagnostic };
