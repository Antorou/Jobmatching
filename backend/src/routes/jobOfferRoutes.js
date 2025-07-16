const express = require('express');
const router = express.Router();
const { JobOffer } = require('../models');
const multer = require('multer');
const pdfParse = require('pdf-parse');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('jobOfferPdf'), async (req, res) => { // 'jobOfferPdf' est le nom du champ de fichier
  try {
    if (!req.file || req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'A PDF file (field name "jobOfferPdf") is required.' });
    }

    const fileName = req.file.originalname;
    const pdfBuffer = req.file.buffer;

    let parsedPdfContent = '';
    try {
      const data = await pdfParse(pdfBuffer);
      parsedPdfContent = data.text;
    } catch (pdfError) {
      console.error('Error parsing PDF for job offer:', pdfError);
      return res.status(500).json({ message: 'Failed to parse PDF content for job offer.' });
    }

    const existingJobOffer = await JobOffer.findOne({ fileName: fileName });
    if (existingJobOffer) {
      return res.status(409).json({ message: `Job offer with file name '${fileName}' already exists.` });
    }

    const newJobOffer = new JobOffer({
      fileName: fileName,
      content: parsedPdfContent,
    });
    const savedJobOffer = await newJobOffer.save();
    res.status(201).json(savedJobOffer);

  } catch (err) {
    console.error('Error creating job offer:', err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const jobOffers = await JobOffer.find();
    res.json(jobOffers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const jobOffer = await JobOffer.findById(req.params.id);
    if (!jobOffer) return res.status(404).json({ message: 'Job Offer not found' });
    res.json(jobOffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedJobOffer = await JobOffer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedJobOffer) return res.status(404).json({ message: 'Job Offer not found' });
    res.json(updatedJobOffer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedJobOffer = await JobOffer.findByIdAndDelete(req.params.id);
    if (!deletedJobOffer) return res.status(404).json({ message: 'Job Offer not found' });
    await Score.deleteMany({ jobOfferId: req.params.id }); // Supprimer les scores associés
    res.json({ message: 'Job Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;