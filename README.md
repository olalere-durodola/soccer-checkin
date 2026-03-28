# Soccer Team Check-In App

A location-based event check-in web app for soccer teams. Players tap "I Am Here" to log their arrival — the app verifies they are physically at the field before allowing check-in. Admins manage events and monitor arrivals in real time.

**Live app:** https://soccer-checkin-1e6f8.web.app

---

## How It Works

- Players open the app link on their phone, enter their name, and tap **I Am Here**
- The app checks their GPS location against the field location set by the admin
- Players within range are checked in instantly — those outside are blocked
- Admins see arrivals in real time and can export the list as CSV or PDF

---

## Player Guide

### Checking In

1. Open the app on your phone: `https://soccer-checkin-1e6f8.web.app`
2. You will see the current event name and date
3. Enter your **First Name** and **Last Name**
4. Tap **I Am Here**
5. Allow the browser to access your location when prompted
6. If you are within range of the field, you will see a confirmation screen

### Confirmation Screen

Once checked in, the app shows:
> ✓ You're checked in! [Your Name] at [time]

This screen persists if you refresh — you cannot check in twice for the same event.

### Common Issues

| Problem | Solution |
|---------|----------|
| "No active event right now" | The admin hasn't started an event yet |
| "Please allow location access to check in" | Tap Allow when the browser asks for location |
| "Your GPS signal is too weak" | Go outside or near a window and try again |
| "You are not close enough to the field" | You must be physically at the field to check in |
| "You have already checked in" | Your name was already submitted for this event |
| "Could not get your location, please try again" | GPS timed out — try again outside |

> **Tip:** If you denied location by mistake, go to your phone's Settings → browser app → Location and set it to Allow.

---

## Admin Guide

### Logging In

Go to: `https://soccer-checkin-1e6f8.web.app/admin/login`

Enter your admin email and password. Your session stays active until you log out.

---

### Creating an Event

1. Log in and click **New Event**
2. Enter the **Event Name** (e.g. "Tuesday Practice")
3. Enter the **Date**
4. Set the **Radius** — how close players must be to check in (default 15m, max 500m)
5. Find the field on the map:
   - Type an address in the **Search Address** box and click **Search**, or
   - Zoom into the map and click directly on the field
6. The circle on the map shows the check-in zone
7. Click **Activate Event**

> If another event is already active, you will be asked to confirm closing it first.

---

### Monitoring Check-Ins

The dashboard shows the active event with a live list updating in real time.

| Column | Description |
|--------|-------------|
| # | Arrival order |
| First Name | As entered by the player |
| Last Name | As entered by the player |
| Time | Arrival time |

A yellow banner appears if the live connection drops. Check-ins may be outdated until reconnected.

---

### Exporting the Check-In List

Available on both active and past events:

- **Export CSV** — downloads a spreadsheet (opens in Excel or Google Sheets)
- **Export PDF** — downloads a formatted PDF with event name, date, and check-in list

---

### Closing an Event

1. Click **Close Event** on the dashboard
2. Confirm the prompt
3. Players will see "No active event right now"
4. The event moves to the **Past Events** list

---

### Viewing Past Events

Past events are listed on the dashboard sorted by most recent. Click any event name to view its full check-in list and export it.

---

### Logging Out

Click **Log Out** at the top right of the dashboard.

---

## Admin Management

Adding or removing admins requires editing Firestore directly:

- **Add admin:** [Firebase Console](https://console.firebase.google.com) → Firestore → `admins` collection → New document → Document ID = admin's email, field `email` = same email
- **Remove admin:** Delete the document with their email as the document ID

---

## Technical Notes

- GPS check-in radius: default 15m, minimum 10m, maximum 500m
- GPS accuracy must be ≤ 50m for check-in to proceed
- Only one event can be active at a time
- Two players with identical first and last names cannot both check in (first one wins)
- Clearing browser storage allows re-submission — accepted risk for a trusted team
