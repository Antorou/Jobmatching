const mongoose = require('mongoose');

const JobOfferSchema = new mongoose.Schema({
  fileName: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  source: { type: String, enum: ['upload', 'api'], default: 'upload' },
  originalId: { type: String, unique: true, sparse: true, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

JobOfferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});
JobOfferSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('JobOffer', JobOfferSchema);