# Events & Calendar Walkthrough

## Overview
We have added a new feature to manage church events, services, and meetings. This allows you to publish a schedule and track upcoming activities.

## Changes

### Backend
- **Data Model**: Added `Event` interface and `events` array to `database.json`.
- **API Routes**: Added CRUD endpoints for `/api/events`.
- **Validation**: Added `eventSchema` for data validation.

### Frontend
- **Pages**:
    - `Events.tsx`: Displays a list of upcoming events with a visual date badge.
    - `EventDetails.tsx`: Form to create new events or edit existing ones.
- **Navigation**: Added "Events" link to the sidebar with a calendar icon.

## Verification Results

### Backend Verification
We verified the backend using a Node.js script (`c:\backend\verify_events.js`) that:
1.  Logged in as a user.
2.  Created a new "Sunday Service" event.
3.  Fetched the list of events.
4.  Updated the event title.
5.  Deleted the event.
**Result:** Success.

### Manual Verification Steps
1.  **Navigate to Events**: Click "Events" in the sidebar.
2.  **Create Event**: Click "Create Event".
    - Enter Title: "Christmas Eve Service"
    - Date: "2023-12-24"
    - Time: "18:00"
    - Type: "Service"
    - Click "Save Event".
3.  **Verify List**: Verify the event appears in the list with the correct date and details.
4.  **Edit Event**: Click on the event card to edit details.

### Auto Reminders
- **Functionality**: The system automatically checks for events starting within the next 24 hours every minute.
- **Notifications**:
    - Sends a mock Email to all relevant members.
    - Sends a mock SMS to all relevant members.
    - Supports **Custom Reminders**: You can manually add specific people (or select existing members) to receive reminders via Email or SMS.
- **Visual Indicator**: Events with sent reminders display a "REMINDER SENT" badge in the event list.
- **Verification**: Confirmed via `verify_reminders.js` that the system correctly identifies upcoming events and marks them as reminded.
