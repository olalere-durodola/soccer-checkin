# Team Sorting Design

**Date:** 2026-04-02
**Status:** Approved

---

## Overview

Automatically assign players checking in to Yellow or Orange teams based on arrival order. The first 20 players are split evenly: odd positions go to Orange, even positions go to Yellow. Players arriving after position 20 receive no team assignment.

---

## Data Model

Add a `team` field to the `Checkin` interface in `src/types.ts`:

```ts
export interface Checkin {
  id: string
  eventId: string
  firstName: string
  lastName: string
  fullName: string
  timestamp: Date
  coords: { lat: number; lng: number }
  team: 'yellow' | 'orange' | null   // null for positions > 20
}
```

The field is written to Firestore at check-in time and stored permanently on the document.

---

## Check-in Write Flow (`src/pages/CheckIn.tsx`)

After the existing duplicate check (step 4), before writing the check-in document:

1. Query total checkin count for the event: `getDocs(query(collection(db, 'checkins'), where('eventId', '==', selectedEvent.id)))`
2. Compute `position = snapshot.size + 1`
3. Assign team:
   - `position <= 20` and `position % 2 !== 0` → `'orange'`
   - `position <= 20` and `position % 2 === 0` → `'yellow'`
   - `position > 20` → `null`
4. Include `team` in the Firestore `addDoc` call
5. Store `team` in `localStorage` alongside the existing confirmation data (`StoredCheckin`)

**Error handling:** If the count query fails, surface "Could not verify your check-in status, please try again" (same as the existing duplicate check failure) and block submission.

**Race condition:** Two simultaneous submissions could receive the same position and the same team. This is an accepted risk for a small trusted team (consistent with existing accepted risks in the v1 spec).

---

## Player Confirmation Screen (`src/pages/CheckIn.tsx`)

The `confirmed` state and `StoredCheckin` interface gain a `team` field.

- **Positions 1–20:** Show team below the name/time line:
  - Orange: "🟠 You're on the Orange team"
  - Yellow: "🟡 You're on the Yellow team"
- **Positions 21+:** No team line shown. Confirmation screen unchanged from current behavior.

---

## Admin Dashboard (`src/pages/AdminDashboard.tsx`)

Replace the existing flat table in `ActiveEventSection` with a two-column split layout for the first 20 check-ins, followed by a plain list for any remaining players.

### Team columns (positions 1–20)

Two side-by-side panels:

**🟡 Yellow (up to 10)** | **🟠 Orange (up to 10)**

Each entry shows: `{arrival position}. {First} {Last} — {check-in time}`

Example:

```
🟡 Yellow (5)                    🟠 Orange (5)
─────────────────────────────    ─────────────────────────────
2.  Alice M.   — 9:02 AM         1.  Zara A.    — 9:01 AM
4.  Bob K.     — 9:04 AM         3.  Mark D.    — 9:03 AM
6.  Carol T.   — 9:06 AM         5.  Nina E.    — 9:05 AM
8.  Dana L.    — 9:08 AM         7.  Owen F.    — 9:07 AM
10. Evan P.    — 9:10 AM         9.  Paul G.    — 9:09 AM
```

### No-team list (positions 21+)

Below the two columns, a plain section: **"No team assigned (N)"** listing players as `{position}. {First} {Last} — {time}`.

### Count summary

The existing `"{N} checked in"` line stays above the team layout.

---

## Export

### CSV (`src/utils/export.ts`)

Header: `#,First Name,Last Name,Team,Time`

Team values: `Yellow`, `Orange`, or empty string for null.

### PDF (`src/utils/export.ts`)

Add a `Team` column between Last Name and Time. Show `Yellow`, `Orange`, or blank. Adjust x-positions of existing columns to fit.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `team` field to `Checkin` |
| `src/pages/CheckIn.tsx` | Count query, team assignment, write team to Firestore + localStorage, show team on confirmation |
| `src/pages/AdminDashboard.tsx` | Replace flat table with side-by-side team columns + no-team list |
| `src/utils/export.ts` | Add Team column to CSV and PDF exports |
| `src/utils/export.test.ts` | Update tests for new Team column |

---

## Accepted Risks

- **Race condition on team assignment:** Two simultaneous submissions can receive the same position → same team. Accepted for a small trusted team.
- **Team cap not enforced:** Nothing prevents a team from exceeding 10 players if a race condition occurs. Accepted for v1.
