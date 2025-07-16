const express = require('express');
const cors = require('cors');
const app = express();

const authenticateClerk = require('./middleware/authenticateClerk');


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const resumeRoutes = require('./routes/resumeRoutes');
const jobOfferRoutes = require('./routes/jobOfferRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const ollamaRoutes = require('./routes/ollamaRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');

app.use('/api/resumes', authenticateClerk, resumeRoutes);

app.use('/api/joboffers', jobOfferRoutes);
app.use('/api/scores', scoreRoutes);

app.use('/api/ollama', ollamaRoutes); 
app.use('/api/evaluation', evaluationRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Resume Matching API!');
});

module.exports = app;