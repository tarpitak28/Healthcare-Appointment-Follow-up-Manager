# Project Implementation Documentation

## 1. Executive Summary & Architecture Overview

The **Healthcare Appointment & Follow-up Manager** is a multi-role healthcare platform built for healthcare providers, doctors, and patients. It provides end-to-end appointment management, AI-assisted symptom pre-assessment, clinical note summarization, automated calendar synchronization (.ics & Google Calendar), and medication reminder management.

### Tech Stack Architecture
- **Backend Core**: Node.js v18+, Express.js (REST API server running on port 5000)
- **Database & ORM**: PostgreSQL database with Prisma ORM v5.22.0
- **Frontend Framework**: React 18, Vite, Tailwind CSS, Axios, React Router v6 (running on port 5173)
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password encryption and Role-Based Access Control (`PATIENT`, `DOCTOR`, `ADMIN`)
- **AI / LLM Integration**: OpenAI API (`gpt-3.5-turbo`) for pre-visit symptom triaging & post-visit summary generation, featuring graceful offline fallback mechanisms
- **Calendar & Notifications**: Nodemailer (SMTP / Ethereal Email) with dynamically generated `.ics` calendar invites, Google Calendar API (OAuth 2.0)
- **Background Tasks (Infrastructure)**: BullMQ & Redis (`reminderWorker.js`)

---

## 2. Database Schema & Data Models

Defined in `prisma/schema.prisma`:

### Enums
- `Role`: `ADMIN`, `DOCTOR`, `PATIENT`
- `AppointmentStatus`: `BOOKED`, `COMPLETED`, `CANCELLED`
- `UrgencyLevel`: `LOW`, `MEDIUM`, `HIGH`

### Core Models
1. **`User`**: Core identity table storing user credentials, role, and profile relationships.
   - Fields: `id` (UUID), `name`, `email` (unique), `password` (hashed), `role` (default `PATIENT`), timestamps.
2. **`DoctorProfile`**: Extended metadata for doctor users.
   - Fields: `id`, `userId` (1:1 with User), `specialisation`, `slotDuration` (default 30 mins), `workingHours` (JSON: `{ start: "09:00", end: "17:00" }`).
3. **`DoctorLeave`**: Scheduled doctor absence records.
   - Fields: `id`, `doctorProfileId`, `startDate`, `endDate`, `reason`, `createdAt`.
4. **`Appointment`**: Consultation bookings and clinical records.
   - Fields: `id`, `patientId`, `doctorProfileId`, `appointmentDate` (`Date`), `startTime`, `endTime`, `status`, `symptoms`, `urgencyLevel`, `chiefComplaint`, `suggestedQuestions` (JSON array), `clinicalNotes`, `postVisitSummary`, `prescription` (JSON object), `calendarEventId`, timestamps.
   - Indexes: `[doctorProfileId, appointmentDate, startTime]`.
5. **`MedicationReminder`**: Patient medication tracking and notification rules.
   - Fields: `id`, `patientId`, `appointmentId` (optional), `medicineName`, `dosage`, `frequency`, `reminderTimes` (JSON array of strings), `startDate`, `endDate`, `isActive`, timestamps.
   - Indexes: `[patientId, isActive]`, `[appointmentId]`.
6. **`GoogleToken`**: OAuth 2.0 tokens for Google Calendar integration.
   - Fields: `id`, `userId` (1:1 with User), `accessToken`, `refreshToken`, `expiresAt`, timestamps.

---

## 3. Backend Implementation & API Endpoints

### Authentication Module (`/api/auth`)
- `POST /register`: Registers new patient accounts (`role: 'PATIENT'`), hashes passwords with `bcrypt.hash(password, 10)`, and issues a 7-day JWT token.
- `POST /login`: Validates credentials against `User` table, verifies hash with `bcrypt.compare`, includes `doctorProfileId` if doctor, and returns JWT.
- `GET /me`: Auth-protected endpoint returning full user profile and associated `doctorProfile`.
- `PUT /me`: Updates user name and email.
- `GET /google`: Initiates Google OAuth 2.0 flow using state parameter containing user ID.
- `GET /google/callback`: Receives authorization code, exchanges it for OAuth tokens via Google API, and upserts into `GoogleToken` table.

### Admin Module (`/api/admin`)
- `GET /doctors`: Lists all registered doctors with their specialisations and working hours.
- `POST /doctors`: Creates a doctor `User` and linked `DoctorProfile` inside a Prisma database transaction.
- `POST /doctors/:doctorId/leave`: Records doctor leave date (`DoctorLeave`), queries all conflicting `BOOKED` appointments on that day, batch-updates status to `CANCELLED`, and sends email notifications to affected patients.
- `GET /appointments`: Fetches system-wide appointment ledger with full patient and doctor details.
- `POST /appointments/:appointmentId/cancel`: Cancels any appointment and emails the patient.

### Patient Module (`/api/patient`)
- `GET /doctors`: Filters doctors by specialisation or name (`contains` search).
- `GET /doctors/:doctorId/slots`: Calculates time slots based on doctor's `workingHours` and `slotDuration`. Filters out slots blocked by doctor leave, existing `BOOKED` appointments, and past times for current-day queries.
- `POST /appointments`: 
  - Validates date format (YYYY-MM-DD), ensures non-past date, verifies time grid alignment, checks doctor leave, and verifies slot availability.
  - Calls OpenAI API (`generatePreVisitSummary`) to assign urgency (`LOW`, `MEDIUM`, `HIGH`), extract chief complaint, and generate 3 clinical questions.
  - Saves appointment in database transaction (with database-level unique constraint guard).
  - Syncs event to Google Calendar if patient is connected.
  - Generates `.ics` calendar payload and sends confirmation email via Nodemailer.
- `GET /appointments`: Lists patient's consultation history including AI pre-visit insights, post-visit summary, and prescription details.
- `DELETE /appointments/:appointmentId`: Cancels patient booking, deletes Google Calendar event if present, and dispatches email notification.

### Doctor Module (`/api/doctor`)
- `GET /appointments`: Returns appointments assigned to the logged-in doctor, sorted chronologically with AI pre-visit summaries.
- `POST /appointments/:appointmentId/post-visit`: Accepts clinical notes and prescription JSON (diagnosis, medicine array, follow-up instructions). Triggers OpenAI LLM (`generatePostVisitSummary`) to format notes into patient-accessible language, and updates status to `COMPLETED`.
- `POST /appointments/:appointmentId/cancel`: Doctor cancels appointment, removes Google Calendar event, and sends patient email.

### Medication Reminders Module (`/api/medications`)
- `POST /`: Validates medicine details, dosage, frequency, reminder times array, and date range before saving `MedicationReminder`.
- `GET /`: Returns patient's medication reminders joined with appointment context.
- `PUT /:reminderId/toggle`: Toggles `isActive` state between true/false.
- `DELETE /:reminderId`: Deletes a medication reminder record.

---

## 4. Frontend Implementation & UI Components

- **Auth Context (`AuthContext.jsx`)**: Top-level React context providing `user`, `loading`, `login`, `register`, and `logout` helpers, storing JWT in `localStorage`.
- **Axios Instance (`axios.js`)**: Base Axios configuration targeting `http://localhost:5000/api` with automatic JWT `Authorization: Bearer <token>` header injection.
- **Pages**:
  - `Login.jsx` & `Register.jsx`: Clean credential forms with role-based routing redirection.
  - `PatientDashboard.jsx`: Features doctor search, date picker, live slot grid, symptom input modal, appointment status feed with prescription viewer, and medication reminder scheduler modal.
  - `DoctorDashboard.jsx`: Displays upcoming patient appointments with AI pre-visit tags/questions, visit completion modal with dynamic medicine list constructor, and appointment cancellation.
  - `AdminDashboard.jsx`: Overview of system statistics, doctor registration list, single-day leave marker tool with auto-cancellation feedback, and global appointment log.

---

## 5. Third-Party Integrations & Services

1. **OpenAI API (`llmService.js`)**:
   - Model: `gpt-3.5-turbo`
   - Pre-visit analysis output format: JSON with `urgencyLevel`, `chiefComplaint`, `suggestedQuestions`.
   - Post-visit summary output format: Friendly formatted plain text.
   - Robust fallback logic returns structured default data when API key is unset or rate limited.
2. **Nodemailer & ICS Generator (`emailService.js`, `calendarService.js`)**:
   - Generates standard iCalendar format (`BEGIN:VCALENDAR ... END:VCALENDAR`) with unique UIDs.
   - Transports HTML emails with `.ics` attachments via SMTP (Ethereal / Mailtrap / custom SMTP).
3. **Google Calendar API (`calendarService.js`)**:
   - Authenticates using stored OAuth 2.0 refresh tokens.
   - Creates primary calendar events with email/popup reminders (`events.insert`) and handles deletion (`events.delete`).
4. **BullMQ / Redis Worker (`reminderWorker.js`)**:
   - Configured with `notificationQueue` connection to Redis for handling async background job processing.
