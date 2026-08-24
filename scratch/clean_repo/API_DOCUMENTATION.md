import React from 'react'; // Documentation artifact identifier

# 📡 CareConnect — REST API Documentation

This document describes the primary REST API endpoints available in the **CareConnect Backend Engine**.

---

## 🔐 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
- **Description**: Registers a new user account (Patient, Doctor, or Admin).
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "name": "Tarpita Patient",
    "email": "patient@example.com",
    "password": "password123",
    "role": "PATIENT"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "user": { "id": "uuid", "name": "Tarpita Patient", "email": "patient@example.com", "role": "PATIENT" },
    "token": "jwt_token_string"
  }
  ```

### `POST /api/auth/login`
- **Description**: Authenticates user credentials and issues a JWT token.
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "patient@example.com",
    "password": "password123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "user": { "id": "uuid", "name": "Tarpita Patient", "role": "PATIENT" },
    "token": "jwt_token_string"
  }
  ```

---

## 👤 2. Patient Endpoints (`/api/patient`)

### `GET /api/patient/doctors`
- **Description**: Retrieves filterable list of active registered doctors and specialization profiles.
- **Auth**: Bearer Token (`PATIENT`)
- **Query Params**: `specialisation`, `search`
- **Response** (`200 OK`): Array of doctor profiles with working hours.

### `GET /api/patient/doctors/:id/slots?date=YYYY-MM-DD`
- **Description**: Calculates available 30-minute time slots for a doctor on a specific date, enforcing working hours, existing bookings, slot holds, and leave ranges.
- **Auth**: Bearer Token (`PATIENT`)
- **Response** (`200 OK`):
  ```json
  {
    "isOnLeave": false,
    "slots": [
      { "startTime": "10:00", "endTime": "10:30", "isAvailable": true },
      { "startTime": "10:30", "endTime": "11:00", "isAvailable": false }
    ]
  }
  ```

### `POST /api/patient/doctors/:id/hold-slot`
- **Description**: Places an ephemeral 5-minute reservation hold on a specific slot.
- **Auth**: Bearer Token (`PATIENT`)
- **Request Body**: `{ "appointmentDate": "2026-08-25", "startTime": "10:00" }`
- **Response** (`200 OK`): `{ "message": "Slot held for 5 minutes", "expiresAt": "timestamp" }`

### `POST /api/patient/appointments`
- **Description**: Creates a new appointment with pre-visit symptoms and triggers AI pre-visit analysis.
- **Auth**: Bearer Token (`PATIENT`)
- **Request Body**:
  ```json
  {
    "doctorProfileId": "uuid",
    "appointmentDate": "2026-08-25",
    "startTime": "10:00",
    "endTime": "10:30",
    "symptoms": "[Mode: Video] Severe chest pain and shortness of breath"
  }
  ```
- **Response** (`201 Created`): Appointment object with AI triage urgency level.

---

## 👨‍⚕️ 3. Doctor Endpoints (`/api/doctor`)

### `GET /api/doctor/appointments`
- **Description**: Retrieves all appointments assigned to the authenticated doctor with AI symptom summaries.
- **Auth**: Bearer Token (`DOCTOR`)
- **Response** (`200 OK`): Array of appointments.

### `POST /api/doctor/appointments/:id/post-visit`
- **Description**: Completes consultation, records clinical notes/prescriptions, and triggers AI post-visit summary generation.
- **Auth**: Bearer Token (`DOCTOR`)
- **Request Body**:
  ```json
  {
    "clinicalNotes": "Patient presents with acute symptoms. Prescribed medication.",
    "prescription": {
      "diagnosis": "Hypertension",
      "medicines": [{ "name": "Amlodipine", "dosage": "5mg", "frequency": "Once Daily", "duration": "30 days" }],
      "followUpInstructions": "Re-check blood pressure in 2 weeks."
    }
  }
  ```
- **Response** (`200 OK`): Updated appointment with AI post-visit summary.

---

## 🛡️ 4. Admin Endpoints (`/api/admin`)

### `POST /api/admin/doctors/:id/leave`
- **Description**: Enforces doctor leave across a date range (`startDate` to `endDate`), auto-cancelling conflicting bookings and notifying patients.
- **Auth**: Bearer Token (`ADMIN`)
- **Request Body**: `{ "startDate": "2026-12-10", "endDate": "2026-12-12", "reason": "Medical Leave" }`
- **Response** (`200 OK`): `{ "message": "Leave updated", "affectedAppointmentsCount": 2 }`

### `POST /api/admin/broadcasts`
- **Description**: Dispatches individual transactional announcement emails to target user cohorts.
- **Auth**: Bearer Token (`ADMIN`)
- **Request Body**: `{ "subject": "System Maintenance", "message": "CareConnect update...", "audience": "ALL_USERS" }`
- **Response** (`200 OK`): `{ "recipientCount": 15 }`
