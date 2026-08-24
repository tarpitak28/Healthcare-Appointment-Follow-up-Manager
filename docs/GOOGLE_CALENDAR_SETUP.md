# Google Calendar OAuth 2.0 Integration & Setup Guide

CareConnect synchronizes appointments directly with Google Calendar for both patients and doctors using the official **Google Calendar API** (`googleapis` v133.0.0).

---

## 1. Google Cloud Console Setup Instructions

### Step 1: Create a Google Cloud Project
1. Log in to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a Project > New Project**.
3. Name your project (e.g. `CareConnect Healthcare`) and click **Create**.

### Step 2: Enable Google Calendar API
1. Navigate to **APIs & Services > Library**.
2. Search for **Google Calendar API**.
3. Select **Google Calendar API** and click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** (or **Internal** if within a Google Workspace domain).
3. Fill in App Details:
   - App Name: `CareConnect Platform`
   - User Support Email: `your_email@gmail.com`
4. Add Scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Save and continue.

### Step 4: Create OAuth 2.0 Credentials
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application Type: **Web application**.
4. Name: `CareConnect Web Client`.
5. **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `https://careconect-alpha.vercel.app`
6. **Authorized redirect URIs**:
   - `http://localhost:5000/api/calendar/auth/google/callback`
   - `https://careconect-api.onrender.com/api/calendar/auth/google/callback`
7. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 2. Environment Variables Configuration

Copy your credentials to `server/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
```

---

## 3. OAuth 2.0 Authentication & Token Lifecycle

1. **Auth URL Generation** (`GET /api/calendar/auth-url`): Generates an OAuth 2.0 consent link requesting `offline` access for refresh tokens.
2. **User Consent**: The user authorizes CareConnect to access Google Calendar.
3. **Callback Handling** (`GET /api/calendar/auth/google/callback`): Exchanges authorization code for access token and refresh token.
4. **Token Persistence**: Tokens are stored in the PostgreSQL `GoogleToken` table linked to `userId`.

---

## 4. Calendar Event Actions

When an appointment state changes, `calendarService.js` automatically syncs Google Calendar:

- **Appointment Booking**: Creates a Google Calendar event for both patient and doctor with 30-minute consultation duration. Saves `calendarEventId` in `Appointment` record.
- **Doctor Leave Enforcement**: Deletes corresponding Google Calendar events for cancelled appointments overlapping leave range.
- **Appointment Cancellation**: Invokes Google Calendar API to delete event (`events.delete`).
