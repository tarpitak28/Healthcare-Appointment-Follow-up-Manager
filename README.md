# Healthcare Appointment & Full-Stack Management Platform

A robust healthcare management platform featuring separate portals for Patients, Doctors, and Admins. It includes AI-powered pre-visit symptom analysis, automated post-visit summaries, conflict-free appointment booking, email notifications, and Google Calendar synchronization.

---

## Features & Scope of Work
- **Role-Based Portals:** Admin, Doctor, and Patient authentication using JWT.
- **Admin Portal:** Manage doctor profiles, specialisations, working hours, slot durations, and mark doctor leave days with automated conflict resolution.
- **Patient Portal:** Search doctors by specialisation, view available live slots, fill symptom forms, and book appointments securely.
- **AI-Powered Summaries:**
	- **Pre-visit:** Automatically analyzes patient symptoms to output Urgency Level (Low/Medium/High), chief complaint, and 3 suggested questions for the doctor.
	- **Post-visit:** Converts doctor clinical notes into patient-friendly summaries and follow-up schedules.
- **Concurrency Protection:** Prevents double-booking using Prisma interactive transactions.
- **Calendar & Notifications:** Google Calendar OAuth 2.0 integration and Nodemailer email notifications with background job retry logic (BullMQ).

---

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** PostgreSQL with Prisma ORM
- **AI:** OpenAI API (`gpt-3.5-turbo`) with fallback handlers
- **Queue/Workers:** BullMQ, Redis
- **Integrations:** Nodemailer, Google Calendar API (OAuth 2.0)

---

## Setup Guide & Installation

1. **Clone the repository & install dependencies:**
	 ```bash
	 git clone <repository-url>
	 cd healthcare-platform
	 cd server && npm install
	 ```
