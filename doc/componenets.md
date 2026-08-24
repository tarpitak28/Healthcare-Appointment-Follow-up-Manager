# Component & System Status Analysis Report

This document presents a comprehensive audit of all working, partially working, non-working, stubbed, and mock components in the Healthcare Appointment & Follow-up Manager codebase.

---

## 1. Fully Working Systems & Functional Components

| Component / System | File Location | Functional Description | Verification Status |
| :--- | :--- | :--- | :--- |
| **User Authentication & RBAC** | [authController.js](file:///e:/Health_Appointment/server/src/controllers/authController.js), [authMiddleware.js](file:///e:/Health_Appointment/server/src/middleware/authMiddleware.js), [AuthContext.jsx](file:///e:/Health_Appointment/client/src/context/AuthContext.jsx) | Password hashing (Bcrypt), JWT generation and verification, role-based authorization for `PATIENT`, `DOCTOR`, and `ADMIN`. | **VERIFIED WORKING** |
| **Doctor Search & Slot Calculation** | [patientController.js](file:///e:/Health_Appointment/server/src/controllers/patientController.js#L50-L140) | Dynamic slot generation based on doctor working hours and slot duration, filtering out booked slots, leave days, and past times for same-day bookings. | **VERIFIED WORKING** |
| **Appointment Booking Pipeline** | [patientController.js](file:///e:/Health_Appointment/server/src/controllers/patientController.js#L143-L510) | Multi-step booking process with input validation, AI pre-visit triaging, database transaction guard, `.ics` email attachment generation, and Google Calendar API sync. | **VERIFIED WORKING** |
| **AI Pre-Visit Symptom Triaging** | [llmService.js](file:///e:/Health_Appointment/server/src/services/llmService.js#L10-L58) | OpenAI API prompt extraction of `urgencyLevel` (`LOW`, `MEDIUM`, `HIGH`), chief complaint, and 3 suggested doctor questions with offline fallback defaults. | **VERIFIED WORKING** |
| **AI Post-Visit Summary Generation** | [llmService.js](file:///e:/Health_Appointment/server/src/services/llmService.js#L60-L83) | Converts raw clinical notes into patient-friendly instructions with medication schedules via OpenAI API with fallback logic. | **VERIFIED WORKING** |
| **Admin Doctor Management & Leave System** | [adminController.js](file:///e:/Health_Appointment/server/src/controllers/adminController.js#L27-L146) | Admin doctor account creation, single-day leave marking with automatic conflicting appointment cancellation and patient email dispatch. | **VERIFIED WORKING** |
| **Doctor Clinical Notes & Prescription Submission** | [doctorController.js](file:///e:/Health_Appointment/server/src/controllers/doctorController.js#L38-L91), [DoctorDashboard.jsx](file:///e:/Health_Appointment/client/src/pages/doctor/DoctorDashboard.jsx#L241-L439) | Complete visit workflow allowing doctors to record notes, diagnosis, multiple medicines, follow-up instructions, and auto-generate AI summaries. | **VERIFIED WORKING** |
| **Patient Appointment Cancellation** | [patientController.js](file:///e:/Health_Appointment/server/src/controllers/patientController.js#L534-L598) | Patient-initiated cancellation with Google Calendar event cleanup and email notification. | **VERIFIED WORKING** |
| **Medication Reminder API** | [medicationController.js](file:///e:/Health_Appointment/server/src/controllers/medicationController.js) | Full RESTful CRUD operations (`POST`, `GET`, `PUT /toggle`, `DELETE`) for medication reminder rules in PostgreSQL database. | **VERIFIED WORKING** |
| **ICS Calendar Invite Generation** | [calendarService.js](file:///e:/Health_Appointment/server/src/utils/calendarService.js) | Formats standard `.ics` iCalendar text files attached to booking emails. | **VERIFIED WORKING** |

---

## 2. Non-Working, Stubbed, Incomplete, or Mocked Systems

### A. Empty & Stubbed Source Files (0-byte Files)

The following files exist in the file tree but are completely empty (0 bytes). Their intended functionality has either been inlined into dashboard files or left unimplemented:

1. **[client/src/pages/admin/LeaveManager.jsx](file:///e:/Health_Appointment/client/src/pages/admin/LeaveManager.jsx)** (0 Bytes)
   - *Status*: **NON-WORKING / UNUSED FILE**.
   - *Impact*: Leave management was implemented directly inside `AdminDashboard.jsx`. This dedicated component file is empty.
2. **[client/src/pages/doctor/VisitNotesModal.jsx](file:///e:/Health_Appointment/client/src/pages/doctor/VisitNotesModal.jsx)** (0 Bytes)
   - *Status*: **NON-WORKING / UNUSED FILE**.
   - *Impact*: Modal for submitting post-visit clinical notes was embedded directly into `DoctorDashboard.jsx`.
3. **[client/src/pages/patient/BookingModal.jsx](file:///e:/Health_Appointment/client/src/pages/patient/BookingModal.jsx)** (0 Bytes)
   - *Status*: **NON-WORKING / UNUSED FILE**.
   - *Impact*: Booking modal form logic was merged into `PatientDashboard.jsx`.
4. **[client/src/components/Navbar.jsx](file:///e:/Health_Appointment/client/src/components/Navbar.jsx)** (0 Bytes)
   - *Status*: **NON-WORKING / UNUSED FILE**.
   - *Impact*: Header navigation is duplicated inline inside individual dashboard components rather than using a shared `Navbar` component.
5. **[client/src/components/ProtectedRoute.jsx](file:///e:/Health_Appointment/client/src/components/ProtectedRoute.jsx)** (0 Bytes)
   - *Status*: **NON-WORKING / UNUSED FILE**.
   - *Impact*: `ProtectedRoute` is defined inline in `App.jsx`, rendering this component file empty.
6. **[server/src/config/googleAuth.js](file:///e:/Health_Appointment/server/src/config/googleAuth.js)** (0 Bytes)
   - *Status*: **NON-WORKING / UNUSED FILE**.
   - *Impact*: Google OAuth client helper was declared directly in `authController.js` and `services/calendarService.js`, leaving this configuration file empty.

---

### B. Incomplete Systems & Architectural Flaws

1. **Untriggered BullMQ Notification Worker ([reminderWorker.js](file:///e:/Health_Appointment/server/src/workers/reminderWorker.js))**
   - *Issue*: `reminderWorker.js` defines a BullMQ `Worker` and `Queue` for `notificationQueue`. However, no controller or service in the backend ever calls `notificationQueue.add(...)`.
   - *Status*: **INCOMPLETE / UNUSED BACKGROUND WORKER**.
   - *Remediation*: Controllers (`bookAppointment`, `markDoctorLeave`, `cancelAppointment`) send emails synchronously via Nodemailer instead of queuing background jobs.

2. **Missing Medication Reminder Dispatcher / Cron Scheduler**
   - *Issue*: Medication reminders created via `POST /api/medications` are stored in PostgreSQL (`MedicationReminder` table), but there is no background daemon, cron job, or worker process to periodically check active reminders and dispatch emails or push notifications at the configured `reminderTimes`.
   - *Status*: **INCOMPLETE SYSTEM**.
   - *Impact*: Patients can create reminders in the DB, but will not receive automated reminder emails when the time arrives.

3. **Hardcoded API Endpoint URL in Frontend ([PatientDashboard.jsx:L86](file:///e:/Health_Appointment/client/src/pages/patient/PatientDashboard.jsx#L86))**
   - *Issue*: The `saveMedicationReminder` function uses a raw `fetch('http://localhost:5000/api/medications', ...)` call instead of the centralized `API` Axios instance (`../../api/axios`).
   - *Status*: **FLAWED IMPLEMENTATION**.
   - *Impact*: Ignores `VITE_API_URL` environment variables and breaks in production/staging environments.

4. **Lack of Automatic Google OAuth Token Refresh Persistence**
   - *Issue*: When fetching Google Calendar auth credentials in `services/calendarService.js`, the OAuth2 client is initialized with `access_token` and `refresh_token`. However, if Google refreshes the access token during API requests, the updated access token is not saved back to the `GoogleToken` database table.
   - *Status*: **PARTIAL IMPLEMENTATION / EDGE CASE FAILURE**.
   - *Impact*: After access token expiration (typically 1 hour), Google Calendar sync will fail unless re-authenticated by the user.

5. **Single-Day Only Doctor Leave Interface**
   - *Issue*: `DoctorLeave` database model supports date ranges (`startDate` and `endDate`), but `adminController.js` (`markDoctorLeave`) and `AdminDashboard.jsx` UI only accept a single `date` input, hardcoding `endDate` to the same day's 23:59:59.
   - *Status*: **PARTIALLY IMPLEMENTED FEATURE**.
   - *Impact*: Admins cannot mark multi-day leave ranges in a single request.
