# System Design Architecture Write-Up

## 1. System Overview & Architecture
The Healthcare Appointment & Follow-up Manager is built on a decoupled, three-tier architecture comprising a React (Vite/TailwindCSS) SPA frontend, a Node.js/Express REST API backend, and a PostgreSQL database managed via Prisma ORM. Asynchronous background workloads, such as medication reminders and email notification retries, are managed using a Redis-backed BullMQ queue.

---

## 2. Double-Booking Prevention & Concurrency Protection
Preventing simultaneous double-booking of doctor time slots is a critical requirement in healthcare scheduling.

### Database Constraints & Indexing
To enforce structural uniqueness at the database level, the `Appointment` model uses a composite index over `[doctorProfileId, appointmentDate, startTime]`.

### Transaction Isolation & Row-Level Locking
When a patient submits a booking request:
1. An interactive transaction (`prisma.$transaction`) is initiated.
2. The transaction queries the database for existing `BOOKED` appointments matching the `doctorProfileId`, `appointmentDate`, and `startTime`.
3. If an active booking already exists, the transaction aborts with a `400 Conflict` response (`"This time slot is already booked. Please choose another slot."`).
4. Only if the slot is confirmed available does the transaction issue an atomic `INSERT` statement.

This transactional guarantee ensures that even if concurrent requests hit the server simultaneously, database row lock serialization prevents duplicate bookings.

---

## 3. Doctor Leave Conflict Handling & Resolution
When an administrator marks a doctor on leave for a specific date or date range:
1. A new `DoctorLeave` record is created with `startDate` (set to `00:00:00.000`) and `endDate` (set to `23:59:59.999`).
2. The system executes a query to find all conflicting `BOOKED` appointments where:
   - `doctorProfileId == targetDoctor`
   - `appointmentDate >= startDate` and `appointmentDate <= endDate`
3. All identified conflicting appointments are updated in bulk to `CANCELLED` status (`UPDATE Appointment SET status = 'CANCELLED'`).
4. The system iterates over the cancelled appointments, retrieves patient contact details, and dispatches individual cancellation email notifications to each affected patient (`"Your appointment has been cancelled because the doctor is on leave."`).
5. When a patient subsequently queries available slots for a doctor on a leave date, the slot-fetching endpoint evaluates `DoctorLeave.findFirst` and immediately returns `{ isOnLeave: true, slots: [] }`, rendering an inline notice on the frontend booking form.

---

## 4. Slot Hold & Dynamic Availability Mechanism
To optimize patient experience without causing deadlocks or database state pollution:
- Time slots are dynamically computed in memory based on the doctor's `workingHours` (e.g., `09:00` to `17:00`) and `slotDuration` (e.g., `30` minutes).
- Active `BOOKED` slots and `DoctorLeave` ranges are queried and subtracted from the pool of generated slots.
- For same-day bookings, the server dynamically evaluates current local time and marks past time slots as unavailable (`isAvailable: false`).

---

## 5. Failure Handling & Resilience Strategy

### A. LLM Resilience (Pre-Visit & Post-Visit Summaries)
AI features (OpenAI `gpt-3.5-turbo`) are wrapped in `try-catch` fallback blocks:
- **Pre-visit Summary:** If the OpenAI API key is unconfigured, rate-limited, or fails, the service catches the exception and returns a structured fallback JSON containing a default `MEDIUM` urgency level, chief complaint extract, and three standard clinical diagnostic questions. The core appointment creation logic proceeds uninterrupted.
- **Post-visit Summary:** If the post-visit LLM summary generation fails, the system falls back to returning the doctor's original clinical notes directly.

### B. Notification Reliability & Email Retries
- **Nodemailer / SMTP Service:** Email dispatches for confirmations, cancellations, and reminders are executed inside safe asynchronous wrappers so that network or SMTP provider timeouts never abort HTTP request lifecycles.
- **BullMQ & Redis Queue:** Scheduled medication reminders and delayed email retries are enqueued into BullMQ background workers with exponential backoff retry strategies (up to 3 retries with 5-minute delays).

### C. Google Calendar Integration Failure Safety
Google Calendar OAuth 2.0 integration creates `.ics` calendar events. If a user has not linked Google OAuth credentials or the external API call fails, the system logs the event silently without blocking patient booking or doctor note submission.

---

## 6. Summary Table of Concurrency & Failure Mitigations

| Concern | Primary Defense Mechanism | Fallback / Recovery Strategy |
| :--- | :--- | :--- |
| **Double-Booking** | Transactional check + Composite DB Index | Atomic transaction rollback |
| **Doctor Leave** | Bulk status update to `CANCELLED` | Patient email notifications & slot blocking |
| **LLM Outage** | Safe `try-catch` API wrapper | Structured fallback JSON / raw notes |
| **Email Failure** | BullMQ retry queue with exponential backoff | Silent log capture + `.ics` attachment |
