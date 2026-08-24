# Healthcare Appointment & Follow-up Manager

# CareConnect — Premium Healthcare SaaS Platform

CareConnect is a modern healthcare appointment scheduling and patient management SaaS application built with a decoupled React SPA frontend and a Node.js/Express REST backend backed by PostgreSQL (Prisma ORM). It features role-based access for Patients, Doctors, and Admins, AI-driven symptom summaries, double-booking prevention, doctor leave management, medication reminder scheduling, transactional email notifications, and Google Calendar OAuth 2.0 synchronization.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Installation](#installation)
8. [Environment Variables](#environment-variables)
9. [.env.example](#envexample)
10. [Database Setup](#database-setup)
11. [Running Locally](#running-locally)
12. [Frontend](#frontend)
13. [Backend](#backend)
14. [API Documentation](#api-documentation)
15. [Authentication & Roles](#authentication--roles)
16. [Appointment Booking Flow](#appointment-booking-flow)
17. [Double-Booking Prevention](#double-booking-prevention)
18. [Slot Hold Mechanism](#slot-hold-mechanism)
19. [Doctor Leave Handling](#doctor-leave-handling)
20. [AI / LLM Integration](#ai--llm-integration)
21. [Pre-Visit Prompt](#pre-visit-prompt)
22. [Post-Visit Prompt](#post-visit-prompt)
23. [Email Notifications](#email-notifications)
24. [Email Retry Strategy](#email-retry-strategy)
25. [Google Calendar Integration](#google-calendar-integration)
26. [Google OAuth 2.0 Setup](#google-oauth-2.0-setup)
27. [Background Jobs](#background-jobs)
28. [Medication Reminder System](#medication-reminder-system)
29. [Testing](#testing)
30. [Known Limitations](#known-limitations)

---

## Overview
CareConnect streamlines clinic operations by enabling patients to book appointments, select consultation modes, and submit pre-visit symptoms. Doctors receive AI-structured diagnostic triage summaries before consultations and generate patient-friendly care plans after visits.

---

## Features
- **Patient Portal**: Doctor discovery grid, specialty filtering, 4-step booking wizard with 5-minute ephemeral slot holds, medical documents repository, and prescription medication reminder alarms.
- **Doctor Portal**: Clinical schedule workspace, AI pre-visit symptom summaries with urgency levels (Low/Medium/High), chief complaints, suggested questions, and digital prescriber table.
- **Admin Portal**: Doctor profile management, multi-day doctor leave enforcement with automated booking cancellation and patient notification, global audit log, and broadcast console.
- **Concurrency & Reliability**: PostgreSQL partial unique index double-booking defense, exponential backoff notification retries, and Gemini AI zero-hallucination source grounding.

---

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS (CareConnect Teal `#3FA3C3`), Lucide Icons, React Query (@tanstack/react-query), React Router v6.
- **Backend**: Node.js, Express.js, PostgreSQL, Prisma ORM, Nodemailer, Google APIs (Calendar OAuth 2.0), Google Gemini AI (@google/genai).
- **Testing & Tooling**: Jest, Supertest, Nodemon, Dotenv.

---

## Architecture
```text
React 18 SPA (CareConnect #3FA3C3 UI)
       │
       ▼
Express REST API ──► PostgreSQL (Prisma ORM)
       │
       ├───────────────────┬───────────────────┐
       ▼                   ▼                   ▼
NotificationService   Gemini AI API    Google Calendar API
```

---

## Project Structure
```text
Health_Appointment/
├── client/                     # React Vite Frontend SPA
│   ├── src/
│   │   ├── components/         # CareConnect UI Primitives & Layout (Sidebar, Topbar, MobileDrawer)
│   │   ├── context/            # AuthContext (JWT state)
│   │   ├── pages/              # Patient, Doctor, Admin Workspaces & Auth
│   │   └── api/                # Axios API instance
├── server/                     # Express REST API Server
│   ├── src/
│   │   ├── config/             # DB & Environment Config
│   │   ├── controllers/        # Patient, Doctor, Admin, Auth Controllers
│   │   ├── middleware/         # Auth & Role Verification Middleware
│   │   ├── routes/             # API Route Handlers
│   │   ├── services/           # AI, Calendar, Notification Services
│   │   └── utils/              # Email Templates & Universal Mailer
├── prisma/                     # Prisma Database Schema & Migrations
├── README.md                   # Master Documentation
├── SYSTEM_DESIGN.md            # Architecture Document (<800 words)
├── SUBMISSION_AUDIT.md         # 23-Point Requirement Matrix
├── FINAL_AUDIT_REPORT.md       # Defect Audit Report
├── API_DOCUMENTATION.md        # API Reference
└── .env.example                # Secret-Free Environment Template
```

---

## Prerequisites
- **Node.js**: `v18.0.0` or higher
- **PostgreSQL**: `v14.0` or higher
- **npm**: `v9.0.0` or higher

---

## Installation
```bash
# 1. Clone repository
git clone https://github.com/tarpitak28/Healthcare-Appointment-Follow-up-Manager.git
cd Healthcare-Appointment-Follow-up-Manager

# 2. Install backend dependencies
cd server
npm install

# 3. Install frontend dependencies
cd ../client
npm install
```

---

## Environment Variables
Create `.env` files in `server/` and `client/` using `.env.example` as a guide.

---

## .env.example
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/careconnect?schema=public
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM="CareConnect Platform" <your_email@gmail.com>
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
CLIENT_URL=http://localhost:3000
```

---

## Database Setup
```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```

---

## Running Locally
```bash
# Terminal 1: Start Backend API (Port 5000)
cd server
npm run dev

# Terminal 2: Start Frontend SPA (Port 3000)
cd client
npm run dev
```

---

## Frontend
The React 18 SPA runs on Vite on `http://localhost:3000`. It adopts CareConnect design tokens (`#3FA3C3` primary teal, `#F7F9FA` background, `#FFFFFF` cards, Inter font).

---

## Backend
The Express.js REST API runs on `http://localhost:5000` with JWT authentication, role authorization middleware, and PostgreSQL Prisma connection pooling.

---

## API Documentation
See [`API_DOCUMENTATION.md`](file:///e:/Health_Appointment/API_DOCUMENTATION.md) for full REST route details.

---

## Authentication & Roles
- **PATIENT**: Books appointments, enters symptoms, accesses post-visit summaries and medication alarms.
- **DOCTOR**: Views assigned schedules, reads AI diagnostic triage, enters clinical notes, and prescribes care plans.
- **ADMIN**: Manages doctor profiles, enforces doctor leave ranges, views audit logs, and dispatches broadcasts.

---

## Appointment Booking Flow
1. Patient selects doctor -> 2. Selects date & available 30-min slot -> 3. Ephemeral 5-minute slot hold reserves slot -> 4. Selects consultation mode (`Video`, `Audio`, `In-Person`) & enters symptoms -> 5. Booking confirmed & calendar invite attached.

---

## Double-Booking Prevention
Defended via PostgreSQL partial unique index `unique_active_doctor_slot` on `(doctorProfileId, appointmentDate, startTime)` where `status != 'CANCELLED'`. Concurrent requests encountered at the exact same millisecond result in one `HTTP 201 Created` and one `HTTP 409 Conflict`.

---

## Slot Hold Mechanism
When a patient selects a slot, an ephemeral 5-minute timer (`SlotHold`) initializes. Unconfirmed slots automatically expire after 300 seconds, restoring slot availability.

---

## Doctor Leave Handling
Admin leave enforcement across `startDate` to `endDate` automatically cancels overlapping active bookings, dispatches individual email alerts to patients, and blocks new slot bookings.

---

## AI / LLM Integration
Powered by Google Gemini AI (`@google/genai`). Includes structured JSON parsing and zero-hallucination grounding guardrails (`needsHumanReview = true`).

---

## Pre-Visit Prompt
"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"

---

## Post-Visit Prompt
"Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"

---

## Email Notifications
Dispatches branded HTML email cards via Nodemailer (Gmail SMTP) for confirmations, reminders, cancellations, doctor leave alerts, and announcements.

---

## Email Retry Strategy
`NotificationService` uses an idempotent `NotificationLog` (`eventKey`) with bounded exponential backoff retries (1m → 5m → 15m → 60m, up to 5 attempts).

---

## Google Calendar Integration
OAuth 2.0 integration creates, updates, and deletes Google Calendar events for patients and doctors upon appointment state changes.

---

## Google OAuth 2.0 Setup
1. Create Google Cloud Project -> 2. Enable Google Calendar API -> 3. Configure OAuth consent screen -> 4. Create OAuth client ID -> 5. Set redirect URI to `http://localhost:5000/api/calendar/callback` -> 6. Copy Client ID and Secret to `.env`.

---

## Background Jobs
Background cron tasks poll for due notification retries (`processNotificationRetries`) and active medication alarm triggers.

---

## Medication Reminder System
Schedules once daily, twice daily, or thrice daily dosage alarms derived from doctor prescriptions.

---

## Testing
```bash
cd server
npm test
```
Executes Jest test suite covering concurrency protection, doctor leave cascades, notification retries, schema integrity, and AI grounding.

---

## Known Limitations
- Google Calendar live synchronization requires user OAuth authorization consent.
- Email delivery requires valid SMTP credentials configured in `.env`.
