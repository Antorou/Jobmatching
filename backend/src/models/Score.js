const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
  jobOfferId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOffer', required: true },
  score: { type: Number, required: true },
  reason: { type: String }
});

ScoreSchema.index({ resumeId: 1, jobOfferId: 1 }, { unique: true });

module.exports = mongoose.model('Score', ScoreSchema);