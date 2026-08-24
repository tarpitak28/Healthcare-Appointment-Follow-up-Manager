# Comprehensive System Architecture, Directory Structure & Workflow Guide

> **Note for AI Assistants & Developers**: 
> This document provides the complete technical architecture and project organization blueprint of the **Healthcare Appointment & Follow-up Manager**.

---

## 1. System Overview & Core Capabilities

The **Healthcare Appointment & Follow-up Manager** is a production-hardened full-stack application built with Node.js, Express, React (Vite), PostgreSQL (Prisma ORM), Nodemailer, and Google Gemini 2.0 Flash API.

### Core Systems
1. **Concurrency-Safe Scheduling**:
   - Hard database double-booking protection via PostgreSQL partial unique index `unique_active_doctor_slot` on `("doctorProfileId", "appointmentDate", "startTime") WHERE status IN ('BOOKED', 'COMPLETED')`.
   - Ephemeral `SlotHold` system with 5-minute expiry, excluding held slots for other patients and auto-purging via a 1-minute cron worker.
2. **Gemini AI Pre-Visit Assessment**:
   - Gemini Flash API native JSON mode extracting urgency level (`LOW`, `MEDIUM`, `HIGH`), chief complaint, and diagnostic questions.
3. **Zero-Hallucination AI Post-Visit Summary & Human Review**:
   - Gemini Flash API generating patient-facing summaries from doctor clinical notes and prescriptions.
   - Source-grounding validator (`postVisitGuardrail.js`) enforcing Zod schema validation and anti-hallucination checks.
   - Un-grounded entries flag `needsHumanReview: true`, record `reviewReasons`, display a `⚠️ Pending Review` badge on doctor interface, and hide summaries from patients until doctor approval (`POST /api/doctor/appointments/:id/approve-summary`).
4. **Reliable Notification & Retry Engine**:
   - PostgreSQL `NotificationLog` table with unique `eventKey` idempotency indexing.
   - Central `notificationService.js` handling immediate delivery, soft error isolation, and 5-attempt exponential backoff retries via 1-minute cron worker.
5. **Google Calendar & ICS Sync**:
   - Offline token storage in `GoogleToken`, automatic token refresh listener, and downloadable `.ics` iCalendar attachments.

---

## 2. Directory Structure Map

```text
Health_Appointment/
├── .env                              # Active environment configuration (git-ignored)
├── .env.example                      # Production environment template with placeholders
├── .gitignore                        # Version control exclusion rules
├── package.json                      # Root workspace configuration
│
├── doc/                              # System Documentation & Release Reports
│   ├── architecture.md               # [THIS FILE] Technical architecture & directory map
│   ├── implement.md                  # Implementation phase history
│   ├── components.md                 # Component audit report
│   ├── ai_context.md                 # Master prompt & AI architectural constraints
│   ├── system_audit.md               # System status audit matrix
│   ├── production_readiness.md       # Audit findings & readiness report
│   ├── release_checklist.md          # Final release verification checklist
│   └── final_release_report.md       # Release report & final verdict
│
├── prisma/                           # Database Schema & Versioned Migrations
│   ├── schema.prisma                 # Prisma schema (User, DoctorProfile, Appointment, DoctorLeave, MedicationReminder, SlotHold, GoogleToken, NotificationLog)
│   └── migrations/                   # 7 versioned Prisma migration directories
│
├── server/                           # Express.js REST API Server
│   ├── src/
│   │   ├── app.js                    # Express app initialization, CORS hardening & sanitized error handler
│   │   ├── server.js                 # Server entrypoint with environment validation & cron initialization
│   │   ├── config/
│   │   │   ├── db.js                 # Prisma client instance singleton
│   │   │   └── env.js                # Startup environment validation layer
│   │   ├── middleware/
│   │   │   └── authMiddleware.js     # JWT token verification (401) & RBAC role checks (403)
│   │   ├── controllers/
│   │   │   ├── authController.js     # Auth & profile management
│   │   │   ├── adminController.js    # Doctor listing, leave management & conflict auto-cancellation
│   │   │   ├── patientController.js  # Doctor search, slot calculation, hold & booking pipeline
│   │   │   ├── doctorController.js   # Consultation queue, post-visit notes & summary approval
│   │   │   └── medicationController.js # Medication reminder CRUD
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # Endpoints for /api/auth/*
│   │   │   ├── adminRoutes.js        # Endpoints for /api/admin/*
│   │   │   ├── patientRoutes.js      # Endpoints for /api/patient/*
│   │   │   ├── doctorRoutes.js       # Endpoints for /api/doctor/*
│   │   │   ├── medicationRoutes.js   # Endpoints for /api/medications/*
│   │   │   └── calendarRoutes.js     # Endpoints for /api/calendar/*
│   │   ├── services/
│   │   │   ├── llmService.js         # Gemini API calls (symptom triage & summary generation)
│   │   │   ├── notificationService.js# Central notification manager & retry worker
│   │   │   ├── cronService.js        # Cron jobs (slot hold cleanup, retries, medication reminders)
│   │   │   └── calendarService.js    # Google Calendar OAuth integration
│   │   └── utils/
│   │       ├── postVisitGuardrail.js # Zod validation & source grounding anti-hallucination engine
│   │       ├── emailService.js       # Nodemailer SMTP transport dispatcher
│   │       └── calendarService.js    # Standard .ics iCalendar file builder
│   │
│   ├── run_phase5_audit.js           # Comprehensive Phase 5 system audit runner
│   ├── run_phase6_release_test.js    # Comprehensive Phase 6 release audit runner
│   └── test_clean_migration_deploy.js# Clean database migration reproduction script
│
└── client/                           # React + Vite Frontend Application
    ├── index.html                    # Single Page Application HTML root entrypoint
    ├── package.json                  # Frontend dependencies
    └── src/
        ├── main.jsx                  # React DOM entrypoint
        ├── App.jsx                   # React Router v6 & ProtectedRoute declarations
        ├── api/axios.js              # Pre-configured Axios client with bearer token interceptor
        ├── context/AuthContext.jsx   # Authentication context & token management
        └── pages/
            ├── Login.jsx             # Authentication login view
            ├── Register.jsx          # Public patient registration view
            ├── admin/AdminDashboard.jsx # Admin portal view
            ├── doctor/DoctorDashboard.jsx # Doctor portal view with Pending Review approval UI
            └── patient/PatientDashboard.jsx # Patient portal view with Connect Google Calendar action
