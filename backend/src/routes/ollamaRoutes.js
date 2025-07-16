const express = require('express');
const router = express.Router();
const { generateText } = require('../services/ollama_service');

router.post('/generate', async (req, res) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required.' });
    }

    const generatedContent = await generateText(prompt, model);
    res.json({ generatedContent });
  } catch (error) {
    console.error('Error in /ollama/generate route:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;