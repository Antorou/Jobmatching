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


  const [resumeFile, setResumeFile] = useState(null);
  const [uploadedResumeId, setUploadedResumeId] = useState(null);
  const [userResumes, setUserResumes] = useState([]); // NOUVEAU: Pour stocker les CVs de l'utilisateur

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [apiJobOffers, setApiJobOffers] = useState([]); // Pour stocker les offres d'emploi récupérées de l'API externe
  const [selectedApiJobOfferId, setSelectedApiJobOfferId] = useState(null); // ID MongoDB de l'offre sélectionnée
  const [selectedApiJobOfferDetails, setSelectedApiJobOfferDetails] = useState(null); // Détails de l'offre sélectionnée pour affichage

  const [evaluationResult, setEvaluationResult] = useState(null); // { score: number, reason: string }
  const [message, setMessage] = useState(''); // Messages généraux à l'utilisateur
  const [isLoading, setIsLoading] = useState(false); // Pour gérer l'état de chargement

  const handleResumeFileChange = (event) => {
    setResumeFile(event.target.files[0]);
    setUploadedResumeId(null);
    setMessage('');
  };

  const handleSearchQueryChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchLocationChange = (event) => {
    setSearchLocation(event.target.value);
  };

  const fetchUserResumes = useCallback(async () => {
    if (!isSignedIn) {
      setUserResumes([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/resumes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUserResumes(data);
      } else {
        console.error('Erreur lors de la récupération des CVs:', data.message || response.statusText);
        setMessage(`Erreur lors de la récupération des CVs: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur inattendue lors de la récupération des CVs:', error);
      setMessage(`Une erreur inattendue est survenue lors de la récupération des CVs: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    fetchUserResumes();
  }, [fetchUserResumes]);


  const uploadResume = async () => {
    if (!isSignedIn) {
      setMessage('Veuillez vous connecter pour télécharger un CV.');
      return;
    }
    if (!resumeFile) {
      setMessage('Veuillez sélectionner un fichier PDF de CV à télécharger.');
      return;
    }

    setMessage('Téléchargement du CV en cours...');
    setIsLoading(true);
    const formData = new FormData();
    formData.append('resumePdf', resumeFile);

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/resumes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUploadedResumeId(data._id);
        setMessage(`CV "${data.fileName}" téléchargé avec succès ! ID: ${data._id}`);
        fetchUserResumes();
      } else {
        setMessage(`Erreur lors du téléchargement du CV: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement du CV:', error);
      setMessage(`Une erreur inattendue est survenue lors du téléchargement du CV: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndSaveJobOffers = async () => {
    if (!searchQuery) {
      setMessage('Veuillez entrer un terme de recherche pour les offres d\'emploi.');
      return;
    }

    setMessage('Recherche et sauvegarde des offres d\'emploi en cours...');
    setIsLoading(true);
    setApiJobOffers([]); // Réinitialise les résultats précédents
    setSelectedApiJobOfferId(null);
    setSelectedApiJobOfferDetails(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/joboffers/external`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          location: searchLocation,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setApiJobOffers(data);
        setMessage(`Trouvé et sauvegardé ${data.length} offres d'emploi.`);
      } else {
        setMessage(`Erreur lors de la recherche/sauvegarde des offres: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche/sauvegarde des offres d\'emploi:', error);
      setMessage(`Une erreur inattendue est survenue lors de la recherche d'offres: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectJobOffer = (jobOffer) => {
    setSelectedApiJobOfferId(jobOffer._id);
    setSelectedApiJobOfferDetails({
      title: jobOffer.fileName.split(' - ')[0],
      company: jobOffer.fileName.split(' - ')[1],
    });
    setMessage(`Offre d'emploi "${jobOffer.fileName.split(' - ')[0]}" sélectionnée.`);
  };

  const deleteResume = async (resumeId, fileName) => {
    if (!isSignedIn) {
      setMessage('Veuillez vous connecter pour supprimer un CV.');
      return;
    }
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le CV "${fileName}" ?`)) {
      return;
    }

    setMessage(`Suppression du CV "${fileName}" en cours...`);
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/api/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessage(`CV "${fileName}" supprimé avec succès.`);
        if (uploadedResumeId === resumeId) {
          setUploadedResumeId(null);
        }
        fetchUserResumes();
      } else {
        const data = await response.json();
        setMessage(`Erreur lors de la suppression du CV: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du CV:', error);
      setMessage(`Une erreur inattendue est survenue lors de la suppression du CV: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const evaluateMatch = async () => {
    if (!isSignedIn) {
      setMessage('Veuillez vous connecter pour évaluer les correspondances.');
      return;
    }
    if (!uploadedResumeId || !selectedApiJobOfferId) {
      setMessage('Veuillez télécharger un CV et sélectionner une offre d\'emploi.');
      return;
    }

    setMessage('Évaluation de la correspondance en cours...');
    setIsLoading(true);
    setEvaluationResult(null);

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
          jobOfferId: selectedApiJobOfferId,
          model: 'qwen3:0.6b',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEvaluationResult({ score: data.score, reason: data.reason });
        setMessage('Évaluation terminée !');
      } else {
        setMessage(`Erreur lors de l'évaluation: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'évaluation:', error);
      setMessage(`Une erreur inattendue est survenue lors de l'évaluation: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="text-4xl font-bold text-white mb-4">CV MATCH</h1>
        <div className="user-info">
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
          <SignedIn>
            <UserButton />
            <p className="text-white text-lg mt-2">Bonjour, {user?.firstName || user?.username || 'Utilisateur'}!</p>
          </SignedIn>
        </div>
      </header>

      <main className="p-8 max-w-4xl mx-auto bg-gray-100 rounded-lg shadow-lg mt-8">
        <SignedOut>
          <p className="text-center text-gray-700 text-lg">Veuillez vous connecter pour utiliser toutes les fonctionnalités.</p>
        </SignedOut>
        <SignedIn>
          <section className="space-y-8">
            <h2 className="text-3xl font-semibold text-gray-800 text-center mb-6">Télécharger & Évaluer</h2>
            {isLoading && <p className="text-blue-600 text-center text-lg">Chargement en cours...</p>}
            {message && <p className={`message text-center text-lg ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}

            {/* Section pour l'upload de CV */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-medium text-gray-700 mb-4">1. Téléchargez votre CV (PDF)</h3>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <button
                  onClick={uploadResume}
                  disabled={!resumeFile || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-md
                    hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Télécharger CV
                </button>
              </div>
              {uploadedResumeId && <p className="text-green-600 mt-2">CV Téléchargé. ID: {uploadedResumeId}</p>}

              {/* NOUVEAU: Liste des CVs de l'utilisateur avec option de suppression */}
              {userResumes.length > 0 && (
                <div className="mt-6 border border-gray-200 rounded-md p-4 bg-gray-50">
                  <h4 className="text-xl font-medium text-gray-700 mb-3">Vos CVs téléchargés:</h4>
                  <ul className="space-y-3">
                    {userResumes.map((resume) => (
                      <li key={resume._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                        <span className="font-semibold text-gray-800">{resume.fileName}</span>
                        <div className="flex space-x-2 mt-2 sm:mt-0">
                          <button
                            onClick={() => setUploadedResumeId(resume._id)} // Permet de sélectionner un CV existant pour l'évaluation
                            disabled={uploadedResumeId === resume._id || isLoading}
                            className="px-4 py-1 bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-sm
                              hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75
                              disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadedResumeId === resume._id ? 'Sélectionné pour Éval.' : 'Sélectionner pour Éval.'}
                          </button>
                          <button
                            onClick={() => deleteResume(resume._id, resume.fileName)}
                            disabled={isLoading}
                            className="px-4 py-1 bg-red-500 text-white text-sm font-semibold rounded-full shadow-sm
                              hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75
                              disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Supprimer
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Section pour la recherche et sélection d'Offres d'Emploi */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-medium text-gray-700 mb-4">2. Recherchez et sélectionnez une offre d'emploi</h3>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
                <input
                  type="text"
                  placeholder="Ex: Développeur React"
                  value={searchQuery}
                  onChange={handleSearchQueryChange}
                  className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Ex: Paris, France"
                  value={searchLocation}
                  onChange={handleSearchLocationChange}
                  className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={fetchAndSaveJobOffers}
                  disabled={!searchQuery || isLoading}
                  className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-full shadow-md
                    hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rechercher Offres
                </button>
              </div>

              {selectedApiJobOfferDetails && (
                <p className="text-green-600 mt-2">
                  Offre sélectionnée: **{selectedApiJobOfferDetails.title}** de **{selectedApiJobOfferDetails.company}** (ID: {selectedApiJobOfferId})
                </p>
              )}

              {apiJobOffers.length > 0 && (
                <div className="mt-6 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                  <h4 className="text-xl font-medium text-gray-700 mb-3">Résultats de la recherche:</h4>
                  <ul className="space-y-3">
                    {apiJobOffers.map((job) => (
                      <li key={job._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                        <div>
                          <p className="font-semibold text-gray-800">{job.fileName.split(' - ')[0]}</p>
                          <p className="text-sm text-gray-600">{job.fileName.split(' - ')[1]} - {job.content.split('\n')[2]?.replace('Location: ', '')}</p>
                        </div>
                        <button
                          onClick={() => handleSelectJobOffer(job)}
                          disabled={selectedApiJobOfferId === job._id || isLoading}
                          className="mt-2 sm:mt-0 px-4 py-1 bg-teal-500 text-white text-sm font-semibold rounded-full shadow-sm
                            hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {selectedApiJobOfferId === job._id ? 'Sélectionnée' : 'Sélectionner'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-2xl font-medium text-gray-700 mb-4">3. Évaluez la correspondance</h3>
              <button
                onClick={evaluateMatch}
                disabled={!uploadedResumeId || !selectedApiJobOfferId || isLoading}
                className="px-8 py-3 bg-green-600 text-white font-bold rounded-full shadow-lg
                  hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Évaluer la Correspondance
              </button>

              {evaluationResult && (
                <div className="score-result mt-6 p-4 border border-green-300 bg-green-50 rounded-lg">
                  <h4 className="text-xl font-semibold text-green-800 mb-2">Score de Correspondance: {evaluationResult.score}/100</h4>
                  <p className="text-gray-700">Raison: {evaluationResult.reason}</p>
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