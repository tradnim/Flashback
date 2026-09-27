const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  referenceId: { type: String, required: true },
  url: { type: String, required: false }
}, { _id: false });

const chernobylEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, required: true, index: true }, 
  category: { type: String, required: true },
  importance: { type: String, required: false },
  isVerified: { type: Boolean, default: true },
  citations: [citationSchema]
}, {
  timestamps: true
});

chernobylEventSchema.index({ timestamp: 1, isVerified: 1 });

module.exports = mongoose.model('ChernobylEvent', chernobylEventSchema);