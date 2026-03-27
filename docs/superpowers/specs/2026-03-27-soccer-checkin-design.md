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
  radius: number (meters, default 15, min 10, max 500)
  active: boolean
  createdAt: timestamp
  closedAt: timestamp | null
```

### `checkins` collection
```
checkins/{checkinId}
  eventId: string
  firstName: string        // stored as-entered (mixed case)
  lastName: string         // stored as-entered (mixed case)
  fullName: string         // format: "firstname lastname" lowercased, for duplicate detection
  timestamp: timestamp
  coords: { lat: number, lng: number }
```

**Display note:** `firstName` and `lastName` are stored as-entered and displayed as-entered in the admin list. `fullName` is used only for duplicate detection.

---

## Player Flow

1. Player opens the shared link on their phone browser
2. App fetches the current active event from Firestore
   - If Firestore read fails (network error) → "Could not load event, please check your connection and refresh"
   - If no active event → show "No active event right now"
3. App checks localStorage for `{ eventId, fullName }`:
   - If `eventId` matches the current active event → skip to confirmation screen (no form shown)
   - If `eventId` does not match (stale entry from a past event) → ignore, show the form normally
   - If no localStorage entry → show the form
4. Player enters first name and last name
   - Both required, minimum 2 characters, maximum 50 characters each
   - Cannot be only whitespace
5. Player taps "I Am Here"
   - Button is disabled and loading indicator shown while GPS is requested
6. Browser requests GPS location
   - If denied → "Please allow location access to check in"
   - If timeout → "Could not get your location, please try again"
   - If GPS accuracy > 50m → "Your GPS signal is too weak, please try again outside or near a window"
7. App compares player GPS to event location
   - If distance > event radius → "You are not close enough to the field"
   - Note: GPS accuracy check (≤ 50m) is a best-effort filter. Due to the gap between the 50m accuracy floor and the 15m default radius, geofence enforcement is approximate. This is an accepted limitation.
8. App checks Firestore for duplicate `fullName` (format: `"firstname lastname"` lowercased) in current event
   - If query fails → block check-in, show "Could not verify your check-in status, please try again"
   - If duplicate found → "You have already checked in"
9. Check-in saved to Firestore with timestamp
   - If write fails → "Something went wrong, please try again" (localStorage is NOT updated)
10. localStorage updated with `{ eventId, fullName }`
11. Player sees: "✓ You're checked in! [First Name] [Last Name] at [time]"
    - Form is replaced by confirmation screen — cannot resubmit

### Known Limitation
If two players share the same first and last name, only the first to check in will succeed. The second will be told they already checked in. Accepted for v1.

---

## Admin Flow

### Login
- Email + password via Firebase Auth
- Session persists until explicit logout (Firebase SDK auto-refreshes tokens)
- Logout button available on all admin pages
- If token refresh fails mid-session → redirect to login page with "Your session expired, please log in again"

### Dashboard
- Shows current active event (if any) with live check-in list and "Close Event" button
- Button to create a new event
- List of past events sorted by date descending (most recent first), showing: event name, date, total check-ins, closed time

### Create Event
1. Enter event name and date (past dates allowed)
2. Open Leaflet map → click to pin the field location
3. Adjust circle radius (default 15m, min 10m, max 500m)
4. Click "Activate Event"
   - If an event is currently active: show confirmation prompt — "This will close the current active event. Continue?"
   - If fetching the current active event fails → "Could not check for active events, please try again"
   - On confirm: use a Firestore batch write to atomically deactivate old event (`active: false`, `closedAt: now`) and activate new event
   - If batch write fails → "Failed to activate event, please try again" (no partial state)

### Live Check-In List
- Real-time Firestore listener updates list without refresh
- If Firestore listener drops → show "Connection lost — check-in list may be outdated" banner
- Sorted chronologically by arrival time (earliest first)
- Columns: #, First Name, Last Name, Time

### Past Events
- Viewable from dashboard, sorted most recent first
- Clicking a past event shows its full check-in list (read-only, sorted by arrival time)
- No pagination in v1 (accepted for a soccer team season volume)

### Close Event
- Admin clicks "Close Event"
- Confirmation prompt shown: "Are you sure you want to close this event? Players will no longer be able to check in."
- On confirm: event marked `active: false`, `closedAt: now`
- Players see "No active event right now"
- List remains viewable under past events

---

## Firestore Security Rules

```javascript
// events: admin can read/write; public can read active events only
match /events/{eventId} {
  allow read: if resource.data.active == true || request.auth != null;
  allow write: if request.auth != null;
}

// checkins: unauthenticated users can create (player check-in only)
// admin can read, update, delete
// Note: allow create if !auth is intentional — players are public users.
// Admin cannot create check-ins on behalf of players in v1.
// Note: the events read rule works with filtered queries (where active == true)
// because Firestore evaluates rules per document on the filtered result set.
match /checkins/{checkinId} {
  allow create: if request.auth == null;
  allow read: if request.auth != null;
  allow update, delete: if request.auth != null;
}
```

---

## Error Handling

| Scenario | Message / Behavior |
|----------|-------------------|
| Firestore read fails on page load | "Could not load event, please check your connection and refresh" |
| GPS denied | "Please allow location access to check in" |
| GPS timeout | "Could not get your location, please try again" |
| GPS accuracy > 50m | "Your GPS signal is too weak, please try again outside" |
| Too far from field | "You are not close enough to the field" |
| No active event | "No active event right now" |
| Duplicate check query fails | "Could not verify your check-in status, please try again" (blocks submission) |
| Duplicate name found | "You have already checked in" |
| localStorage check-in for current event | Show confirmation screen immediately |
| Stale localStorage (different eventId) | Ignore, show form normally |
| Firestore write failure at check-in | "Something went wrong, please try again" (localStorage not updated) |
| Name fields blank or < 2 chars | Form validation, cannot submit |
| Name fields > 50 chars | Form validation, cannot submit |
| GPS pending after button tap | Button disabled, loading spinner shown |
| Admin: Firestore listener drops | "Connection lost — check-in list may be outdated" banner |
| Admin: batch write failure on activation | "Failed to activate event, please try again" |
| Admin: fetch fails before batch write | "Could not check for active events, please try again" |
| Admin: token refresh failure | Redirect to login — "Your session expired, please log in again" |
| Admin loses connection | Firestore offline cache syncs when reconnected |

---

## Key Rules

- Only one event can be active at a time (enforced via Firestore batch write)
- Duplicate name check: case-insensitive, format `"firstname lastname"`
- localStorage `eventId` must match current active event to trigger confirmation screen
- localStorage only updated after confirmed Firestore write
- No player login required
- Admin is the only authenticated user role
- Geofence radius: default 15m, min 10m, max 500m
- GPS accuracy must be ≤ 50m to proceed (best-effort)
- Close Event requires confirmation prompt
- Past events list sorted most recent first

---

## Accepted Risks (v1)

- **GPS spoofing:** Geofence check is client-side only. A player can spoof GPS and check in from anywhere. Accepted for a trusted soccer team.
- **GPS accuracy vs geofence gap:** The 50m accuracy floor exceeds the 15m default radius. Geofence is approximate. Accepted.
- **Same-name collision:** Two players with identical first and last names cannot both check in. Accepted for v1.
- **localStorage bypass:** Clearing browser data allows resubmission. Accepted for a trusted team.
- **No rate limiting:** A device could spam check-ins with different names. Firestore rules cannot natively rate-limit. Accepted for v1.
- **Admin cannot manually add check-ins:** No override flow exists for missed check-ins. Out of scope for v1.

---

## Out of Scope (v1)

- CSV/PDF export of check-in lists
- Player accounts or logins
- Push notifications
- Multiple admin accounts
- Offline player check-in
- Server-side geofence validation
- Rate limiting on check-in writes
- Admin manual check-in override
- Pagination on past events list
