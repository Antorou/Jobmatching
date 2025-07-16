const express = require('express');
const router = express.Router();
const { Score, Resume, JobOffer } = require('../models');

router.post('/', async (req, res) => {
  try {
    const { resumeId, jobOfferId, score, reason } = req.body;

    const existingResume = await Resume.findById(resumeId);
    if (!existingResume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    const existingJobOffer = await JobOffer.findById(jobOfferId);
    if (!existingJobOffer) {
      return res.status(404).json({ message: 'Job Offer not found' });
    }

    const newScore = new Score({ resumeId, jobOfferId, score, reason });
    const savedScore = await newScore.save();
    res.status(201).json(savedScore);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A score for this resume and job offer already exists.' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const scores = await Score.find()
      .populate('resumeId')
      .populate('jobOfferId');
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const score = await Score.findById(req.params.id)
      .populate('resumeId')
      .populate('jobOfferId');
    if (!score) return res.status(404).json({ message: 'Score not found' });
    res.json(score);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedScore = await Score.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedScore) return res.status(404).json({ message: 'Score not found' });
    res.json(updatedScore);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A score for this resume and job offer combination already exists.' });
    }
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedScore = await Score.findByIdAndDelete(req.params.id);
    if (!deletedScore) return res.status(404).json({ message: 'Score not found' });
    res.json({ message: 'Score deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;