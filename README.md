# 🏥 HealthPulse: Healthcare Appointment & Follow-Up Manager

HealthPulse is a world-class, full-stack healthcare platform featuring AI-driven clinical triaging, real-time slot locking, automated medication reminders, and dual-sync Google Calendar integration.

## 🚀 Quick Start Setup Guide

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+)
- Google Cloud Console Account (for OAuth 2.0)

### 2. Backend Setup
```bash
cd server
npm install
# Copy the environment file and fill in your credentials
cp .env.example .env
# Deploy database schema
npx prisma migrate deploy
# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

---

## 🔐 Environment Variables (`.env.example`)

```env
# Server Config
PORT=5000
CLIENT_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/healthcare_db?schema=public"

# Security
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Google Calendar OAuth 2.0
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/auth/google/callback

# SMTP Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## 🤖 LLM Prompts (Gemini Flash)

**1. Pre-Visit Triage Prompt (Patient Symptoms):**

> "You are a clinical triage assistant. Analyze the following patient symptoms: '{symptoms}'. Provide a JSON output with the following structure: { 'urgency': 'LOW' | 'MEDIUM' | 'HIGH', 'chiefComplaint': 'Short 3-5 word summary', 'suggestedQuestions': ['Question 1', 'Question 2', 'Question 3'] }. Return only valid JSON."

**2. Post-Visit Summary Prompt (Doctor Notes):**

> "You are a medical scribe. Convert these clinical notes into a patient-friendly summary. Use plain language. Format as a JSON object: { 'patientFriendlySummary': '...', 'followUpSteps': ['...', '...'] }. Notes to summarize: '{clinicalNotes}'. Return only valid JSON."

---

## 📅 Google Calendar API Setup Steps

To test the Google Calendar sync locally:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Calendar API**.
3. Navigate to **APIs & Services > Credentials**.
4. Create an **OAuth 2.0 Client ID** (Web Application).
5. Add `http://localhost:5173` to **Authorized JavaScript origins**.
6. Add `http://localhost:5000/api/calendar/auth/google/callback` to **Authorized redirect URIs**.
7. Copy the Client ID and Secret into your `.env` file.

---

## 🗄️ Core Database Schema (Prisma)

* **`User`**: Manages RBAC authentication (`PATIENT`, `DOCTOR`, `ADMIN`).
* **`DoctorProfile`**: Links to `User`. Stores specializations, working hours, and slot duration.
* **`Appointment`**: Stores date, time, status, symptoms, and AI outputs. Enforces double-booking constraints via `@@unique([doctorProfileId, appointmentDate, startTime])`.
* **`SlotHold`**: Ephemeral table managing 5-minute checkout locks.
* **`NotificationLog`**: Idempotent table tracking SMTP dispatch attempts and exponential backoff retry states.

---

## 🌐 Core API Routes

| Method | Endpoint | Description | Role |
| --- | --- | --- | --- |
| `POST` | `/api/appointments` | Book slot & trigger AI Triage | `PATIENT` |
| `PUT` | `/api/appointments/:id/cancel` | Cancel & remove Calendar event | `PATIENT/DOCTOR` |
| `POST` | `/api/clinical/consultation` | Submit notes & trigger AI Summary | `DOCTOR` |
| `POST` | `/api/admin/leave` | Enforce leave & cascade cancellations | `ADMIN` |
| `GET` | `/api/calendar/auth-url` | Generate Google OAuth Consent Link | `ANY` |
