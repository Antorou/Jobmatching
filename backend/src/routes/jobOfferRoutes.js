const express = require('express');
const router = express.Router();
const { JobOffer, Score } = require('../models');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/external', async (req, res) => {
  const { query, location, page_id = 1, fromage = 1, sort = 'date', job_type = 'fulltime' } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'A search query is required in the request body.' });
  }

  const url = `https://indeed12.p.rapidapi.com/jobs/search?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location || 'france')}&page_id=${page_id}&locality=fr&fromage=${fromage}&sort=${sort}&job_type=${job_type}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'x-rapidapi-host': 'indeed12.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI error status:', response.status);
      console.error('RapidAPI error response body:', errorText);
      return res.status(response.status).json({ message: `Failed to fetch job offers from external API: ${response.statusText}` });
    }
    const result = await response.json();
    const externalJobOffers = result.hits;

    const savedJobOffersInDB = [];

    for (const job of externalJobOffers) {
      try {
        const { title, company_name, location, link, id } = job;

        const fileName = `${title} - ${company_name} - ${id}`;

        let existingJobOffer = await JobOffer.findOne({ originalId: id, source: 'api' });

        if (existingJobOffer) {
          savedJobOffersInDB.push(existingJobOffer);
        } else {
          const content = `Title: ${title}\nCompany: ${company_name}\nLocation: ${location || 'N/A'}\nLink: ${link || 'N/A'}`;

          const newJobOffer = new JobOffer({
            fileName: fileName,
            content: content,
            source: 'api',
            originalId: id
          });
          const savedJobOffer = await newJobOffer.save();
          savedJobOffersInDB.push(savedJobOffer);
        }
      } catch (saveError) {
        console.error(`Error saving job offer (ID: ${job.id}) from RapidAPI to DB:`, saveError.message);
      }
    }

    res.status(200).json(savedJobOffersInDB);

  } catch (error) {
    console.error('Error in /api/joboffers/external route:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred during fetching and saving job offers.' });
  }
});


router.post('/', upload.single('jobOfferPdf'), async (req, res) => {
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

    const existingJobOffer = await JobOffer.findOne({ fileName: fileName, source: 'upload' });
    if (existingJobOffer) {
      return res.status(409).json({ message: `Job offer with file name '${fileName}' already exists.` });
    }

    const newJobOffer = new JobOffer({
      fileName: fileName,
      content: parsedPdfContent,
      source: 'upload',
      originalId: null
    });
    const savedJobOffer = await newJobOffer.save();
    res.status(201).json(savedJobOffer);

  } catch (err) {
    console.error('Error creating job offer (PDF upload):', err);
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
    await Score.deleteMany({ jobOfferId: req.params.id });
    res.json({ message: 'Job Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;