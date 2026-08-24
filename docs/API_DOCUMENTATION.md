# CareConnect REST API Reference

This document provides a comprehensive REST API specification for the **CareConnect Healthcare Appointment & Follow-Up Manager** backend.

---

## Base URLs
- **Local Development**: `http://localhost:5000/api`
- **Production Hosted API**: `https://careconect-api.onrender.com/api`

---

## Authentication & Role-Based Access Control (RBAC)

All protected routes require a Bearer Token in the HTTP `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Roles Supported:
- `PATIENT`
- `DOCTOR`
- `ADMIN`

---

## 1. Authentication Routes (`/api/auth`)

### `POST /api/auth/register`
- **Authentication**: None (Public)
- **Role**: Any
- **Purpose**: Registers a new user account (Defaults to `PATIENT` role unless specified).
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "PATIENT"
}
```
- **Responses**:
  - `201 Created`: User successfully registered. Returns user object and JWT token.
  - `400 Bad Request`: Email already exists or missing required fields.

---

### `POST /api/auth/login`
- **Authentication**: None (Public)
- **Role**: Any
- **Purpose**: Authenticates a user and returns a signed JWT session token.
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "password123"
}
```
- **Responses**:
  - `200 OK`: Authentication successful.
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "uuid-v4-string",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "PATIENT"
  }
}
```
  - `401 Unauthorized`: Invalid credentials.

---

### `GET /api/auth/me`
- **Authentication**: Required (`Bearer <token>`)
- **Role**: `PATIENT`, `DOCTOR`, `ADMIN`
- **Purpose**: Fetches currently authenticated user profile.
- **Responses**:
  - `200 OK`: Returns authenticated user details.
  - `401 Unauthorized`: Missing or expired token.

---

## 2. Patient Routes (`/api/patient`)

All `/api/patient` routes require `verifyToken` and `requireRole(['PATIENT'])`.

### `GET /api/patient/doctors`
- **Purpose**: Searches and filters active doctor profiles.
- **Query Parameters**:
  - `specialisation` (optional): Filter by doctor specialty (e.g. `Cardiology`, `Pediatrics`).
- **Responses**: `200 OK`

---

### `GET /api/patient/doctors/:doctorProfileId/slots`
- **Purpose**: Retrieves available 30-minute booking slots for a specified date, excluding booked slots, holds, and doctor leave days.
- **Query Parameters**:
  - `date`: Target date in `YYYY-MM-DD` format.
- **Responses**: `200 OK`

---

### `POST /api/patient/doctors/:doctorProfileId/hold-slot`
- **Purpose**: Creates an ephemeral 5-minute slot reservation timer (`SlotHold`) to prevent concurrent slot collisions while filling pre-visit details.
- **Request Body**:
```json
{
  "appointmentDate": "2026-12-01",
  "startTime": "10:00"
}
```
- **Responses**:
  - `200 OK` / `201 Created`: Slot held successfully for 300 seconds.
  - `409 Conflict`: Slot is currently held or already booked by another user.

---

### `POST /api/patient/appointments`
- **Purpose**: Submits appointment booking with pre-visit symptoms. Triggers AI pre-visit triage summary, creates calendar event, and dispatches email confirmations.
- **Request Body**:
```json
{
  "doctorProfileId": "uuid-doctor-profile-id",
  "appointmentDate": "2026-12-01",
  "startTime": "10:00",
  "endTime": "10:30",
  "symptoms": "High fever, persistent cough, and body ache for 3 days"
}
```
- **Responses**:
  - `201 Created`: Appointment confirmed.
  - `409 Conflict`: Slot already booked (defended via PostgreSQL partial unique index `unique_active_doctor_slot`).
  - `400 Bad Request`: Doctor is on leave or invalid slot requested.

---

### `GET /api/patient/appointments`
- **Purpose**: Returns all appointments for the logged-in patient, including doctor details, pre-visit summary, post-visit summary, and care plan.
- **Responses**: `200 OK`

---

### `DELETE /api/patient/appointments/:appointmentId/cancel`
- **Purpose**: Cancels an active appointment, releases slot, notifies doctor/patient, and removes Google Calendar event.
- **Responses**: `200 OK`

---

## 3. Doctor Routes (`/api/doctor`)

All `/api/doctor` routes require `verifyToken` and `requireRole(['DOCTOR'])`.

### `GET /api/doctor/appointments`
- **Purpose**: Retrieves assigned patient appointments for the doctor workspace, complete with AI pre-visit diagnostic symptom summaries and urgency levels.
- **Responses**: `200 OK`

---

### `POST /api/doctor/appointments/:appointmentId/post-visit`
- **Purpose**: Submits clinical consultation notes and digital prescription. Triggers Gemini AI anti-hallucination post-visit summarizer with Zod schema validation and source grounding.
- **Request Body**:
```json
{
  "clinicalNotes": "Patient presented with acute bronchitis. Prescribed Amoxicillin 500mg tid for 7 days. Rest and adequate hydration advised.",
  "prescription": {
    "diagnosis": "Acute Bronchitis",
    "medicines": [
      { "name": "Amoxicillin", "dosage": "500mg", "frequency": "Thrice daily (TID)", "duration": "7 days" }
    ],
    "followUpInstructions": "Return for follow-up in 7 days if symptoms persist."
  }
}
```
- **Responses**:
  - `200 OK`: Post-visit summary generated and patient notified.
  - `400 Bad Request`: Invalid appointment ID or notes missing.

---

### `POST /api/doctor/appointments/:appointmentId/approve-summary`
- **Purpose**: Allows a doctor to review and approve an AI post-visit summary flagged for human review (`needsHumanReview = true`).
- **Responses**: `200 OK`

---

## 4. Admin Routes (`/api/admin`)

All `/api/admin` routes require `verifyToken` and `requireRole(['ADMIN'])`.

### `GET /api/admin/doctors`
- **Purpose**: Lists all registered doctors and their profiles.
- **Responses**: `200 OK`

---

### `POST /api/admin/doctors`
- **Purpose**: Provisions a new doctor user account and profile.
- **Request Body**:
```json
{
  "name": "Dr. Sarah Jenkins",
  "email": "sarah.jenkins@healthpulse.app",
  "password": "password123",
  "specialisation": "General Medicine",
  "slotDuration": 30,
  "workingHours": { "start": "09:00", "end": "17:00" }
}
```
- **Responses**: `201 Created`

---

### `POST /api/admin/doctors/:doctorProfileId/leave`
- **Purpose**: Enforces doctor leave range (`startDate` to `endDate`). Automatically cancels overlapping active bookings, notifies affected patients via email, and deletes calendar events.
- **Request Body**:
```json
{
  "startDate": "2026-12-10",
  "endDate": "2026-12-12",
  "reason": "Medical Conference"
}
```
- **Responses**:
  - `200 OK`: Leave enforced and cancelled appointments reported.
  - `400 Bad Request`: `endDate` before `startDate`.

---

### `POST /api/admin/broadcasts`
- **Purpose**: Dispatches system announcements to all users, patients, doctors, or admins.
- **Request Body**:
```json
{
  "subject": "Platform Maintenance Scheduled",
  "message": "CareConnect will undergo routine maintenance tonight at 02:00 UTC.",
  "audience": "ALL_USERS"
}
```
- **Responses**: `200 OK`

---

## 5. Medication Reminder Routes (`/api/medications`)

All `/api/medications` routes require `verifyToken`.

### `GET /api/medications`
- **Purpose**: Lists active prescription medication alarms for logged-in patient.
- **Responses**: `200 OK`

---

### `POST /api/medications`
- **Purpose**: Schedules a new medication reminder alarm derived from doctor prescription.
- **Responses**: `201 Created`

---

### `DELETE /api/medications/:id`
- **Purpose**: Deactivates a medication reminder.
- **Responses**: `200 OK`

---

## 6. Google Calendar Routes (`/api/calendar`)

### `GET /api/calendar/auth-url`
- **Purpose**: Generates Google OAuth 2.0 consent authorization URL.
- **Responses**: `200 OK` (`{ "url": "https://accounts.google.com/o/oauth2/v2/auth..." }`)

---

### `GET /api/calendar/auth/google/callback`
- **Purpose**: OAuth 2.0 authorization code callback. Exchanges code for access/refresh tokens and persists them to `GoogleToken` table. Redirects user back to frontend SPA.

---

### `GET /api/calendar/status`
- **Authentication**: Required (`Bearer <token>`)
- **Purpose**: Returns Google Calendar OAuth sync connection status for current user.
- **Responses**: `200 OK` (`{ "connected": true, "expiresAt": "2026-08-25T12:00:00Z" }`)

---

### `POST /api/calendar/disconnect`
- **Authentication**: Required (`Bearer <token>`)
- **Purpose**: Revokes and deletes stored Google OAuth tokens for user.
- **Responses**: `200 OK`
