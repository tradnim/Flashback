const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  referenceId: { type: String, required: true }, // e.g., IAEA INSAG-7, Official Log, Soviet Report
  url: { type: String, required: false }
}, { _id: false });

const chernobylEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, required: true, index: true }, // Authoritative simulation timestamp
  category: { 
    type: String, 
    enum: ['OPERATIONAL', 'SAFETY', 'ACCIDENT', 'EMERGENCY_RESPONSE', 'RADIOLOGICAL'], 
    required: true 
  },
  isVerified: { type: Boolean, default: true },
  citations: [citationSchema]
}, {
  timestamps: true
});

// Compound index for efficient simulation-time range queries
chernobylEventSchema.index({ timestamp: 1, isVerified: 1 });

module.exports = mongoose.model('ChernobylEvent', chernobylEventSchema);