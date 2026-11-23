# CampusPulse frontend

React + Vite frontend for the CampusPulse event API.

## Run locally

```sh
npm install
npm run dev
```

The API URL is set in `.env.local` as `VITE_API_BASE_URL`. The frontend also defaults to `https://gun2-txy8.onrender.com` if the variable is not supplied.

## Build

```sh
npm run build
npm run preview
```

## API features

- Browse and search the event list, with category filters inferred from event titles.
- Register using an existing attendee ID and inspect registrations for that ID.
- View attendee IDs for an event using its organizer ID.

There is no sign-up, login, or authentication flow. The backend schema does not expose event descriptions, dates, venues, or a users-list endpoint, so the interface labels those details as unavailable instead of inventing them. IDs are entered directly because the backend has no authenticated identity.
