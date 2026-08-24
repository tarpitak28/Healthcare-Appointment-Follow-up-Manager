# HealthPulse — Transactional Email & Notification Architecture Specification

This document outlines the transactional email architecture, error classification, Dead-Letter Queue (DLQ), idempotency guarantees, and background retry worker implemented in the **HealthPulse** application.

---

## 1. Architectural Overview & Design Principles

```text
       ┌─────────────────────────────────────────────────────────────────┐
       │                     REST API Controllers                        │
       │ (Appointment, Auth, Admin, Doctor, Clinical, Leave Controllers) │
       └────────────────────────────────┬────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────┐
       │             Notification Service (Idempotency Engine)           │
       │    - Checks eventKey uniqueness in NotificationLog Table       │
       │    - Creates PENDING record with nextAttemptAt = NOW()         │
       └────────────────────────────────┬────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────┐
       │               Nodemailer Pooled SMTP Transport                  │
       │       (Gmail App Passwords / Standard SMTP Connection Pool)     │
       └──────────────────┬─────────────────────────────┬────────────────┘
                          │                             │
               (SMTP 250 Success)             (SMTP 4xx / 5xx Failure)
                          │                             │
                          ▼                             ▼
                ┌──────────────────┐          ┌──────────────────┐
                │ Mark status=SENT │          │ Error Classifier │
                └──────────────────┘          └─────────┬────────┘
                                                        │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         │                                                             │
                         ▼                                                             ▼
           (SMTP 5xx / Auth / Format Error)                               (SMTP 4xx / Network Timeout)
                         │                                                             │
                         ▼                                                             ▼
         ┌────────────────────────────────┐                            ┌────────────────────────────────┐
         │     Dead-Letter Queue (DLQ)    │                            │    Scheduled Retry Queue       │
         │  - status = 'dead'             │                            │  - status = 'failed'           │
         │  - nextAttemptAt = null        │                            │  - nextAttemptAt = NOW + 2^N m │
         └────────────────────────────────┘                            └───────────────┬────────────────┘
                                                                                       │
                                                                                       ▼
                                                                      ┌────────────────────────────────┐
                                                                      │   Background Cron Worker (1m)  │
                                                                      │   (processNotificationRetries) │
                                                                      └────────────────────────────────┘
```

---

## 2. Core Implementation Files

| Layer / Service | File Path | Responsibilities |
| :--- | :--- | :--- |
| **Nodemailer SMTP Transporter** | [`server/src/utils/emailService.js`](file:///e:/Health_Appointment/server/src/utils/emailService.js) | Pooled SMTP transport creation, socket timeout bounds, and live message dispatching. |
| **Notification Idempotency Engine** | [`server/src/services/notificationService.js`](file:///e:/Health_Appointment/server/src/services/notificationService.js) | Idempotent `eventKey` registration, database logging, error classification, and bounded retries. |
| **Background Cron Retry Worker** | [`server/src/services/cronService.js`](file:///e:/Health_Appointment/server/src/services/cronService.js) | Executes every minute (`* * * * *`) calling `processNotificationRetries()`. |
| **Database Schema** | `NotificationLog` in Prisma ORM | Stores log records tracking `recipientUserId`, `type`, `eventKey`, `status`, `attempts`, `nextAttemptAt`, `lastError`. |

---

## 3. Idempotency & Database Log Schema (`NotificationLog`)

To prevent duplicate email dispatches during concurrent request execution or server retries, every notification is tagged with a unique `eventKey`:

- **Booking Confirmation (Patient)**: `<appointmentId>:PATIENT_CONFIRMATION`
- **Booking Confirmation (Doctor)**: `<appointmentId>:DOCTOR_CONFIRMATION`
- **Appointment Cancellation**: `<appointmentId>:PATIENT_CANCELLATION`
- **Doctor Leave Alert**: `<appointmentId>:DOCTOR_LEAVE_CANCELLATION`
- **Medication Reminder**: `<reminderId>:<date>:<time>:MEDICATION_REMINDER`

If a duplicate dispatch request arrives with an existing `eventKey`, the idempotency engine catches the Prisma `P2002` unique constraint violation and skips duplicate dispatching.

---

## 4. SMTP Error Classification & Retry Mechanics

When an email dispatch fails, Nodemailer error responses are classified into two distinct failure categories:

### A. Permanent Unrecoverable Failures (Dead-Letter Queue / `dead`)
- **Triggers**:
  - `SMTP 5xx` Hard Bounces (`550 User Unknown`, `553 Invalid mailbox`)
  - `SMTP 535` Authentication Errors (`Authentication credentials invalid`)
  - Malformed email address or envelope format errors
- **System Action**:
  - Sets `status = 'dead'` (or `'FAILED'` after 5 attempts).
  - Sets `nextAttemptAt = null`.
  - Halts further automated retries to protect SMTP domain reputation.

### B. Transient Recoverable Failures (`failed`)
- **Triggers**:
  - `SMTP 4xx` Soft Bounces (`421 Service Unavailable`, `450 Mailbox Busy`, `451 Local Error`)
  - Network Socket Errors (`ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`, `ENETUNREACH`)
- **System Action**:
  - Sets `status = 'failed'` (or `'PENDING'`).
  - Increments `attempts = attempts + 1`.
  - Calculates `nextAttemptAt` using bounded exponential backoff.

### Exponential Backoff Schedule Formula
$$\text{nextAttemptAt} = \text{NOW}() + \text{DelayMinutes}[\min(\text{attempts}, 4)]$$
- **Attempt 1**: +1 minute
- **Attempt 2**: +5 minutes
- **Attempt 3**: +15 minutes
- **Attempt 4**: +60 minutes
- **Attempt 5**: Final transition to `FAILED` / `dead` (max 5 attempts bounded).

---

## 5. Live Gmail SMTP Configuration (`.env`)

The project is currently configured with live Gmail SMTP using App Passwords:

```env
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_TEST_MODE=false
EMAIL_TEST_RECIPIENT=pranjalkaran2004@gmail.com

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=ktarpita@gmail.com
EMAIL_PASS=nbygfhrdisyvzvgs
EMAIL_FROM="HealthPulse Hospital <support@healthpulse.app>"
SUPPORT_EMAIL=support@healthpulse.com

SMTP_POOL=true
SMTP_MAX_CONNECTIONS=5
SMTP_MAX_MESSAGES=100
SMTP_CONNECTION_TIMEOUT=10000
SMTP_GREETING_TIMEOUT=10000
SMTP_SOCKET_TIMEOUT=15000
```
