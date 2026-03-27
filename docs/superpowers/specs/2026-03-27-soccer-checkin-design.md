# Soccer Team Event Check-In App — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Overview

A location-based event check-in web application for a soccer team of up to 75 players. Players open a shared link on their phone, enter their name, and tap "I Am Here" to log their arrival. The app verifies they are within 15 meters of the field before allowing check-in. An admin manages events, sets the field location, and monitors arrivals in real time.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (player + admin) | React (single codebase, mobile-responsive) |
| Map & perimeter drawing | Leaflet + OpenStreetMap |
| Database | Firebase Firestore |
| Authentication | Firebase Auth (admin only) |
| Hosting | Firebase Hosting |
| GPS | Browser Geolocation API |

---

## Application Routes

| Route | View | Access |
|-------|------|--------|
| `/` | Player check-in page | Public |
| `/admin` | Admin dashboard | Protected (Firebase Auth) |
| `/admin/login` | Admin login | Public |

---

## Data Model (Firestore)

### `events` collection
```
events/{eventId}
  name: string
  date: timestamp
  location: { lat: number, lng: number }
  radius: number (meters, default 15)
  active: boolean
  createdAt: timestamp
```

### `checkins` collection
```
checkins/{checkinId}
  eventId: string
  firstName: string
  lastName: string
  fullName: string (lowercase, for duplicate detection)
  timestamp: timestamp
  coords: { lat: number, lng: number }
```

---

## Player Flow

1. Player opens the shared link on their phone browser
2. App checks Firestore for an active event
   - If no active event → show "No active event right now"
3. Player enters first name and last name (both required)
4. Player taps "I Am Here"
5. Browser requests GPS location
   - If denied → "Please allow location access to check in"
   - If timeout → "Could not get your location, please try again"
6. App compares player GPS to event location
   - If > 15m away → "You are not close enough to the field"
7. App checks Firestore for duplicate full name (case-insensitive) in current event
   - If found → "You have already checked in"
8. App checks localStorage for existing check-in for current event
   - If found → show confirmation screen, no form
9. Check-in saved to Firestore with timestamp
10. localStorage updated with eventId + player name
11. Player sees: "✓ You're checked in! [Full Name] at [time]"
    - Form is replaced by confirmation — cannot resubmit

---

## Admin Flow

### Login
- Email + password via Firebase Auth
- Redirects to `/admin` on success

### Dashboard
- Shows current active event (if any) with live check-in list
- Button to create a new event
- List of past events (read-only)

### Create Event
1. Enter event name and date
2. Open Leaflet map
3. Click to pin the field location
4. Adjust circle radius (default 15m, adjustable)
5. Click "Activate Event"
   - Previous active event is automatically deactivated
   - New event becomes active immediately

### Live Check-In List
- Real-time Firestore listener updates list without refresh
- Sorted chronologically by arrival time (earliest first)
- Columns: #, First Name, Last Name, Time

### Close Event
- Admin clicks "Close Event"
- Event marked `active: false`
- Players can no longer check in
- List remains viewable

---

## Error Handling

| Scenario | Message / Behavior |
|----------|-------------------|
| GPS denied | "Please allow location access to check in" |
| GPS timeout | "Could not get your location, please try again" |
| Too far from field | "You are not close enough to the field" |
| No active event | "No active event right now" |
| Duplicate name (Firestore) | "You have already checked in" |
| localStorage check-in exists | Show confirmation screen instead of form |
| Name fields blank | Form validation, cannot submit |
| Admin loses connection | Firestore offline cache syncs when reconnected |

---

## Key Rules

- Only one event can be active at a time
- Duplicate name check is case-insensitive on full name (first + last)
- localStorage prevents resubmission per device per event
- No player login required
- Admin is the only authenticated user role
- Geofence radius default is 15 meters (adjustable per event)

---

## Out of Scope (v1)

- CSV/PDF export of check-in lists
- Player accounts or logins
- Push notifications
- Multiple admin accounts
- Offline player check-in
