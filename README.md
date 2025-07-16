# CV-Job Offer Matching Application

## Table of Contents

1.  [Project Description](#1-project-description)
2.  [Features](#2-features)
3.  [Architecture](#3-architecture)
4.  [Prerequisites](#4-prerequisites)
5.  [Project Setup](#5-project-setup)
    * [5.1. Clerk API Keys](#51-clerk-api-keys)
    * [5.2. Ollama Configuration](#52-ollama-configuration)
    * [5.3. `.env` File for Docker Compose](#53-env-file-for-docker-compose)
    * [5.4. Launching the Application](#54-launching-the-application)
6.  [Application and API Usage](#6-application-and-api-usage)
    * [6.1. Frontend Access](#61-frontend-access)
    * [6.2. Authentication Flow (Clerk)](#62-authentication-flow-clerk)
    * [6.3. Backend API](#63-backend-api)
7.  [Project Structure](#7-project-structure)

---

## 1. Project Description

This application is a complete solution for evaluating the match between a CV (resume) and a job offer. It includes a **React frontend**, a **Node.js (Express) backend**, a **MongoDB database**, **secure authentication via Clerk**, and uses **Ollama for natural language processing** (PDF parsing and LLM evaluation). The entire application is **containerized with Docker Compose**, allowing for easy deployment and execution.

## 2. Features

* **User Management:** Full authentication via Clerk (signup, login, profile management) with OAuth support (Google, GitHub, etc.).
* **CV (PDF) Upload and Parsing:** Allows users to upload their CVs in PDF format. The backend automatically extracts the textual content from the PDF for storage and analysis.
* **Job Offer (PDF) Upload and Parsing:** Allows uploading job offers in PDF format, from which the text is also extracted and stored.
* **Match Evaluation (Ollama):** Uses a local language model (Ollama) to evaluate the relevance of a CV against a job offer, generating a score (0-100) and a concise reason.
* **Score Storage:** Evaluation results are stored in MongoDB, providing a history of matches.
* **RESTful API:** Robust Node.js backend exposing endpoints for CRUD operations on CVs, job offers, and scores.
* **Intuitive User Interface:** React frontend for easy interaction with the application.
* **Docker Containerization:** All services are packaged in Docker containers for optimal portability and isolation.

## 3. Architecture

The application is composed of three main services orchestrated by Docker Compose:

* **`mongodb`:** A MongoDB database instance for storing CV data, job offers, and scores.
* **`backend`:** The Node.js (Express) application that exposes the RESTful API. It connects to MongoDB, handles authentication via Clerk, interacts with Ollama (running on the host), and performs PDF parsing.
* **`frontend`:** The React application. It provides the user interface, communicates with the backend via its API, and manages the client-side Clerk authentication flow.
* **Ollama (on Host):** The Ollama runtime and language models run directly on the host machine. The `backend` container communicates with Ollama via Docker's internal network (thanks to `host.docker.internal`).

## 4. Prerequisites

Before launching the project, ensure that the following are installed on your host machine:

* **Docker Desktop:** Includes Docker Engine and Docker Compose.
* **Node.js and npm**
* **Ollama:** The Ollama runtime must be installed and running on your host machine.
    * **Download an LLM model** (e.g., `llama3`). Open a terminal on your host machine and run: `ollama run llama3`
* **HTTP Client:** For testing the backend APIs (e.g., Postman)

## 5. Project Setup

### 5.1. Clerk API Keys

1.  **Create a Clerk account and application**.
2.  **Retrieve your API keys**:
    * Your **Publishable Key**
    * Your **Secret Key**
3.  **Retrieve the JWT Issuer URL**.

### 5.2. Ollama Configuration

1.  **Ensure that Ollama is properly installed and that a model (e.g., `llama3`) is downloaded and available** on your host machine.
2.  **Note that the Ollama service listens by default on `http://localhost:11434`** on your host machine.

### 5.3. `.env` File for Docker Compose

For security reasons, sensitive information (API keys, passwords) should never be pushed to Git. Docker Compose can read an `.env` file located at the root of your project.

1.  **At the root of your project `my-app`**, create a file named `.env`.
2.  **Open this `.env` file** and copy all your sensitive information into it.
3.  **Update your `docker-compose.yml`**.
4.  **Update your `.gitignore`**.

### 5.4. Launching the Application

1.  **Verify that Docker Desktop is running** on your host machine.
2.  **Ensure that Ollama is launched** and a model is loaded on your host machine.
3.  **Open a terminal** and navigate to the root of your `Jobmatching` project.

4.  **Perform a full cleanup and first-time launch:**
    ```bash
    docker-compose down --rmi all --volumes # Deletes everything for a clean start
    rm -rf backend/node_modules              # Cleans up local backend node_modules
    rm -rf frontend/node_modules             # Cleans up local frontend node_modules
    docker-compose up --build                # Builds images and launches services
    ```

5.  **Check the logs:** Once the services have started, verify that the `backend` indicates "Server running on port 3000" and that the `frontend` shows no major errors.

## 6. Application and API Usage

### 6.1. Frontend Access

* Once all services are launched, open your web browser.
* **Access:** `http://localhost:3000`

### 6.2. Authentication Flow (Clerk)

1.  Upon accessing the frontend, you'll likely be redirected to Clerk's login/signup page.
2.  Log in or create an account using the available options (email/password, Google, GitHub, etc.).
3.  Once authenticated, you'll be redirected to the main application, where you can start using its features.

### 6.3. Backend API

The backend listens on `http://localhost:3001`. Use an HTTP client (Postman) to interact with the endpoints. **For all protected routes, remember to include the `Authorization: Bearer YOUR_CLERK_JWT_TOKEN` header (the token can be retrieved via your browser's developer tools after logging in or via the Clerk dashboard for testing).**

* **Create a CV (Upload PDF):**
    * `POST /api/resumes`
    * **Body:** `form-data`, key `resumePdf` (type `File`), value: your CV PDF file.
    * **Headers:** `Authorization: Bearer <Clerk JWT>`

* **Retrieve authenticated user's CVs:**
    * `GET /api/resumes`
    * **Headers:** `Authorization: Bearer <Clerk JWT>`

* **Create a Job Offer (Upload PDF):**
    * `POST /api/joboffers`
    * **Body:** `form-data`, key `jobOfferPdf` (type `File`), value: your job offer PDF file.

* **Trigger CV-Job Offer Evaluation:**
    * `POST /api/evaluation/evaluate`
    * **Headers:** `Content-Type: application/json`, `Authorization: Bearer <Clerk JWT>`
    * **Body (JSON):**
        ```json
        {
            "resumeId": "ID_OF_CV_IN_MONGODB",
            "jobOfferId": "ID_OF_JOB_OFFER_IN_MONGODB",
            "model": "qwen3:0.6b"
        }
        ```
    * **Response:** A JSON object containing `score`, `reason`, and `scoreId`.

* **Generate Text with Ollama (via backend API):**
    * `POST /api/ollama/generate`
    * **Headers:** `Content-Type: application/json`, `Authorization: Bearer <Clerk JWT>` (if the route is protected)
    * **Body (JSON):**
        ```json
        {
            "prompt": "Explain artificial intelligence in one sentence.",
            "model": "qwen3:0.6b"
        }
        ```

* **Other CRUD operations:**
    * `GET /api/resumes/:id`
    * `PUT /api/resumes/:id`
    * `DELETE /api/resumes/:id`
    * `GET /api/joboffers`
    * `GET /api/joboffers/:id`
    * `PUT /api/joboffers/:id`
    * `DELETE /api/joboffers/:id`
    * `GET /api/scores`
    * `GET /api/scores/:id`
    * `PUT /api/scores/:id`
    * `DELETE /api/scores/:id`

## 7. Project Structure

```
Jobmatching/
├── backend/
│   ├── src/
│   │   ├── models/           # Schémas Mongoose for Resume, JobOffer, Score
│   │   │   ├── Resume.js
│   │   │   ├── JobOffer.js
│   │   │   ├── Score.js
│   │   │   └── index.js
│   │   ├── routes/           # Routes API RESTful
│   │   │   ├── resumeRoutes.js
│   │   │   ├── jobOfferRoutes.js
│   │   │   ├── scoreRoutes.js
│   │   │   ├── ollamaRoutes.js
│   │   │   └── evaluationRoutes.js
│   │   ├── services/         # interactions avec Ollama
│   │   │   └── ollama_service.js
│   │   ├── db/               # Connexion MongoDB and migrations scripts 
│   │   │   ├── connection.js
│   │   │   └── migrations.js
│   │   ├── middleware/       # Middlewares Express
│   │   │   └── authenticateClerk.js
│   │   ├── app.js            # Config Express app
│   │   └── server.js         # entrypoint
│   ├── Dockerfile            # instructions for backend dockerfile
│   ├── package.json          
│   └── .env                  
├── frontend/
│   ├── public/               
│   ├── src/                  
│   │   ├── App.js
│   │   ├── index.js
│   │   └── ... # components, pages, styles, ...
│   ├── Dockerfile            # instructions for frontend dockerfile
│   ├── nginx.conf            # config Nginx
│   ├── package.json          
│   └── .env                  
├── .env                      
├── docker-compose.yml        # config Docker Compose
└── README.md                 
```
