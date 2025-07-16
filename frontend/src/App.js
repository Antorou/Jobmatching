import React, { useState, useEffect, useCallback } from 'react';
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  useAuth,
  RedirectToSignIn,
} from '@clerk/clerk-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  // --- États pour les CVs et Offres ---
  const [resumeFile, setResumeFile] = useState(null);
  const [jobOfferFile, setJobOfferFile] = useState(null);
  const [uploadedResumeId, setUploadedResumeId] = useState(null);
  const [uploadedJobOfferId, setUploadedJobOfferId] = useState(null);

  // --- États pour l'évaluation ---
  const [evaluationResult, setEvaluationResult] = useState(null); // { score: number, reason: string }
  const [message, setMessage] = useState(''); // Messages généraux à l'utilisateur

  // --- Gestion des fichiers sélectionnés ---
  const handleResumeFileChange = (event) => {
    setResumeFile(event.target.files[0]);
    setUploadedResumeId(null); // Réinitialise l'ID si un nouveau fichier est sélectionné
    setMessage('');
  };

  const handleJobOfferFileChange = (event) => {
    setJobOfferFile(event.target.files[0]);
    setUploadedJobOfferId(null); // Réinitialise l'ID si un nouveau fichier est sélectionné
    setMessage('');
  };

  // --- Fonction d'Upload de CV ---
  const uploadResume = async () => {
    if (!isSignedIn) {
      setMessage('Please sign in to upload a resume.');
      return;
    }
    if (!resumeFile) {
      setMessage('Please select a resume PDF file to upload.');
      return;
    }

    setMessage('Uploading resume...');
    const formData = new FormData();
    formData.append('resumePdf', resumeFile); // 'resumePdf' doit correspondre au nom du champ dans Multer du backend

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/resumes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // NE PAS définir 'Content-Type' pour FormData, le navigateur le fera automatiquement
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadedResumeId(data._id);
        setMessage(`Resume "${data.fileName}" uploaded successfully! ID: ${data._id}`);
      } else {
        setMessage(`Error uploading resume: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      setMessage(`An unexpected error occurred during resume upload: ${error.message}`);
    }
  };

  // --- Fonction d'Upload d'Offre d'Emploi ---
  const uploadJobOffer = async () => {
    if (!jobOfferFile) { // Pas besoin d'être authentifié pour uploader une offre, selon notre backend actuel
      setMessage('Please select a job offer PDF file to upload.');
      return;
    }

    setMessage('Uploading job offer...');
    const formData = new FormData();
    formData.append('jobOfferPdf', jobOfferFile); // 'jobOfferPdf' doit correspondre au nom du champ dans Multer

    try {
      // Les offres d'emploi ne sont pas protégées par Clerk dans notre backend actuel, donc pas de token requis
      const response = await fetch(`${BACKEND_URL}/api/joboffers`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadedJobOfferId(data._id);
        setMessage(`Job Offer "${data.fileName}" uploaded successfully! ID: ${data._id}`);
      } else {
        setMessage(`Error uploading job offer: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error uploading job offer:', error);
      setMessage(`An unexpected error occurred during job offer upload: ${error.message}`);
    }
  };

  // --- Fonction d'Évaluation ---
  const evaluateMatch = async () => {
    if (!isSignedIn) {
      setMessage('Please sign in to evaluate matches.');
      return;
    }
    if (!uploadedResumeId || !uploadedJobOfferId) {
      setMessage('Please upload both a resume and a job offer first.');
      return;
    }

    setMessage('Evaluating match...');
    setEvaluationResult(null); // Réinitialise le résultat précédent

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/evaluation/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId: uploadedResumeId,
          jobOfferId: uploadedJobOfferId,
          model: 'qwen3:0.6b',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEvaluationResult({ score: data.score, reason: data.reason });
        setMessage('Evaluation complete!');
      } else {
        setMessage(`Error during evaluation: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error during evaluation:', error);
      setMessage(`An unexpected error occurred during evaluation: ${error.message}`);
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>CV MATCH</h1>
        <div className="user-info">
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
          <SignedIn>
            <UserButton />
            <p>Bonjour, {user?.firstName || user?.username || 'User'}!</p>
          </SignedIn>
        </div>
      </header>

      <main>
        <SignedOut>
          <p>Please sign in to use the full features.</p>
        </SignedOut>
        <SignedIn>
          <section className="upload-and-evaluate">
            <h2>Upload & Evaluate</h2>
            {message && <p className="message">{message}</p>}

            {/* Div pour l'upload de CV */}
            <div className="upload-section">
              <h3>1. Upload Your Resume (PDF)</h3>
              <input type="file" accept=".pdf" onChange={handleResumeFileChange} />
              <button onClick={uploadResume} disabled={!resumeFile}>
                Upload Resume
              </button>
              {uploadedResumeId && <p className="success">Resume ID: {uploadedResumeId}</p>}
            </div>

            {/* Div pour l'upload d'Offre d'Emploi */}
            <div className="upload-section">
              <h3>2. Upload Job Offer (PDF)</h3>
              <input type="file" accept=".pdf" onChange={handleJobOfferFileChange} />
              <button onClick={uploadJobOffer} disabled={!jobOfferFile}>
                Upload Job Offer
              </button>
              {uploadedJobOfferId && <p className="success">Job Offer ID: {uploadedJobOfferId}</p>}
            </div>

            {/* Div pour l'évaluation et le score */}
            <div className="evaluation-section">
              <h3>3. Evaluate Match</h3>
              <button
                onClick={evaluateMatch}
                disabled={!uploadedResumeId || !uploadedJobOfferId}
              >
                Evaluate Match
              </button>

              {evaluationResult && (
                <div className="score-result">
                  <h4>Match Score: {evaluationResult.score}/100</h4>
                  <p>Reason: {evaluationResult.reason}</p>
                </div>
              )}
            </div>
          </section>
        </SignedIn>
      </main>
    </div>
  );
}

export default App;