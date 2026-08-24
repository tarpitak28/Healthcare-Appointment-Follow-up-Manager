# 🏥 HealthPulse — Healthcare Appointment & Follow-up Manager

[![CI Workflow](https://github.com/tarpitak28/Healthcare-Appointment-Follow-up-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/tarpitak28/Healthcare-Appointment-Follow-up-Manager/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14%2B-blue.svg)](https://www.postgresql.org/)

**HealthPulse** is a production-ready healthcare management system featuring **Role-Based Access Control (RBAC)** for Patients, Doctors, and Administrators. The system incorporates **AI pre-visit diagnostic triaging**, **zero-hallucination post-visit care plan generation**, **database-enforced double-booking prevention**, **ephemeral slot reservations**, **Nodemailer transactional emails with Dead-Letter Queue (DLQ) retry worker**, and **Google Calendar dual-syncing**.

---

## 📋 Table of Contents
- [🌟 Key System Features](#-key-system-features)
- [🛠️ Tech Stack & Architecture](#️-tech-stack--architecture)
- [🚀 Local Setup & Installation Guide](#-local-setup--installation-guide)
- [🔑 Environment Variables (.env.example)](#-environment-variables-envexample)
- [🗄️ Database Schema Summary](#️-database-schema-summary)
- [📡 Core REST API Documentation](#-core-rest-api-documentation)
- [🤖 LLM Prompts & AI Architecture](#-llm-prompts--ai-architecture)
- [📅 Google Calendar OAuth Setup Guide](#-google-calendar-oauth-setup-guide)
- [🧪 Automated Test Suite](#-automated-test-suite)

---

## 🌟 Key System Features

### 👤 Patient Portal
- **E-Commerce 3-Step Booking Wizard**: Select verified doctor, pick live time slot (with active 5-minute slot hold indicator), and submit symptoms.
- **AI Pre-Visit Assessment**: Generates urgency classification (`LOW`, `MEDIUM`, `HIGH`), chief complaint, and suggested diagnostic questions.
- **Interactive Care Plans**: Displays AI post-visit summaries, prescribed medicines, and single-click daily medication reminder setup.
- **Calendar Syncing**: Add bookings directly to Google Calendar or download `.ics` standard iCalendar invites.

### 👨‍⚕️ Doctor Clinical Workspace
- **High-Density Split-Pane Interface**: Fixed header with independent scrollable Patient Queue (polling every 10s via TanStack React Query).
- **AI Triage Cards**: Real-time display of patient symptoms, AI urgency badge, chief complaint, and suggested questions for the physician.
- **Digital Prescriber**: Clinical observations editor and multi-medicine table prescriber with zero-hallucination guardrail validation.

### 🛡️ Admin Command Center
- **Animated KPI Overview**: Live counters for Registered Doctors, Active Bookings, and Total System Appointments.
- **Doctor Leave Console**: Atomic cascading cancellation flow across single or multi-day leave ranges with patient email alerts.
- **Global Audit Log Table**: Searchable, filterable audit log with color-coded status pills (`BOOKED` emerald, `COMPLETED` blue, `CANCELLED` red).

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, TailwindCSS, Lucide Icons, TanStack React Query v4, Axios, React Router v6
- **Backend**: Node.js, Express.js, Prisma ORM
- **Database**: PostgreSQL (with partial unique indexes for ACID slot locking)
- **AI Engine**: Gemini 2.0 Flash / OpenAI API with Zod schema validation & source grounding engine
- **Email & Jobs**: Nodemailer (Pooled SMTP / Gmail), Node-Cron for bounded exponential backoff retries

---

## 🚀 Local Setup & Installation Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **PostgreSQL**: `v14.0` or higher
- **npm**: `v9.0.0` or higher

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/tarpitak28/Healthcare-Appointment-Follow-up-Manager.git
cd Healthcare-Appointment-Follow-up-Manager
```

#### 2. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment template
cp ../.env.example .env

# Run Prisma Database Migrations
npx prisma migrate deploy
npx prisma generate
```

#### 3. Frontend Setup
```bash
# Open a new terminal in project root
cd client

# Install dependencies
npm install
```

#### 4. Run Development Servers

- **Start Backend API (Port 5000)**:
  ```bash
  cd server
  npm run dev
  ```
- **Start Frontend App (Port 5173)**:
  ```bash
  cd client
  npm run dev
  ```

Open your browser at `http://localhost:5173` to access the application.

---

## 🔑 Environment Variables (.env.example)

Create a `.env` file in `server/` using the following template:

```env
# Application Server Config
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/healthcare_db?schema=public"

# Authentication Secrets
JWT_SECRET="healthpulse_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="7d"

# Master Notification Control & Staging Recipient
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_TEST_MODE=false
EMAIL_TEST_RECIPIENT=pranjalkaran2004@gmail.com

# Nodemailer SMTP Server Configuration (Gmail / Standard SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your_email@gmail.com"
EMAIL_PASS="your_gmail_app_password"
EMAIL_FROM="HealthPulse Hospital <support@healthpulse.app>"
SUPPORT_EMAIL=support@healthpulse.com

# SMTP Connection Pool & Timeout Settings
SMTP_POOL=true
SMTP_MAX_CONNECTIONS=5
SMTP_MAX_MESSAGES=100
SMTP_CONNECTION_TIMEOUT=10000
SMTP_GREETING_TIMEOUT=10000
SMTP_SOCKET_TIMEOUT=15000

# Google Cloud OAuth 2.0 Credentials (For Live Calendar Sync)
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"

# LLM API Keys (Gemini / OpenAI)
GEMINI_API_KEY="your_gemini_api_key"
OPENAI_API_KEY="your_openai_api_key"
```

---

## 🗄️ Database Schema Summary

The database uses PostgreSQL with Prisma ORM and enforcing ACID partial unique indexes (`unique_active_doctor_slot`).

| Model Name | Description & Key Fields |
| :--- | :--- |
| **`User`** | Central identity record (`id`, `name`, `email`, `password`, `role`: `ADMIN` \| `DOCTOR` \| `PATIENT`). |
| **`DoctorProfile`** | Doctor specialization & workspace config (`userId`, `specialisation`, `slotDuration`, `workingHours`). |
| **`Appointment`** | Consultation record (`patientId`, `doctorProfileId`, `appointmentDate`, `startTime`, `status`: `BOOKED` \| `COMPLETED` \| `CANCELLED`, `urgencyLevel`, `chiefComplaint`, `symptoms`, `clinicalNotes`, `postVisitSummary`, `prescription`, `calendarEventId`). |
| **`SlotHold`** | Ephemeral 5-minute checkout reservation (`doctorProfileId`, `appointmentDate`, `startTime`, `expiresAt`). |
| **`DoctorLeave`** | Approved doctor leave date ranges (`doctorProfileId`, `startDate`, `endDate`, `reason`). |
| **`NotificationLog`** | Transactional DLQ email queue (`recipientUserId`, `type`, `status`: `PENDING` \| `SENT` \| `FAILED` \| `dead`, `attempts`, `nextAttemptAt`, `eventKey`). |
| **`MedicationReminder`** | Patient daily medication schedule (`patientId`, `medicineName`, `dosage`, `reminderTimes`, `startDate`, `endDate`). |
| **`GoogleToken`** | OAuth tokens for Google Calendar dual-syncing (`userId`, `accessToken`, `refreshToken`, `expiresAt`). |

---

## 📡 Core REST API Documentation

### 🔓 Auth & Profile Routes (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new patient account. |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token. |
| `GET` | `/api/auth/me` | Authenticated | Fetch current authenticated user details. |
| `PUT` | `/api/auth/me` | Authenticated | Update user name and email. |

### 👤 Patient Routes (`/api/patient`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/patient/doctors` | Patient | List all verified doctors with specializations. |
| `GET` | `/api/patient/doctors/:id/slots?date=YYYY-MM-DD` | Patient | Fetch available time slots (filters leave & active holds). |
| `POST` | `/api/patient/doctors/:id/hold-slot` | Patient | Acquire 5-minute ephemeral slot hold. |
| `POST` | `/api/patient/appointments` | Patient | Book appointment with symptoms & AI pre-visit triage. |
| `GET` | `/api/patient/appointments` | Patient | View patient consultation history & care plans. |
| `DELETE` | `/api/patient/appointments/:id` | Patient | Cancel appointment and free up time slot. |

### 👨‍⚕️ Doctor Routes (`/api/doctor`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/doctor/appointments` | Doctor | Fetch patient queue with AI triage cards. |
| `POST` | `/api/doctor/appointments/:id/post-visit` | Doctor | Submit clinical notes & generate AI post-visit summary. |

### 🛡️ Admin Routes (`/api/admin`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/doctors` | Admin | List registered doctor accounts. |
| `POST` | `/api/admin/doctors/:id/leave` | Admin | Enforce doctor leave & trigger cascading cancellations. |
| `GET` | `/api/admin/appointments` | Admin | Global audit log of all system appointments. |
| `POST` | `/api/admin/appointments/:id/cancel` | Admin | Administratively cancel an appointment. |

---

## 🤖 LLM Prompts & AI Architecture

HealthPulse uses structured JSON prompt contracts to ensure reliable AI responses.

### 1. Pre-Visit Diagnostic Triage Prompt
```text
System: You are an expert medical triage assistant. Analyze patient symptoms and return a valid JSON object strictly matching this schema:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH",
  "chiefComplaint": "Short summary of primary complaint",
  "suggestedQuestions": ["Question 1 for doctor", "Question 2", "Question 3"]
}

User Input:
Symptoms: "{symptoms}"
```

### 2. Post-Visit Patient-Friendly Summary Prompt
```text
System: You are a compassionate clinical communication assistant. Convert the doctor's clinical findings into a clear, patient-friendly summary. Return a JSON object matching this schema:
{
  "summary": "Plain English explanation of diagnosis and findings",
  "followUp": "Follow-up instructions or evaluation timeline"
}

User Input:
Diagnosis: "{diagnosis}"
Clinical Notes: "{clinicalNotes}"
```

---

## 📅 Google Calendar OAuth Setup Guide

To enable live 2-way Google Calendar event creation and deletion for evaluators:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **HealthPulse**.
3. Navigate to **APIs & Services > Library** and enable the **Google Calendar API**.
4. Navigate to **OAuth Consent Screen**:
   - User Type: **External** (Testing mode).
   - Add test user email addresses under "Test Users".
5. Navigate to **Credentials > Create Credentials > OAuth client ID**:
   - Application Type: **Web Application**.
   - Authorized JavaScript Origins: `http://localhost:5173` and `http://localhost:5000`.
   - Authorized Redirect URIs: `http://localhost:5000/api/auth/google/callback`.
6. Copy the **Client ID** and **Client Secret** into your `server/.env` file:
   ```env
   GOOGLE_CLIENT_ID="your_client_id"
   GOOGLE_CLIENT_SECRET="your_client_secret"
   GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"
   ```
7. Click **"Connect Google Calendar"** on the Patient Dashboard to complete OAuth authorization!

---

## 🧪 Automated Test Suite

HealthPulse includes an automated Jest integration test suite verifying double-booking defense, leave cascades, notification retries, anti-hallucination guardrails, and migration integrity.

To execute the test suite:

```bash
cd server
npm test
```

### Test Output:
```text
PASS tests/leaveRange.test.js
PASS tests/concurrency.test.js
PASS tests/notificationReliability.test.js
PASS tests/migrationIntegrity.test.js
PASS tests/postVisitGuardrail.test.js

Test Suites: 5 passed, 5 total
Tests:       11 passed, 11 total
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
