# Healthcare Appointment & Follow-up Manager

CareConnect is an end-to-end, multi-portal healthcare appointment scheduling and clinical patient management SaaS platform. Designed to streamline clinic operations, CareConnect empowers patients to discover doctors and submit pre-visit symptoms in advance, provides doctors with AI-generated diagnostic triage summaries before consultations, produces patient-friendly post-visit care plans, and maintains real-time synchronization across patient/doctor workflows via transactional email notifications (Nodemailer) and Google Calendar OAuth 2.0 integration.

---

## 🌐 Live Production Deployment

| Service | Environment | Production URL | Status / Endpoint |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Production (Vercel) | [https://careconect-alpha.vercel.app](https://careconect-alpha.vercel.app) | React 19 SPA |
| **Login Portal** | Production (Vercel) | [https://careconect-alpha.vercel.app/login](https://careconect-alpha.vercel.app/login) | Role-Based Access Control |
| **Backend REST API** | Production (Render) | [https://careconect-api.onrender.com](https://careconect-api.onrender.com) | Express REST API |
| **API Health Check** | Production (Render) | [https://careconect-api.onrender.com/api/health](https://careconect-api.onrender.com/api/health) | `{"status":"OK"}` |

---

## 💻 Tech Stack Specification

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | Express.js | `^4.18.2` | REST API Web Server |
| **Database ORM** | Prisma Client / CLI | `^5.22.0` | ORM, Schema Migrations & Data Access |
| **Database Engine** | PostgreSQL | `v14.0+` | Managed Database (Neon / Supabase) |
| **Frontend SPA** | React | `^19.2.8` | Client Single Page Application |
| **Build Tool** | Vite | `^8.2.2` | Modern Frontend Bundler |
| **Styling & UI** | TailwindCSS & Lucide Icons | `^3.4.19` / `^1.34.0` | Responsive UI Design System (`#3FA3C3` Teal) |
| **State & Data Fetching**| React Query & Axios | `^5.102.2` / `^1.19.0` | Client State & HTTP Communication |
| **Authentication** | JSON Web Tokens (JWT) / bcryptjs | `^9.0.2` / `^2.4.3` | Role-Based Auth (`PATIENT`, `DOCTOR`, `ADMIN`) |
| **AI Triage & Summaries**| Google Gemini AI SDK | `^0.24.1` | Symptom Triage & Post-Visit Summarizer |
| **Transactional Email** | Nodemailer | `^6.10.1` | SMTP Email Notifications & Retry Engine |
| **Calendar Sync** | Google APIs | `^133.0.0` | OAuth 2.0 & Google Calendar Event Sync |
| **Background Cron** | Node-Cron | `^4.6.0` | Notification Retries & Medication Alarms |
| **Testing Framework** | Jest & Supertest | `^30.4.2` / `^7.2.2` | Integration & Unit Test Suite |

---

## 🚀 Setup & Local Installation Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **PostgreSQL**: `v14.0` or higher
- **npm**: `v9.0.0` or higher

### Step 1: Clone Repository
```bash
git clone https://github.com/tarpitak28/Healthcare-Appointment-Follow-up-Manager.git
cd Healthcare-Appointment-Follow-up-Manager
```

### Step 2: Install Dependencies
```bash
# 1. Install Backend Dependencies
cd server
npm install

# 2. Install Frontend Dependencies
cd ../client
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in both root and `server/` directories:
```bash
cd ../server
cp .env.example .env
```

### Step 4: Database Migration & Seeding
Initialize PostgreSQL tables, apply partial unique indexes, and seed demo accounts:
```bash
# Apply Prisma DB Migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed Database with Default Accounts
node src/seed.js
```

### Step 5: Start Local Development Servers
```bash
# Terminal 1: Start Express Backend API (Runs on Port 5000)
cd server
npm run dev

# Terminal 2: Start React Frontend SPA (Runs on Port 5173 / 3000)
cd client
npm run dev
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Safe Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `5000` | Express REST API server port |
| `DATABASE_URL` | **Yes** | None | PostgreSQL connection string with SSL |
| `JWT_SECRET` | **Yes** | `fallback_secret` | Secret key for signing JWT authentication tokens |
| `GEMINI_API_KEY` | No | None | Google Gemini AI API key for clinical triage (falls back gracefully if unset) |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model identifier |
| `CLIENT_URL` | No | `http://localhost:5173` | Frontend origin URL for CORS validation |
| `EMAIL_HOST` | No | `smtp.gmail.com` | Transactional email SMTP server |
| `EMAIL_PORT` | No | `587` | Transactional email SMTP port |
| `EMAIL_USER` | No | None | SMTP authentication username |
| `EMAIL_PASS` | No | None | SMTP account password / Gmail App Password |
| `EMAIL_FROM` | No | `"CareConnect Platform"` | Transactional email sender display name |
| `GOOGLE_CLIENT_ID` | No | None | Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | No | None | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | No | `/api/calendar/callback` | OAuth redirect URI callback route |

---

## 👥 Seeded Demo Accounts

The database seed script (`node src/seed.js`) provisions pre-configured accounts for testing:

| Role | Name | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **PATIENT** | Tarpita K | `ktarpita@gmail.com` | `password123` | Doctor search, slot hold, symptom submission, booking |
| **PATIENT** | Demo Patient | `patient@example.com` | `password123` | Alternative patient account for slot hold testing |
| **DOCTOR** | Dr. Pranjal Karan | `pranjalkaran2004@gmail.com` | `password123` | View assigned schedule, AI symptom triage, post-visit notes |
| **DOCTOR** | Dr. Sarah Jenkins | `doctor@example.com` | `password123` | General Physician profile testing |
| **ADMIN** | Chief Admin | `admin@healthpulse.app` | `password123` | Doctor management, leave enforcement, system broadcasts |

---

## 🧪 Running Automated Tests

```bash
cd server

# Run standard test suite
npm test

# Run test coverage report
npm run test:coverage
```

### Test Coverage Highlights:
- **Concurrency Protection**: Verifies simultaneous booking attempts for the same slot result in exactly one `HTTP 201 Created` and one `HTTP 409 Conflict`.
- **Doctor Leave Cascades**: Validates that multi-day leave ranges auto-cancel overlapping bookings and dispatch patient email alerts.
- **Notification Retries**: Tests idempotent `NotificationLog` event key creation and bounded exponential backoff retries.
- **AI Source Grounding**: Verifies anti-hallucination guardrails flag unstated diagnoses and medications for human review (`needsHumanReview = true`).

---

## 📚 Technical Documentation Index

Detailed architectural and integration specifications are located in the `docs/` folder:

1. 🏛️ **[System Design Document](file:///e:/Health_Appointment/SYSTEM_DESIGN.md)** (`SYSTEM_DESIGN.md` — 546 words): Concise breakdown of double-booking prevention, doctor leave handling, slot holds, and notification retry mechanics.
2. 🔌 **[REST API Reference](file:///e:/Health_Appointment/docs/API_DOCUMENTATION.md)** (`docs/API_DOCUMENTATION.md`): Endpoint specifications, request/response JSON schemas, and HTTP status codes.
3. 🗄️ **[Database Schema Reference](file:///e:/Health_Appointment/docs/DATABASE_SCHEMA.md)** (`docs/DATABASE_SCHEMA.md`): ER diagram, model descriptions, and PostgreSQL partial unique index callout (`unique_active_doctor_slot`).
4. 🤖 **[LLM Prompts & Guardrails](file:///e:/Health_Appointment/docs/LLM_PROMPTS.md)** (`docs/LLM_PROMPTS.md`): Verbatim pre/post-visit prompts, Zod schemas, source-grounding rules, and fallback behavior.
5. 📅 **[Google Calendar Setup Guide](file:///e:/Health_Appointment/docs/GOOGLE_CALENDAR_SETUP.md)** (`docs/GOOGLE_CALENDAR_SETUP.md`): Step-by-step Google Cloud OAuth 2.0 configuration guide.

---

## ✅ Submission Checklist

- [x] Repository branch set to `main`
- [x] Repository is public and open-source
- [x] `node_modules/` excluded via `.gitignore`
- [x] `.env` excluded (no hardcoded secrets committed)
- [x] `.env.example` provided with complete environment placeholders
- [x] Comprehensive `README.md` included
- [x] REST API reference documented ([`docs/API_DOCUMENTATION.md`](file:///e:/Health_Appointment/docs/API_DOCUMENTATION.md))
- [x] Database schema documented ([`docs/DATABASE_SCHEMA.md`](file:///e:/Health_Appointment/docs/DATABASE_SCHEMA.md))
- [x] LLM prompts and guardrails documented ([`docs/LLM_PROMPTS.md`](file:///e:/Health_Appointment/docs/LLM_PROMPTS.md))
- [x] Google Calendar setup documented ([`docs/GOOGLE_CALENDAR_SETUP.md`](file:///e:/Health_Appointment/docs/GOOGLE_CALENDAR_SETUP.md))
- [x] System design write-up ≤800 words included ([`SYSTEM_DESIGN.md`](file:///e:/Health_Appointment/SYSTEM_DESIGN.md))
- [x] Application tested and verified locally
- [x] Hosted deployment URLs provided (Vercel & Render)
