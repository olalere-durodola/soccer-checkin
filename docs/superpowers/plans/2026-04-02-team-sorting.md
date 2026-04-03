# Team Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-assign players to Yellow or Orange teams based on check-in arrival order (positions 1–20; odd → Orange, even → Yellow; 21+ → no team), visible on the player confirmation screen, admin dashboard, and exports.

**Architecture:** `team` is computed at write time using `getCountFromServer` and stored permanently on each Firestore checkin document. The player sees their team on the confirmation screen. The admin dashboard replaces the flat check-in table with side-by-side team panels. CSV and PDF exports gain a Team column.

**Tech Stack:** React, TypeScript, Firebase Firestore (`getCountFromServer`), Vitest, jsPDF

---

## File Map

| File | Change |
|------|--------|
| `src/types.ts` | Add optional `team` field to `Checkin` |
| `src/hooks/useCheckins.ts` | Map `team` from Firestore documents |
| `src/pages/CheckIn.tsx` | Count query, team assignment, write + store team, show on confirmation |
| `src/pages/AdminDashboard.tsx` | Replace flat table with team panels + no-team list |
| `src/utils/export.ts` | Add Team column to CSV and PDF |
| `src/utils/export.test.ts` | Update existing tests + add team test cases |

---

### Task 1: Add `team` to the `Checkin` type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add the field**

Open `src/types.ts`. The current `Checkin` interface ends at `coords`. Add one line after `coords`:

```ts
export interface Checkin {
  id: string
  eventId: string
  firstName: string
  lastName: string
  fullName: string
  timestamp: Date
  coords: { lat: number; lng: number }
  team?: 'yellow' | 'orange' | null
}
```

`team` is optional (`?`) so that existing Firestore documents that predate this feature (which lack the field) are valid without migration.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. (The `team` field is optional, so no existing code breaks.)

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add optional team field to Checkin type"
```

---

### Task 2: Map `team` in `useCheckins`

**Files:**
- Modify: `src/hooks/useCheckins.ts`

- [ ] **Step 1: Add `team` to the document mapping**

In `src/hooks/useCheckins.ts`, the `onSnapshot` callback maps Firestore docs to `Checkin` objects (lines 29–39). The current mapping ends with `coords: data.coords`. Add `team` after it:

```ts
return {
  id: d.id,
  eventId: data.eventId,
  firstName: data.firstName,
  lastName: data.lastName,
  fullName: data.fullName,
  timestamp: data.timestamp?.toDate() ?? new Date(),
  coords: data.coords,
  team: data.team ?? null,
}
```

`data.team ?? null` normalises missing Firestore fields (pre-feature documents) to `null`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCheckins.ts
git commit -m "feat: map team field from Firestore in useCheckins"
```

---

### Task 3: Update export — CSV

**Files:**
- Modify: `src/utils/export.ts`
- Modify: `src/utils/export.test.ts`

- [ ] **Step 1: Update the failing tests first**

Replace the entire contents of `src/utils/export.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildCsvContent } from './export'
import type { Checkin } from '../types'

const base = { id: '1', eventId: 'evt1', fullName: 'john smith', timestamp: new Date('2026-03-27T10:00:00'), coords: { lat: 51.5, lng: -0.1 } }

const mockCheckins: Checkin[] = [
  { ...base, id: '1', firstName: 'John', lastName: 'Smith', fullName: 'john smith', team: 'yellow' },
  { ...base, id: '2', firstName: 'Jane', lastName: 'Doe',   fullName: 'jane doe',   team: 'orange' },
  { ...base, id: '3', firstName: 'Bob',  lastName: 'Jones', fullName: 'bob jones',  team: null },
]

describe('buildCsvContent', () => {
  it('includes updated header row', () => {
    const csv = buildCsvContent(mockCheckins)
    expect(csv).toContain('#,First Name,Last Name,Team,Time')
  })

  it('includes yellow team label', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[1]).toContain('1,John,Smith,Yellow')
  })

  it('includes orange team label', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[2]).toContain('2,Jane,Doe,Orange')
  })

  it('leaves team blank for null', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[3]).toContain('3,Bob,Jones,,')
  })

  it('leaves team blank for undefined (backward compat)', () => {
    const checkin: Checkin = { ...base, id: '4', firstName: 'Al', lastName: 'Xu', fullName: 'al xu' }
    const csv = buildCsvContent([checkin])
    const lines = csv.trim().split('\n')
    expect(lines[1]).toContain('1,Al,Xu,,')
  })

  it('returns only header for empty list', () => {
    const csv = buildCsvContent([])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('#,First Name,Last Name,Team,Time')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/utils/export.test.ts
```

Expected: failures on header and team label tests (old format).

- [ ] **Step 3: Update `buildCsvContent` in `src/utils/export.ts`**

Replace the `buildCsvContent` function:

```ts
export function buildCsvContent(checkins: Checkin[]): string {
  const header = '#,First Name,Last Name,Team,Time'
  const rows = checkins.map((c, i) => {
    const time = c.timestamp.toLocaleTimeString()
    const team = c.team === 'yellow' ? 'Yellow' : c.team === 'orange' ? 'Orange' : ''
    return `${i + 1},${c.firstName},${c.lastName},${team},${time}`
  })
  return [header, ...rows].join('\n')
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/utils/export.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/export.ts src/utils/export.test.ts
git commit -m "feat: add Team column to CSV export"
```

---

### Task 4: Update export — PDF

**Files:**
- Modify: `src/utils/export.ts`

- [ ] **Step 1: Update `downloadPdf` in `src/utils/export.ts`**

Replace the `downloadPdf` function. Changes: Last Name x shifts 74→64, Team column added at x=104, Time shifts 124→144.

```ts
export function downloadPdf(checkins: Checkin[], eventName: string, eventDate: Date): void {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(eventName, 14, 20)
    doc.setFontSize(11)
    doc.text(eventDate.toLocaleDateString(), 14, 28)
    let y = 42
    doc.setFontSize(10)
    doc.text('#', 14, y)
    doc.text('First Name', 24, y)
    doc.text('Last Name', 64, y)
    doc.text('Team', 104, y)
    doc.text('Time', 144, y)
    y += 4
    doc.line(14, y, 196, y)
    y += 6
    checkins.forEach((c, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      const team = c.team === 'yellow' ? 'Yellow' : c.team === 'orange' ? 'Orange' : ''
      doc.text(String(i + 1), 14, y)
      doc.text(c.firstName, 24, y)
      doc.text(c.lastName, 64, y)
      doc.text(team, 104, y)
      doc.text(c.timestamp.toLocaleTimeString(), 144, y)
      y += 8
    })
    doc.save(`${eventName}-checkins.pdf`)
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/export.ts
git commit -m "feat: add Team column to PDF export"
```

---

### Task 5: Team assignment in the check-in flow

**Files:**
- Modify: `src/pages/CheckIn.tsx`

- [ ] **Step 1: Add `getCountFromServer` to the Firestore import**

At the top of `src/pages/CheckIn.tsx`, the current import is:

```ts
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
```

Add `getCountFromServer`:

```ts
import { collection, query, where, getDocs, addDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore'
```

- [ ] **Step 2: Add `team` to `StoredCheckin`**

The `StoredCheckin` interface (lines 11–17) currently has 5 fields. Add `team`:

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

- [ ] **Step 3: Insert team assignment between step 4 and step 5**

In `handleSubmit`, after the duplicate check block (step 4, ending around line 134) and before the `// 5. Write check-in` block, insert:

```ts
// 4b. Determine team assignment
let team: 'yellow' | 'orange' | null = null
try {
  const countSnap = await getCountFromServer(query(
    collection(db, 'checkins'),
    where('eventId', '==', selectedEvent.id)
  ))
  const position = countSnap.data().count + 1
  if (position <= 20) {
    team = position % 2 !== 0 ? 'orange' : 'yellow'
  }
} catch {
  if (!mountedRef.current) return
  setError('Could not verify your check-in status, please try again')
  setLoading(false)
  return
}
```

- [ ] **Step 4: Include `team` in the Firestore write**

In step 5 (`addDoc`), add `team` to the document:

```ts
await addDoc(collection(db, 'checkins'), {
  eventId: selectedEvent.id,
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  fullName,
  timestamp: serverTimestamp(),
  coords: { lat: coords.latitude, lng: coords.longitude },
  team,
})
```

- [ ] **Step 5: Include `team` in the localStorage write**

In step 6, add `team` to the `StoredCheckin` object:

```ts
const stored: StoredCheckin = {
  eventId: selectedEvent.id,
  fullName,
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  time,
  team,
}
```

- [ ] **Step 6: Handle missing `team` when reading from localStorage**

In the `useEffect` that reads localStorage (around line 46–59), the parsed object is cast to `StoredCheckin` and compared by `eventId`. No change needed to the read logic — because `StoredCheckin.team` is optional, a stored record without `team` will simply have `confirmed.team === undefined`, which the confirmation screen (next step) treats the same as `null`.

- [ ] **Step 7: Show team on the confirmation screen**

Replace the current confirmation return (around lines 171–178):

```tsx
if (confirmed) {
  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1 style={{ color: 'green', marginBottom: 16 }}>✓ You're checked in!</h1>
      <p>{confirmed.firstName} {confirmed.lastName} at {confirmed.time}</p>
      {confirmed.team === 'orange' && (
        <p style={{ marginTop: 12, fontSize: 18, fontWeight: 600 }}>🟠 You're on the Orange team</p>
      )}
      {confirmed.team === 'yellow' && (
        <p style={{ marginTop: 12, fontSize: 18, fontWeight: 600 }}>🟡 You're on the Yellow team</p>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/pages/CheckIn.tsx
git commit -m "feat: assign and display team at check-in"
```

---

### Task 6: Admin dashboard — team panels

**Files:**
- Modify: `src/pages/AdminDashboard.tsx`

- [ ] **Step 1: Replace the check-in table in `ActiveEventSection`**

In `src/pages/AdminDashboard.tsx`, the `ActiveEventSection` component renders a `<table>` of checkins (lines 50–72). Replace the entire table block (from the `<p>{checkins.length} checked in</p>` line down through the closing `</table>`) with the new layout:

```tsx
<p style={{ marginBottom: 12, color: '#666' }}>{checkins.length} checked in</p>

{checkins.length === 0 ? (
  <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>No check-ins yet</div>
) : (
  <>
    {/* Team panels — first 20 check-ins */}
    <div style={{ display: 'flex', gap: 16, marginBottom: checkins.length > 20 ? 16 : 0 }}>
      {/* Yellow team */}
      {checkins.some((c, i) => i < 20 && c.team === 'yellow') && (
        <div style={{ flex: 1, background: '#fef9c3', borderRadius: 6, padding: 12 }}>
          <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: 8 }}>
            🟡 Yellow ({checkins.filter(c => c.team === 'yellow').length})
          </div>
          {checkins
            .map((c, i) => ({ c, pos: i + 1 }))
            .filter(({ c }) => c.team === 'yellow')
            .map(({ c, pos }) => (
              <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
                {pos}. {c.firstName} {c.lastName} — {c.timestamp.toLocaleTimeString()}
              </div>
            ))}
        </div>
      )}

      {/* Orange team */}
      {checkins.some((c, i) => i < 20 && c.team === 'orange') && (
        <div style={{ flex: 1, background: '#fff7ed', borderRadius: 6, padding: 12 }}>
          <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: 8 }}>
            🟠 Orange ({checkins.filter(c => c.team === 'orange').length})
          </div>
          {checkins
            .map((c, i) => ({ c, pos: i + 1 }))
            .filter(({ c }) => c.team === 'orange')
            .map(({ c, pos }) => (
              <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
                {pos}. {c.firstName} {c.lastName} — {c.timestamp.toLocaleTimeString()}
              </div>
            ))}
        </div>
      )}
    </div>

    {/* No-team list — positions 21+ */}
    {checkins.length > 20 && (
      <div>
        <div style={{ fontWeight: 600, color: '#666', marginBottom: 8 }}>
          No team assigned ({checkins.length - 20})
        </div>
        {checkins.slice(20).map((c, i) => (
          <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
            {21 + i}. {c.firstName} {c.lastName} — {c.timestamp.toLocaleTimeString()}
          </div>
        ))}
      </div>
    )}
  </>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminDashboard.tsx
git commit -m "feat: replace check-in table with team panels in admin dashboard"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.
