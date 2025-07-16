const express = require('express');
const router = express.Router();
const { Resume, Score } = require('../models');
const multer = require('multer'); // <-- Importez Multer
const pdfParse = require('pdf-parse'); // <-- Importez pdf-parse


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


router.post('/', upload.single('resumePdf'), async (req, res) => { 
  try {
    const userId = req.auth.userId;

    if (!req.file || req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'A PDF file (field name "resumePdf") is required.' });
    }

    const fileName = req.file.originalname;
    const pdfBuffer = req.file.buffer;

    let parsedPdfContent = '';
    try {
      const data = await pdfParse(pdfBuffer);
      parsedPdfContent = data.text; // Le texte extrait du PDF
    } catch (pdfError) {
      console.error('Error parsing PDF:', pdfError);
      return res.status(500).json({ message: 'Failed to parse PDF content.' });
    }

    const existingResume = await Resume.findOne({ userId });
    if (existingResume) {
      return res.status(409).json({ message: `A resume already exists for user ID: ${userId}` });
    }

    const newResume = new Resume({
      userId: userId,
      fileName: fileName,
      content: parsedPdfContent,
    });
    const savedResume = await newResume.save();
    res.status(201).json(savedResume);

  } catch (err) {
    console.error('Error creating resume:', err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.auth.userId });
    res.json(resumes);
  } catch (err) {
    console.error('Error fetching resumes:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.auth.userId });
    if (!resume) return res.status(404).json({ message: 'Resume not found or you do not have permission to view it' });
    res.json(resume);
  } catch (err) {
    console.error('Error fetching single resume:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.userId;

    const updatedResume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.auth.userId },
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedResume) return res.status(404).json({ message: 'Resume not found or you do not have permission to update it' });
    res.json(updatedResume);
  } catch (err) {
    console.error('Error updating resume:', err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedResume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.auth.userId });
    if (!deletedResume) return res.status(404).json({ message: 'Resume not found or you do not have permission to delete it' });

    await Score.deleteMany({ resumeId: req.params.id });

    res.json({ message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('Error deleting resume:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;