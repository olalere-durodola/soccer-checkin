# Team Sorting Design

**Date:** 2026-04-02
**Status:** Approved

---

## Overview

Automatically assign players checking in to Yellow or Orange teams based on arrival order. The first 20 players are split evenly: odd positions go to Orange, even positions go to Yellow. Players arriving after position 20 receive no team assignment.

---

## Data Model

Add a `team` field to the `Checkin` interface in `src/types.ts`. Full updated interface:

```ts
export interface Checkin {
  id: string
  eventId: string
  firstName: string
  lastName: string
  fullName: string      // "firstname lastname" lowercased, for duplicate detection — unchanged
  timestamp: Date
  coords: { lat: number; lng: number }
  team?: 'yellow' | 'orange' | null  // optional for backward compat with pre-feature documents
}
```

`team` is TypeScript-optional (`?`) so that Firestore documents written before this feature (which lack the field) are handled gracefully. Treat `undefined` the same as `null` throughout the app (no team shown).

---

## Check-in Write Flow (`src/pages/CheckIn.tsx`)

The existing flow has inline step comments (1: geolocation, 2: geofence, 4: duplicate check, 5: write, 6: localStorage). Insert the team assignment between step 4 and step 5 as a new step 4b.

**New step 4b — server-side count and team assignment:**

1. Use Firestore's `getCountFromServer` to get the total checkin count for the event without downloading document payloads:
   ```ts
   import { getCountFromServer } from 'firebase/firestore'
   const countSnap = await getCountFromServer(query(collection(db, 'checkins'), where('eventId', '==', selectedEvent.id)))
   const position = countSnap.data().count + 1
   ```
   At this point, the current player's checkin has not yet been written, so `count` reflects all prior successful check-ins only. `position` is therefore the current player's 1-based arrival position.

2. Assign team:
   - `position <= 20` and `position % 2 !== 0` → `'orange'`
   - `position <= 20` and `position % 2 === 0` → `'yellow'`
   - `position > 20` → `null`

3. If the count query fails, surface "Could not verify your check-in status, please try again" (same message as the duplicate check failure) and block submission.

**Step 5 — write:** Include `team` in the Firestore `addDoc` call alongside existing fields.

**Step 6 — localStorage:** Add `team` to the `StoredCheckin` interface and include it in the value written to `localStorage`.

**Race condition:** Two simultaneous submissions can both read the same count → same position → same team. Accepted risk for a small trusted team (consistent with existing accepted risks).

---

## localStorage Backward Compatibility

`CheckIn.tsx` reads from `localStorage` in a `useEffect` to restore the `confirmed` state for returning visitors. Records written before this feature will not have a `team` key. When parsing the stored object, treat a missing or `undefined` `team` value as `null` — no team line is shown on the confirmation screen.

The `StoredCheckin` interface (local to `CheckIn.tsx`) gains an optional `team` field:

```ts
interface StoredCheckin {
  eventId: string
  fullName: string
  firstName: string
  lastName: string
  time: string
  team?: 'yellow' | 'orange' | null
}
```

---

## Player Confirmation Screen (`src/pages/CheckIn.tsx`)

- **`team === 'orange'`:** Show "🟠 You're on the Orange team" below the name/time line.
- **`team === 'yellow'`:** Show "🟡 You're on the Yellow team" below the name/time line.
- **`team === null` or `undefined`:** No team line shown. Confirmation screen unchanged from current behavior.

---

## `useCheckins` Hook (`src/hooks/useCheckins.ts`)

Add `team` to the Firestore document mapping inside `onSnapshot`:

```ts
team: data.team ?? null,
```

This ensures `team` is always `'yellow' | 'orange' | null` in the returned array (never `undefined`). The existing sort by `timestamp` ascending is unchanged — arrival position in the sorted array (index + 1) will typically match the team-assignment position stored at write time, subject to the same race condition caveat noted above.

---

## Admin Dashboard (`src/pages/AdminDashboard.tsx`)

Replace the existing `<table>` in `ActiveEventSection` with a two-column split layout for the first 20 check-ins, followed by a plain no-team list for any remaining players.

### Empty state

When `checkins.length === 0`, render a single full-width centered `<div>` with the text "No check-ins yet" in place of both team columns and the no-team list:

```html
<div style="text-align: center; color: #999; padding: 16px">No check-ins yet</div>
```

### Team columns (positions 1–20)

Two side-by-side `<div>` panels (flex row, gap). Yellow panel on the left, Orange on the right. Only render a panel if there is at least one player in it.

Each entry: `{position}. {First} {Last} — {time}`

Example:

```
🟡 Yellow (5)                    🟠 Orange (5)
2.  Alice M.   — 9:02 AM         1.  Zara A.    — 9:01 AM
4.  Bob K.     — 9:04 AM         3.  Mark D.    — 9:03 AM
6.  Carol T.   — 9:06 AM         5.  Nina E.    — 9:05 AM
```

Yellow panel background: `#fef9c3`. Orange panel background: `#fff7ed`.

### No-team list (positions 21+)

Only render this section when `checkins.length > 20`. Label: `"No team assigned ({N})"` where N = `checkins.length - 20`. List each player as `{position}. {First} {Last} — {time}`.

### Count summary

The existing `"{N} checked in"` line stays above the team layout, unchanged.

---

## Export

### CSV (`src/utils/export.ts`)

New header: `#,First Name,Last Name,Team,Time`

Each row: `{i+1},{firstName},{lastName},{teamLabel},{time}`

Where `teamLabel`:
- `'yellow'` → `Yellow`
- `'orange'` → `Orange`
- `null` or `undefined` → empty string

### PDF (`src/utils/export.ts`)

Add a `Team` column between Last Name and Time. The Last Name column shifts left from x=74 to x=64 (deliberate, to make room for Team). Updated x-positions for all columns:

| Column | x (was) | x (new) |
|--------|---------|---------|
| # | 14 | 14 |
| First Name | 24 | 24 |
| Last Name | 74 | 64 |
| Team | — | 104 |
| Time | 124 | 144 |

Show `Yellow`, `Orange`, or blank for the team value.

---

## Export Tests (`src/utils/export.test.ts`)

Update existing assertions for the new header and row format. Use `toContain` for time-dependent portions to avoid locale/timezone sensitivity.

Required test cases:

1. **Header** — CSV header line equals `#,First Name,Last Name,Team,Time`
2. **Yellow row** — checkin with `team: 'yellow'` produces a row containing `,Yellow,`
3. **Orange row** — checkin with `team: 'orange'` produces a row containing `,Orange,`
4. **Null team row** — checkin with `team: null` produces a row where the team column is empty (e.g. `toContain(',,')` between last name and time, or assert the team field is blank)
5. **Undefined team row** — checkin with `team: undefined` also produces an empty team column (backward compat)

---

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add optional `team` field to `Checkin` |
| `src/hooks/useCheckins.ts` | Map `team` field from Firestore; default to `null` |
| `src/pages/CheckIn.tsx` | Count query (`getCountFromServer`), team assignment, write team to Firestore + localStorage, show team on confirmation, handle missing `team` in localStorage reads |
| `src/pages/AdminDashboard.tsx` | Replace flat table with side-by-side team panels + no-team list + updated empty state |
| `src/utils/export.ts` | Add Team column to CSV and PDF exports; adjust PDF x-positions |
| `src/utils/export.test.ts` | Update header/row assertions; add team value test cases |

---

## Accepted Risks

- **Race condition on team assignment:** Two simultaneous submissions can receive the same position → same team. Accepted for a small trusted team.
- **Team cap not enforced:** Nothing prevents a team from exceeding 10 players if a race condition occurs. Accepted for v1.
- **Timestamp ordering:** `useCheckins` sorts by `timestamp` ascending. Near-simultaneous writes may have identical or out-of-order server timestamps, so displayed position may differ slightly from stored team-assignment position. Accepted for v1.
