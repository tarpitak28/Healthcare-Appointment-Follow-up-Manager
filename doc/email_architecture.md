# HealthPulse — Detailed Transactional Email & Notification Architecture

This document provides an exhaustive specification of the HealthPulse transactional email architecture, end-to-end event flows across Admin, Doctor, and Patient personas, error classification, retry mechanics, template registries, and AI safety guardrails.

---

## 1. Architectural Overview & Separation of Concerns

The transactional email subsystem is designed as an **asynchronous notification engine** decoupled from core business transactions. Database operations (booking, cancellation, leave enforcement) commit atomically first and return HTTP responses immediately without waiting for external email network calls.

```text
Business Operation
       │
       ▼
Database Transaction (Prisma / PostgreSQL)
       │
       ├── SUCCESS → HTTP Response (201 Created / 200 OK)
       │
       ▼
Notification Event (createAndSendNotification)
       │
       ▼
NotificationLog (eventKey Idempotency Lock)
       │
       ▼
Nodemailer Pooled SMTP Transport (Gmail / Custom Host)
       │
 ┌─────┴──────┐
 ▼            ▼
SUCCESS      FAILURE
 │            │
 ▼            ▼
SENT       Classify Error
              │
       ┌──────┴──────┐
       ▼             ▼
   Permanent      Transient
  (SMTP 5xx)     (SMTP 4xx / Timeout)
       │             │
       ▼             ▼
      DEAD         FAILED
 (DLQ: No Retry)     │
                     ▼
                 Cron Worker (every 1 min)
                     │
                     ▼
             SENT / FAILED / DEAD
```

---

## 2. Personas & Email Flow Matrix

| Persona | Email Purpose | Event Key Format | Template Key |
| :--- | :--- | :--- | :--- |
| **Patient** | Booking Confirmation | `<appointmentId>:PATIENT_CONFIRMATION` | `bookingConfirmation` |
| **Doctor** | Booking Notification | `<appointmentId>:DOCTOR_CONFIRMATION` | `bookingConfirmation` |
| **Patient** | Appointment Cancellation | `<appointmentId>:PATIENT_CANCELLATION` | `appointmentCancellation` |
| **Doctor** | Appointment Cancellation | `<appointmentId>:DOCTOR_CANCELLATION` | `appointmentCancellation` |
| **Patient** | Doctor Leave Conflict Alert | `<appointmentId>:DOCTOR_LEAVE_CANCELLATION` | `doctorLeaveConflict` |
| **Patient** | 24-Hour & 1-Hour Reminder | `<appointmentId>:24H_REMINDER` | `appointmentReminder` |
| **Patient** | AI Post-Visit Care Summary | `<appointmentId>:POST_VISIT_SUMMARY` | `clinicalSummary` |
| **Patient** | Daily Medication Reminder | `<reminderId>:<date>:<time>:MEDICATION_REMINDER` | `medicationReminder` |
| **Doctor** | Password Reset OTP | `<userId>:<timestamp>:DOCTOR_OTP` | `doctorOtpDelivery` |

---

## 3. Database Schema (`NotificationLog`)

Implemented in PostgreSQL via Prisma ORM:

```prisma
enum NotificationStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  DEAD
}

model NotificationLog {
  id              String             @id @default(uuid())
  recipientUserId String?
  appointmentId   String?
  type            String
  eventKey        String             @unique
  subject         String
  bodyText        String
  bodyHtml        String?
  status          NotificationStatus @default(PENDING)
  attempts        Int                @default(0)
  nextAttemptAt   DateTime?
  lastAttemptAt   DateTime?
  sentAt          DateTime?
  failedAt        DateTime?
  lastError       String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  recipient       User?              @relation(fields: [recipientUserId], references: [id])
  appointment     Appointment?        @relation(fields: [appointmentId], references: [id])

  @@index([status, nextAttemptAt])
  @@index([appointmentId])
}
```

---

## 4. SMTP Error Classification & Dead-Letter Queue (DLQ)

Outbound Nodemailer exceptions are evaluated to determine retryability:

### A. Permanent Unrecoverable Errors (DLQ / `dead`)
- **Triggers**: SMTP 5xx Hard Bounces (`550 User Unknown`, `553 Invalid address`), SMTP 535 Auth Errors, malformed envelope data.
- **Action**: Sets `status = 'dead'`, `nextAttemptAt = null`. Stops retries to protect domain reputation.

### B. Transient Recoverable Errors (`failed`)
- **Triggers**: SMTP 4xx Soft Bounces (`421 Host Busy`, `450 Mailbox Locked`, `451 Local Error`), Socket Timeouts (`ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`).
- **Action**: Sets `status = 'failed'`, increments `attempts`, and calculates `nextAttemptAt` using bounded exponential backoff:

$$\text{nextAttemptAt} = \text{NOW}() + \text{DelayMinutes}[\min(\text{attempts}, 4)]$$
- **Attempt 1**: +1 minute | **Attempt 2**: +5 minutes | **Attempt 3**: +15 minutes | **Attempt 4**: +60 minutes
- **Attempt 5+**: Transition to `dead` (DLQ).

---

## 5. AI Safety & Clinical Summary Human Review Pipeline

When an AI post-visit care plan is generated, it passes through an automated zero-hallucination source grounding engine (`validateSourceGrounding`).

```text
Doctor Clinical Notes
         │
         ▼
Gemini 2.0 Flash (Temperature 0.2)
         │
         ▼
Zod Schema Validation (PostVisitSummarySchema)
         │
         ▼
Source Grounding Engine (validateSourceGrounding)
         │
  ┌──────┴─────────────────────────────────┐
  ▼                                        ▼
Passes Grounding Check                 Grounding Check Fails
  │                                        │
  ▼                                        ▼
needsHumanReview = false                needsHumanReview = true
  │                                        │
  ▼                                        ▼
Notification Service Dispatches          Hold Dispatch (Doctor Dashboard
Clinical Summary Email                   Review Modal Required)
```

If `needsHumanReview = true`, the system suppresses automatic email dispatch to the patient until the doctor manually reviews and approves the care summary on their dashboard.

---

## 6. Pooled Nodemailer Transport Setup (`emailService.js`)

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  pool: true, // Persistent TCP Connection Pooling
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

---

## 7. Master Event Registry (`notificationService.js`)

All notification dispatches are routed through a master event registry ensuring strict DTO sanitization and preventing sensitive field exposure (passwords, JWTs, OAuth tokens):

```javascript
const notificationRegistry = {
  BOOKING_CONFIRMATION: { retryable: true, priority: 'HIGH' },
  APPOINTMENT_CANCELLATION: { retryable: true, priority: 'CRITICAL' },
  DOCTOR_LEAVE_CANCELLATION: { retryable: true, priority: 'CRITICAL' },
  POST_VISIT_SUMMARY: { retryable: true, priority: 'NORMAL' },
  MEDICATION_REMINDER: { retryable: true, priority: 'NORMAL' },
};
```
