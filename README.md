# Healthcare Appointment & Follow-up Manager

A comprehensive healthcare appointment platform with role-based access control for **Patients**, **Doctors**, and **Admins**. It provides AI-powered pre-visit symptom analysis, automated post-visit summaries, conflict-free scheduling, email notifications with `.ics` calendar attachments, and Google Calendar integration.

---

## Table of Contents
- [Features & Deliverables](#features--deliverables)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Setup & Installation Guide](#setup--installation-guide)
- [Environment Variables (.env.example)](#environment-variables-envexample)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [LLM Integration & Prompts](#llm-integration--prompts)
- [Google Calendar & Email Setup](#google-calendar--email-setup)

---

## Features & Deliverables

### Admin Portal
- Manage doctor profiles (specialisation, slot duration, working hours).
- Mark doctor leave for single or date ranges.
- Automatic cancellation of conflicting bookings and patient email notifications upon doctor leave.

### Patient Portal
- Search doctors by specialisation or name.
- Check live slot availability with leave warning banners and real-time past slot filtering.
- Submit symptom descriptions prior to booking.
- Automatic email confirmation with attached `.ics` calendar invites.

### Doctor Portal
- Review upcoming patient appointments.
- Inspect AI-generated pre-visit summaries (urgency level, chief complaint, suggested diagnostic questions).
- Submit clinical notes and prescriptions.
- Automatic AI generation of patient-friendly post-visit summaries.

### AI Features (OpenAI LLM)
- **Pre-Visit Symptom Analysis:** Categorizes urgency (`LOW`, `MEDIUM`, `HIGH`), extracts chief complaint, and provides 3 suggested questions for the doctor.
- **Post-Visit Summary:** Converts doctor clinical notes into a patient-friendly summary with medication guidance.
- **Resilience:** Graceful fallback structures if OpenAI API key is unconfigured or rate-limited.

---

## Tech Stack
- **Backend:** Node.js, Express.js
- **Frontend:** React (Vite), TailwindCSS, Axios, React Router
- **Database:** PostgreSQL with Prisma ORM
- **AI & Integrations:** OpenAI API (`gpt-3.5-turbo`), Nodemailer (SMTP / Ethereal / Mailtrap), Google Calendar API (OAuth 2.0)
- **Queue & Background Jobs:** BullMQ, Redis

---

## Setup & Installation Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Redis server (optional, for BullMQ reminder workers)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tarpitak28/Healthcare-Appointment-Follow-up-Manager.git
   cd Healthcare-Appointment-Follow-up-Manager
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` in the root and `server/` directories:
   ```bash
   cp .env.example .env
   cp .env.example server/.env
   ```

4. **Run Prisma Migrations & Client Generation:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   ```

6. **Running the Application:**
   - **Start Backend:**
     ```bash
     cd ../server
     npm run dev
     ```
   - **Start Frontend:**
     ```bash
     cd ../client
     npm run dev
     ```

Frontend runs on `http://localhost:5173/` and Backend on `http://localhost:5000/`.

---

## Environment Variables (.env.example)

```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/healthcare_db?schema=public"
JWT_SECRET="your_jwt_secret_key"
OPENAI_API_KEY="your_openai_api_key"
REDIS_HOST="localhost"
REDIS_PORT=6379
EMAIL_HOST="smtp.ethereal.email"
EMAIL_PORT=587
EMAIL_USER="your_ethereal_user"
EMAIL_PASS="your_ethereal_password"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/auth/google/callback"
CLIENT_URL="http://localhost:5173"
```

---

## Database Schema

```prisma
enum Role {
  ADMIN
  DOCTOR
  PATIENT
}

enum AppointmentStatus {
  BOOKED
  COMPLETED
  CANCELLED
}

enum UrgencyLevel {
  LOW
  MEDIUM
  HIGH
}

model User {
  id                      String         @id @default(uuid())
  name                    String
  email                   String         @unique
  password                String
  role                    Role           @default(PATIENT)
  createdAt               DateTime       @default(now())
  updatedAt               DateTime       @updatedAt
  doctorProfile           DoctorProfile?
  appointmentsAsPatient  Appointment[]  @relation("PatientAppointments")
  googleToken             GoogleToken?
}

model DoctorProfile {
  id             String         @id @default(uuid())
  userId         String         @unique
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  specialisation String
  slotDuration   Int            @default(30)
  workingHours   Json
  appointments   Appointment[]
  leaveDays      DoctorLeave[]
}

model DoctorLeave {
  id              String        @id @default(uuid())
  doctorProfileId String
  doctorProfile   DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)
  startDate       DateTime
  endDate         DateTime
  reason          String?
  createdAt       DateTime      @default(now())
}

model Appointment {
  id                String            @id @default(uuid())
  patientId         String
  patient           User              @relation("PatientAppointments", fields: [patientId], references: [id])
  doctorProfileId   String
  doctorProfile     DoctorProfile     @relation(fields: [doctorProfileId], references: [id])
  appointmentDate   DateTime          @db.Date
  startTime         String
  endTime           String
  status            AppointmentStatus @default(BOOKED)
  symptoms          String
  urgencyLevel      UrgencyLevel?
  chiefComplaint    String?
  suggestedQuestions Json?
  clinicalNotes     String?
  postVisitSummary  String?
  prescription      Json?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}
```

---

## API Documentation

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` — Register a new patient/doctor user.
- `POST /api/auth/login` — Login and receive JWT token.
- `GET /api/auth/me` — Fetch currently authenticated user profile.
- `PUT /api/auth/me` — Update name and email address.

### Admin Routes (`/api/admin`)
- `GET /api/admin/doctors` — List all registered doctor accounts.
- `POST /api/admin/doctors` — Admin directly creates a doctor profile.
- `POST /api/admin/doctors/:doctorProfileId/leave` — Mark doctor on leave & automatically cancel conflicting bookings with email alerts.

### Patient Routes (`/api/patient`)
- `GET /api/patient/doctors` — Search doctors by specialisation or name.
- `GET /api/patient/doctors/:doctorProfileId/slots?date=YYYY-MM-DD` — Get available time slots (checks doctor leave & existing bookings).
- `POST /api/patient/appointments` — Book appointment with symptom submission & pre-visit AI analysis.
- `GET /api/patient/appointments` — View patient consultation history.

### Doctor Routes (`/api/doctor`)
- `GET /api/doctor/appointments` — View doctor's scheduled patient visits & AI pre-visit insights.
- `POST /api/doctor/appointments/:id/post-visit` — Submit clinical notes & generate AI post-visit summary.

---

## LLM Integration & Prompts

### Pre-Visit Prompt
```text
Analyse these symptoms and return a valid JSON object with keys:
urgency level ("Low" / "Medium" / "High"), chief complaint (string), and suggested questions (array of three strings for the doctor).
Symptoms: <symptoms>
```

### Post-Visit Prompt
```text
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>
```

---

## Google Calendar & Email Setup

### 1. Nodemailer Email Setup
- Uses environment variables `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`.
- Supports test SMTP inboxes (e.g., Ethereal Email, Mailtrap).
- Automatically generates and attaches `appointment.ics` calendar files to booking confirmation emails.

### 2. Google Calendar API & OAuth 2.0 Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Calendar API**.
3. Configure OAuth Consent Screen.
4. Create **OAuth 2.0 Client Credentials** (Web Application) and set Authorized Redirect URIs to `http://localhost:5000/api/auth/google/callback`.
5. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to `.env`.
