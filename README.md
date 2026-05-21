<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:8b5cf6&height=200&section=header&text=Finote&fontSize=80&fontColor=ffffff&fontAlignY=38&desc=AI-Powered%20Personal%20Finance%20Platform&descAlignY=58&descSize=22" width="100%"/>

<br/>

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-FFD43B?style=for-the-badge&logo=python&logoColor=blue)](https://www.python.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://render.com)
[![Status](https://img.shields.io/badge/Status-Live-success?style=flat-square)](https://finote.vercel.app)

<br/>

> **Finote** is a full-stack, AI-powered personal finance platform that helps users track expenses, scan bills with OCR, analyze spending patterns, and receive intelligent financial recommendations — all in one beautiful dashboard.

<br/>

[🌐 Live Demo](#-live-demo) · [✨ Features](#-features) · [🏗️ Architecture](#-architecture) · [🚀 Getting Started](#-getting-started) · [📡 API Reference](#-api-reference) · [🤖 AI System](#-ai-system)

<br/>

</div>

---

## 📸 Screenshots

<div align="center">

| Dashboard | Expense Tracker | AI Insights |
|:---------:|:---------------:|:-----------:|
| ![Dashboard](https://via.placeholder.com/380x220/6366f1/ffffff?text=📊+Dashboard) | ![Tracker](https://via.placeholder.com/380x220/8b5cf6/ffffff?text=💸+Expense+Tracker) | ![AI](https://via.placeholder.com/380x220/7c3aed/ffffff?text=🤖+AI+Insights) |

| OCR Bill Scanner | Spending Analytics | Affordability Analysis |
|:----------------:|:-----------------:|:----------------------:|
| ![OCR](https://via.placeholder.com/380x220/4f46e5/ffffff?text=📄+OCR+Scanner) | ![Analytics](https://via.placeholder.com/380x220/7c3aed/ffffff?text=📈+Analytics) | ![Afford](https://via.placeholder.com/380x220/6d28d9/ffffff?text=✅+Affordability) |

> ⚠️ *Replace placeholders with actual screenshots before publishing.*

</div>

---

## 🌐 Live Demo

| Service | URL | Status |
|---------|-----|--------|
| 🖥️ **Frontend** | [finote.vercel.app](https://finote.vercel.app) | ![Live](https://img.shields.io/badge/-Live-success?style=flat-square) |
| 🔧 **Backend API** | [finote-api.onrender.com/api](https://finote-api.onrender.com/api) | ![Live](https://img.shields.io/badge/-Live-success?style=flat-square) |
| 🤖 **AI Microservice** | [finote-ai.onrender.com/docs](https://finote-ai.onrender.com/docs) | ![Live](https://img.shields.io/badge/-Live-success?style=flat-square) |

> 💡 **Demo Credentials** — Email: `demo@finote.app` | Password: `Demo@1234`

---

## ✨ Features

### 🔐 Authentication & Security
- JWT-based stateless authentication with access & refresh token flow
- Secure password hashing with bcrypt
- Protected routes on both frontend and backend

### 🤖 AI Financial Assistant
- Conversational AI chatbot for personalized financial advice
- Context-aware responses based on user's spending data
- Keyword-based NLP logic for intent detection

### 📊 Affordability Analysis
- ML-powered prediction on whether a purchase is affordable
- Trained on income, fixed costs, and historical spending patterns
- Real-time scoring with confidence percentages

### 📄 OCR Bill Scanning
- Upload bill images and extract data automatically with Tesseract.js
- Image preprocessing pipeline for improved OCR accuracy
- Auto-populates expense entries from scanned content

### 💸 Expense Tracking
- Add, edit, categorize, and delete expenses with ease
- Category tagging (Food, Rent, Transport, Health, etc.)
- Monthly and weekly grouping views

### 📈 Spending Analytics Dashboard
- Interactive charts built with Chart.js
- Spending breakdown by category (donut charts)
- Monthly trend lines and comparative analysis

### 💡 AI-Powered Recommendations
- Context-sensitive tips based on user spending behavior
- Anomaly detection for unusual expense spikes
- Budget health scoring

### 📱 Responsive UI
- Mobile-first design with Tailwind CSS
- Dark/light mode support
- Accessible component structure

---

## 🏗️ Architecture

Finote follows a **distributed microservice architecture** with three independently deployed services communicating via REST APIs.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │              React App  (Vite + Tailwind CSS)                │   │
│   │                   Deployed on Vercel                         │   │
│   └───────────────┬──────────────────────────┬───────────────────┘   │
│                   │                          │                        │
└───────────────────┼──────────────────────────┼────────────────────────┘
                    │ REST (Axios)             │ REST (Axios)
                    ▼                          ▼
┌───────────────────────────┐    ┌─────────────────────────────┐
│     Node.js / Express     │    │     Python FastAPI           │
│       Backend API         │    │       AI Microservice        │
│   Deployed on Render      │    │    Deployed on Render        │
│                           │    │                              │
│  • JWT Auth               │    │  • Affordability Predictor   │
│  • Expense CRUD           │◄───│  • ML Model Inference        │
│  • OCR Processing         │    │  • Spending Insights Engine  │
│  • File Upload (Multer)   │    │  • NLP Assistant Handler     │
└───────────┬───────────────┘    └─────────────────────────────┘
            │
            │ Mongoose ODM
            ▼
┌───────────────────────────┐
│      MongoDB Atlas         │
│   Cloud Database (M0)     │
│                           │
│  • users                  │
│  • expenses               │
│  • bills                  │
└───────────────────────────┘
```

### Data Flow

**Expense Entry Flow:**
```
User Input → React Form → Axios POST /api/expenses → Express Router
  → Mongoose Schema Validation → MongoDB Atlas → Response → UI Update
```

**OCR Bill Flow:**
```
Image Upload → Multer (multipart) → Tesseract.js Preprocessing
  → OCR Text Extraction → Parsed Expense Fields → MongoDB Save
```

**AI Affordability Flow:**
```
User Purchase Query → Express → FastAPI /predict endpoint
  → Feature Engineering (pandas) → ML Model (sklearn)
  → Prediction + Confidence → Express → React UI
```

---

## 🗂️ Folder Structure

```
finote/
│
├── 📁 frontend/                    # React + Vite app
│   ├── public/
│   ├── src/
│   │   ├── 📁 components/          # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── ExpenseCard.jsx
│   │   │   ├── ChartPanel.jsx
│   │   │   ├── OCRScanner.jsx
│   │   │   └── AIAssistant.jsx
│   │   ├── 📁 pages/               # Route-level pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Affordability.jsx
│   │   │   └── Login.jsx
│   │   ├── 📁 context/             # Global state (Auth, Theme)
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   ├── 📁 services/            # Axios API service layer
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── 📁 backend/                     # Node.js + Express API
│   ├── 📁 controllers/             # Route handler logic
│   │   ├── authController.js
│   │   ├── expenseController.js
│   │   └── billController.js
│   ├── 📁 models/                  # Mongoose schemas
│   │   ├── User.js
│   │   ├── Expense.js
│   │   └── Bill.js
│   ├── 📁 routes/                  # Express routers
│   │   ├── auth.js
│   │   ├── expenses.js
│   │   └── bills.js
│   ├── 📁 middleware/              # JWT auth, error handling
│   ├── 📁 uploads/                 # Temp OCR file storage
│   ├── 📁 utils/                   # OCR + helper utilities
│   ├── server.js
│   └── package.json
│
├── 📁 ai_service/                  # Python FastAPI microservice
│   ├── 📁 models/                  # Trained ML models (.pkl)
│   ├── 📁 routers/                 # FastAPI route handlers
│   │   ├── affordability.py
│   │   ├── assistant.py
│   │   └── insights.py
│   ├── 📁 schemas/                 # Pydantic data schemas
│   ├── 📁 utils/                   # Feature engineering helpers
│   ├── train_model.py              # Model training script
│   ├── main.py                     # FastAPI app entry point
│   └── requirements.txt
│
├── .gitignore
├── README.md
└── docker-compose.yml              # Optional local orchestration
```

---

## 🤖 AI System

### Affordability Predictor

A supervised machine learning classifier that predicts whether a purchase is affordable based on the user's financial profile.

| Component | Detail |
|-----------|--------|
| **Algorithm** | `RandomForestClassifier` (primary), `LinearRegression` (budget projection) |
| **Library** | scikit-learn 1.x |
| **Features** | Monthly income, fixed expenses, savings rate, purchase amount, category |
| **Output** | Binary prediction + confidence score (%) |

**Training Pipeline:**
```python
# Simplified training flow
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model', RandomForestClassifier(n_estimators=100))
])
pipeline.fit(X_train, y_train)
```

### AI Financial Assistant

- Built on **keyword-based NLP** logic for intent classification (budget, savings, debt, investment queries)
- Extracts category and time-range entities from free text
- Retrieves relevant user expense data and generates context-aware financial tips

### OCR Bill Scanning

- **Tesseract.js** (WASM-based) runs in the Node.js backend
- Preprocessing pipeline: greyscale conversion → binarization → noise removal
- Regex-based post-processing extracts: merchant name, date, line items, total amount
- Extracted fields auto-populate a new expense record

### Spending Insights Engine

- Aggregates expenses by category over rolling 30/60/90 day windows
- Detects anomalies when category spend exceeds 1.5× the rolling average
- Generates ranked list of reduction opportunities using `pandas` groupby + sort

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React.js + Vite | SPA with fast HMR dev experience |
| **Styling** | Tailwind CSS | Utility-first responsive UI |
| **HTTP Client** | Axios | API communication with interceptors |
| **Charts** | Chart.js | Interactive data visualizations |
| **Backend** | Node.js + Express.js | RESTful API server |
| **Database** | MongoDB Atlas | Cloud NoSQL database |
| **Auth** | JWT (jsonwebtoken) | Stateless authentication |
| **File Upload** | Multer | Multipart bill image handling |
| **OCR** | Tesseract.js | In-process text extraction from images |
| **AI Service** | Python + FastAPI | High-performance ML inference API |
| **ML** | scikit-learn | RandomForest + LinearRegression models |
| **Data Processing** | pandas + numpy | Feature engineering and aggregation |
| **Frontend Host** | Vercel | CDN-based frontend deployment |
| **Backend Host** | Render | Containerized service deployment |
| **DB Host** | MongoDB Atlas | Managed cloud database (M0 free tier) |

</div>

---

## 📡 API Reference

### Auth Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login & receive JWT | ❌ |
| `GET` | `/api/auth/me` | Get current user profile | ✅ |
| `POST` | `/api/auth/logout` | Invalidate token | ✅ |

### Expense Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `GET` | `/api/expenses` | Get all user expenses | ✅ |
| `POST` | `/api/expenses` | Create new expense | ✅ |
| `PUT` | `/api/expenses/:id` | Update expense | ✅ |
| `DELETE` | `/api/expenses/:id` | Delete expense | ✅ |
| `GET` | `/api/expenses/summary` | Category-wise summary | ✅ |

### Bill / OCR Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:-------------:|
| `POST` | `/api/bills/scan` | Upload & OCR a bill image | ✅ |
| `GET` | `/api/bills` | List all scanned bills | ✅ |

### AI Microservice Endpoints (FastAPI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict/affordability` | Predict purchase affordability |
| `POST` | `/assistant/chat` | AI financial assistant response |
| `GET` | `/insights/:userId` | Personalized spending insights |
| `GET` | `/docs` | Interactive Swagger UI |

**Sample Request — Affordability Prediction:**
```json
POST /predict/affordability
{
  "monthly_income": 75000,
  "fixed_expenses": 25000,
  "variable_spending": 15000,
  "purchase_amount": 8000,
  "category": "Electronics"
}
```

**Sample Response:**
```json
{
  "affordable": true,
  "confidence": 87.4,
  "budget_remaining": 35000,
  "recommendation": "This purchase is within your comfortable spending range."
}
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** v18+ and npm
- **Python** 3.10+
- **MongoDB Atlas** account (free tier works)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/finote.git
cd finote
```

### 2. Environment Variables

Create `.env` files for each service:

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/finote
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

**`frontend/.env`**
```env
VITE_BACKEND_URL=http://localhost:5000/api
VITE_AI_SERVICE_URL=http://localhost:8000
```

**`ai_service/.env`**
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/finote
MODEL_PATH=./models/affordability_model.pkl
```

### 3. Install Dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install

# AI Microservice
cd ../ai_service && pip install -r requirements.txt
```

### 4. Train the ML Model

```bash
cd ai_service
python train_model.py
# Model saved to ./models/affordability_model.pkl
```

### 5. Run All Services

Open three terminal windows:

```bash
# Terminal 1 — Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 3 — AI Microservice (http://localhost:8000)
cd ai_service && uvicorn main:app --reload
```

Visit `http://localhost:5173` to use the app. The AI Swagger docs are available at `http://localhost:8000/docs`.

---

## ☁️ Deployment

### Architecture Overview

```
GitHub Push
    │
    ├──► Vercel (auto-deploy frontend on push to main)
    │
    ├──► Render (auto-deploy backend service)
    │
    └──► Render (auto-deploy AI microservice)
```

### Deploying Frontend (Vercel)

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Set environment variables in Vercel Dashboard → Project Settings → Environment Variables.

### Deploying Backend (Render)

1. Push `backend/` to GitHub
2. Create a new **Web Service** on Render
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `node server.js`
5. Add all environment variables from `backend/.env`

### Deploying AI Microservice (Render)

1. Push `ai_service/` to GitHub
2. Create a new **Web Service** on Render
3. Set **Build Command:** `pip install -r requirements.txt`
4. Set **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### MongoDB Atlas Setup

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Whitelist `0.0.0.0/0` for Render's dynamic IPs
3. Copy the connection string to all relevant `.env` files

---

## 🔮 Future Improvements

- [ ] **Google OAuth** — One-click sign-in with Google
- [ ] **Budget Goals** — Set monthly targets per category with alerts
- [ ] **CSV/PDF Export** — Download expense reports
- [ ] **Recurring Expenses** — Auto-log subscriptions and bills
- [ ] **Multi-currency Support** — For international users
- [ ] **Push Notifications** — Budget alerts via web push
- [ ] **GPT-4 Integration** — Replace keyword NLP with a real LLM assistant
- [ ] **Bank Statement Import** — Parse and auto-import transactions
- [ ] **Mobile App** — React Native port
- [ ] **Docker Compose** — One-command local stack setup

---

## 🤝 Contributing

Contributions are what make open source great. Any contributions you make are **greatly appreciated**.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and open an issue first for major changes.

---

## 👤 Author

<div align="center">

**Your Name**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yourusername)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/yourprofile)
[![Portfolio](https://img.shields.io/badge/Portfolio-FF5722?style=for-the-badge&logo=todoist&logoColor=white)](https://yourportfolio.dev)

</div>

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:8b5cf6&height=100&section=footer" width="100%"/>

⭐ **Star this repo if you found it helpful!** ⭐

*Built with 💜 using React, Node.js, FastAPI, and MongoDB*

</div>
