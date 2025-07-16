const express = require('express');
const router = express.Router();
const { Resume, JobOffer, Score } = require('../models');
const { evaluateResumeJobOffer } = require('../services/ollama_service');
const authenticateClerk = require('../middleware/authenticateClerk');


router.post('/evaluate', authenticateClerk, async (req, res) => {
  try {
    const { resumeId, jobOfferId, model } = req.body;

    if (!resumeId || !jobOfferId) {
      return res.status(400).json({ message: 'Both resumeId and jobOfferId are required.' });
    }

    // Récup les contenus textuels du CV et de l'offre d'emploi depuis la base de données
    const resume = await Resume.findById(resumeId);
    const jobOffer = await JobOffer.findById(jobOfferId);

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found.' });
    }
    if (!jobOffer) {
      return res.status(404).json({ message: 'Job offer not found.' });
    }

    const resumeContent = resume.content;
    const jobOfferContent = jobOffer.content;

    let scoreEntry = await Score.findOne({ resumeId, jobOfferId });

    const evaluationResult = await evaluateResumeJobOffer(resumeContent, jobOfferContent, model);
    const { score, reason } = evaluationResult;

    if (scoreEntry) {
      scoreEntry.score = score;
      scoreEntry.reason = reason;
    } else {
      scoreEntry = new Score({
        resumeId: resumeId,
        jobOfferId: jobOfferId,
        score: score,
        reason: reason,
      });
    }
    const savedScore = await scoreEntry.save();

    res.status(200).json({
      message: 'Evaluation successful and score saved.',
      score: savedScore.score,
      reason: savedScore.reason,
      scoreId: savedScore._id,
    });

  } catch (error) {
    console.error('Error in /api/evaluation/evaluate route:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred during evaluation.' });
  }
});

module.exports = router;