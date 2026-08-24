# HealthCare Hub — Detailed Frontend Architecture & UI Workflow Documentation

This document provides a comprehensive specification of the frontend architecture, design system, component hierarchy, patient portal workflow, real-time background sync engine, AI component rendering, and Google Calendar / `.ics` integration for the **Healthcare Appointment & Follow-Up Manager**.

---

## 1. Design System & Technology Stack

### Core Technologies
- **UI Library**: React 18 (Vite build engine)
- **Styling Framework**: TailwindCSS with custom typography, glassmorphism panels, and micro-animations
- **Fonts**: Google Fonts `Outfit` (headings & titles) and `Inter` (body typography & interactive inputs)
- **HTTP Client**: Axios with centralized authorization interceptor (`/api/axios.js`)
- **Routing & RBAC**: React Router v6 with `ProtectedRoute` role guard (`PATIENT`, `DOCTOR`, `ADMIN`)

### UI Aesthetics & Principles
Inspired by modern e-commerce platforms (Amazon / Flipkart), the application implements:
- **E-Commerce Tab Navigation**: Clear separation of user intent into distinct top-level tabs.
- **Glassmorphism Panels**: Semi-transparent dark/light panels with backdrop blur (`backdrop-blur-md`).
- **Interactive Feedback**: Instant button scale effects, active focus rings (`ring-4 ring-indigo-500`), and live badge indicators.
- **Color-Coded Status Pills**:
  - `BOOKED`: Emerald (`bg-emerald-100 text-emerald-800`)
  - `COMPLETED`: Blue (`bg-blue-100 text-blue-800`)
  - `CANCELLED`: Red (`bg-red-100 text-red-800`)

---

## 2. Component Hierarchy & Architecture

```text
src/
├── main.jsx                       # Application entry point
├── App.jsx                        # React Router & AuthProvider configuration
├── context/
│   └── AuthContext.jsx            # Centralized authentication & user token state
├── api/
│   └── axios.js                   # Axios instance with Bearer token header injection
├── utils/
│   └── calendar.js                # Google Calendar URL builder & .ics file generator
└── pages/
    ├── Login.jsx                  # One-Click Demo Login & Glassmorphic authentication
    ├── Register.jsx               # Patient self-registration portal
    ├── patient/
    │   └── PatientDashboard.jsx   # Patient portal (Booking, History, Reminders, Profile)
    ├── doctor/
    │   └── DoctorDashboard.jsx    # Doctor portal (Consultations, AI Pre-Visit, Prescriptions)
    └── admin/
        └── AdminDashboard.jsx     # Admin portal (Leave Manager, Doctor Directory, Audit Log)
```

---

## 3. Patient Portal Detailed Workflow (`PatientDashboard.jsx`)

The Patient Portal is structured into 4 interactive tabs:

### Tab 1: 🩺 Book Appointment (3-Step Booking Engine)
1. **Step 1: Specialist Doctor Selection**:
   - Displays a responsive card grid of all registered doctors.
   - Shows specialization badges (`👨‍⚕️ General Cardiology`, `General Physician`), slot duration (e.g. `30 mins`), and operating hours.
   - Clicking a doctor highlights their card with a bold indigo ring (`ring-2 ring-indigo-200`) and fetches available time slots.

2. **Step 2: Interactive Date & Slot Grid**:
   - Date picker enforces minimum date of `TODAY` (`min={todayStr}`).
   - Automatically filters out past time slots if the selected date is today.
   - Slot buttons feature instant client-side active selection (`bg-indigo-600 ring-4 scale-105`) and trigger a 5-minute ephemeral slot hold on the backend.
   - Displays warning banner if doctor is on leave (`⚠️ Doctor is on leave on this date`).

3. **Step 3: Pre-Visit Symptoms Form & Booking Submit**:
   - Textarea for patient to describe symptoms prior to booking.
   - Submitting triggers background AI pre-visit analysis, generating urgency level (`LOW`, `MEDIUM`, `HIGH`), chief complaint, and suggested diagnostic questions for the doctor.

---

### Tab 2: 📅 My Appointments (Consultation History & Care Plans)
- **Status Filter Tabs**: Quick filter buttons (`ALL`, `BOOKED`, `COMPLETED`, `CANCELLED`).
- **AI Urgency Badge**: Renders AI pre-visit urgency level and chief complaint.
- **AI Post-Visit Summary & Care Plan**: Formatted card displaying doctor's findings, patient-friendly explanation, and follow-up review steps.
- **Digital Prescription & Medication Reminder Trigger**:
  - Displays prescribed medicines table (Name, Dosage, Frequency, Duration).
  - Clicking **"🔔 Set Reminder"** opens a modal to configure daily dosage times and date ranges.
- **Calendar Integration Bar**:
  - **"📅 Add to Google Calendar"**: Opens pre-filled Google Calendar web URL in new tab.
  - **"📥 Download .ics Invite"**: Generates and downloads standard iCalendar `.ics` file.
  - **"Cancel Appointment"**: Prompts confirmation and cancels booking with instant slot release.

---

### Tab 3: 💊 Medication Reminders
- Lists all active medication reminder schedules.
- Displays dosage, schedule times (e.g. `09:00, 21:00`), start date, end date, and `ACTIVE` status pills.

---

### Tab 4: 👤 My Profile
- Form to edit patient name and email address.

---

## 4. Doctor Portal Detailed Workflow (`DoctorDashboard.jsx`)

1. **Patient Consultations Tab**:
   - Lists scheduled patient appointments sorted by date/time.
   - **AI Pre-Visit Assessment Card**: Displays patient symptoms alongside AI-generated urgency badge (`LOW` green, `MEDIUM` amber, `HIGH` red), chief complaint, and 3 suggested diagnostic questions to assist the physician during consultation.

2. **Active Visit Notes & Prescription Tab**:
   - **Diagnosis**: Input diagnosis (e.g., *Acute Typhoid Fever*).
   - **Clinical Notes**: Detailed medical observations.
   - **Dynamic Medicine Prescriber**: Add/remove medicines with fields for Name, Dosage, Frequency, and Duration.
   - **Follow-Up Instructions**: Custom follow-up instructions.
   - Submitting triggers the zero-hallucination AI post-visit summary pipeline.

---

## 5. Admin Portal Detailed Workflow (`AdminDashboard.jsx`)

1. **System Overview Stats**: Live counters for Registered Doctors, Active Bookings, and Total System Appointments.
2. **Doctor Leave Management Tab**:
   - Select doctor profile, start date, and end date.
   - Submitting leave automatically cancels overlapping patient bookings and dispatches priority cancellation email alerts to affected patients.
3. **Registered Doctors Directory Tab**: Directory of all registered doctors with specializations and slot configurations.
4. **All Appointments Tab**: Global audit log of all system appointments with status filters.

---

## 6. Real-Time Automated Frontend Syncing Engine

To ensure frontend state stays synchronized across concurrent browser windows without manual page reloads:

```javascript
useEffect(() => {
  fetchDoctors();
  fetchAppointments();
  fetchMedicationReminders();

  // Real-Time Automated Background Sync (polls every 10 seconds)
  const syncInterval = setInterval(() => {
    fetchAppointments();
    fetchMedicationReminders();
  }, 10000);

  return () => clearInterval(syncInterval);
}, []);
```

- **Patient Dashboard**: Auto-polls appointments and reminders every 10 seconds.
- **Doctor Dashboard**: Auto-polls incoming patient appointments and AI symptom summaries every 10 seconds.
- **Admin Dashboard**: Auto-polls doctor status and booking logs every 10 seconds.

---

## 7. Google Calendar & .ics File Integration

```javascript
// client/src/utils/calendar.js
export function getGoogleCalendarUrl(doctorName, appointmentDate, startTime, endTime, symptoms) {
  const dateStr = new Date(appointmentDate).toISOString().split('T')[0];
  const startIso = `${dateStr.replace(/-/g, '')}T${startTime.replace(':', '')}00Z`;
  const endIso = `${dateStr.replace(/-/g, '')}T${endTime.replace(':', '')}00Z`;
  
  const title = encodeURIComponent(`Medical Consultation: Dr. ${doctorName}`);
  const details = encodeURIComponent(`HealthPulse Appointment\nSymptoms: ${symptoms || 'General'}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
}
```
