const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ResumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});
ResumeSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Resume', ResumeSchema);