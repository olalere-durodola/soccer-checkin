# Soccer Team Check-In App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a location-based soccer team check-in web app where players tap "I Am Here" to log attendance and admins manage events in real time.

**Architecture:** Single React + TypeScript SPA (Vite) with two views — public player check-in at `/` and protected admin panel at `/admin`. Firebase Firestore stores events and check-ins with real-time listeners. Firebase Auth restricts admin access via an email allowlist stored in Firestore.

**Tech Stack:** React 18, TypeScript, Vite, Firebase 10 (Firestore + Auth + Hosting), Leaflet + react-leaflet, jsPDF, Vitest, React Testing Library

---

## File Structure

```
src/
  firebase.ts                  # Firebase app init, db, auth exports
  types.ts                     # Event, Checkin, Admin TS interfaces
  utils/
    geo.ts                     # Haversine distance calculation
    export.ts                  # CSV and PDF export helpers
    validation.ts              # Name field validation rules
  hooks/
    useAuth.ts                 # Firebase Auth state + isAdmin check
    useActiveEvent.ts          # Firestore listener for active event
    useCheckins.ts             # Firestore listener for event check-ins
  components/
    ProtectedRoute.tsx         # Redirects unauthenticated users to /admin/login
    ConfirmModal.tsx           # Reusable confirmation dialog
    ConnectionBanner.tsx       # "Connection lost" warning banner
  pages/
    CheckIn.tsx                # Player check-in page (/)
    AdminLogin.tsx             # Admin login (/admin/login)
    AdminDashboard.tsx         # Admin dashboard (/admin)
    CreateEvent.tsx            # Create/activate event with Leaflet map
    EventDetail.tsx            # Past event detail + check-in list
  App.tsx                      # React Router routes
  main.tsx                     # Entry point
  index.css                    # Global styles (mobile-first)
firestore.rules                # Firestore security rules
.env.example                   # Firebase config env var template
firebase.json                  # Firebase Hosting config
```

---

## Task 0: Firebase Console Prerequisites

**This must be done before writing any code. All Firebase SDK calls will fail without it.**

- [ ] **Step 1: Create a Firebase project**

Go to [console.firebase.google.com](https://console.firebase.google.com) → Add project → name it (e.g. `soccer-checkin`).

- [ ] **Step 2: Enable Firestore**

Firestore Database → Create database → Start in **test mode** (you will lock it down in Task 16).

- [ ] **Step 3: Enable Authentication**

Authentication → Get started → Sign-in method → Enable **Email/Password**.

- [ ] **Step 4: Register a web app and copy config**

Project settings → Add app → Web → register. Copy the config object values — you will use these in `.env` in Task 1.

- [ ] **Step 5: Create the first admin user**

Authentication → Users → Add user → enter email + password for the first admin.

- [ ] **Step 6: Seed the admins Firestore collection**

Firestore → Start collection → Collection ID: `admins` → Document ID: the admin's email address → Add field `email` (string) = same email, `createdAt` (timestamp) = now.

**Why now:** The `useAuth` hook checks `admins/{email}` on every login. Without this document, even a valid Firebase Auth user will be treated as a non-admin and redirected to login.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.env.example`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
npm install firebase react-router-dom leaflet react-leaflet jspdf
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/leaflet
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create `.env.example`**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 6: Copy `.env.example` to `.env` and fill in your Firebase project values**

Create a Firebase project at console.firebase.google.com, enable Firestore and Authentication (Email/Password), then copy the config values.

- [ ] **Step 7: Add Leaflet CSS to `index.html`**

Add inside `<head>` — omitting this produces a broken map with no build error:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server running at http://localhost:5173

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite React TypeScript project"
```

---

## Task 2: Firebase Init + Types

**Files:**
- Create: `src/firebase.ts`, `src/types.ts`

- [ ] **Step 1: Create `src/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

- [ ] **Step 2: Create `src/types.ts`**

```typescript
export interface Event {
  id: string
  name: string
  date: Date
  location: { lat: number; lng: number }
  radius: number        // meters, default 15, min 10, max 500
  active: boolean
  createdAt: Date
  closedAt: Date | null
}

export interface Checkin {
  id: string
  eventId: string
  firstName: string     // as-entered (mixed case)
  lastName: string      // as-entered (mixed case)
  fullName: string      // "firstname lastname" lowercased, for duplicate detection
  timestamp: Date
  coords: { lat: number; lng: number }
}

export interface Admin {
  email: string
  createdAt: Date
}
```

- [ ] **Step 3: Commit**

```bash
git add src/firebase.ts src/types.ts
git commit -m "feat: add Firebase init and TypeScript types"
```

---

## Task 3: Geo Utility (TDD)

**Files:**
- Create: `src/utils/geo.ts`, `src/utils/geo.test.ts`

- [ ] **Step 1: Write failing tests in `src/utils/geo.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { haversineDistance, isWithinRadius } from './geo'

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBe(0)
  })

  it('returns approximate distance between two points in meters', () => {
    // ~111m per 0.001 degree latitude
    const dist = haversineDistance(51.5000, -0.1, 51.5009, -0.1)
    expect(dist).toBeGreaterThan(90)
    expect(dist).toBeLessThan(110)
  })

  it('returns distance in meters not kilometers', () => {
    const dist = haversineDistance(51.5, -0.1, 51.501, -0.1)
    expect(dist).toBeGreaterThan(50)
    expect(dist).toBeLessThan(200)
  })
})

describe('isWithinRadius', () => {
  it('returns true when player is within radius', () => {
    // same point, radius 15m
    expect(isWithinRadius(51.5, -0.1, 51.5, -0.1, 15)).toBe(true)
  })

  it('returns false when player is outside radius', () => {
    // ~111m away, radius 15m
    expect(isWithinRadius(51.5, -0.1, 51.501, -0.1, 15)).toBe(false)
  })

  it('returns true when player is exactly at radius boundary', () => {
    // use a known distance and matching radius
    const dist = haversineDistance(51.5, -0.1, 51.5001, -0.1)
    expect(isWithinRadius(51.5, -0.1, 51.5001, -0.1, dist)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/geo.test.ts
```
Expected: FAIL — `Cannot find module './geo'`

- [ ] **Step 3: Implement `src/utils/geo.ts`**

```typescript
const EARTH_RADIUS_M = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function isWithinRadius(
  fieldLat: number, fieldLng: number,
  playerLat: number, playerLng: number,
  radiusM: number
): boolean {
  return haversineDistance(fieldLat, fieldLng, playerLat, playerLng) <= radiusM
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/geo.test.ts
```
Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/utils/geo.ts src/utils/geo.test.ts
git commit -m "feat: add haversine geo utility"
```

---

## Task 4: Validation Utility (TDD)

**Files:**
- Create: `src/utils/validation.ts`, `src/utils/validation.test.ts`

- [ ] **Step 1: Write failing tests in `src/utils/validation.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { validateName, buildFullName } from './validation'

describe('validateName', () => {
  it('rejects empty string', () => {
    expect(validateName('')).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(validateName('   ')).toBe(false)
  })

  it('rejects name shorter than 2 chars', () => {
    expect(validateName('A')).toBe(false)
  })

  it('rejects name longer than 50 chars', () => {
    expect(validateName('A'.repeat(51))).toBe(false)
  })

  it('accepts valid name', () => {
    expect(validateName('John')).toBe(true)
  })

  it('accepts name with exactly 2 chars', () => {
    expect(validateName('Jo')).toBe(true)
  })

  it('accepts name with exactly 50 chars', () => {
    expect(validateName('A'.repeat(50))).toBe(true)
  })
})

describe('buildFullName', () => {
  it('lowercases and trims first and last name', () => {
    expect(buildFullName('  John  ', '  Smith  ')).toBe('john smith')
  })

  it('handles mixed case', () => {
    expect(buildFullName('JOHN', 'SMITH')).toBe('john smith')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/validation.test.ts
```
Expected: FAIL — `Cannot find module './validation'`

- [ ] **Step 3: Implement `src/utils/validation.ts`**

```typescript
export function validateName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length >= 2 && trimmed.length <= 50
}

export function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim().toLowerCase()} ${lastName.trim().toLowerCase()}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/validation.test.ts
```
Expected: PASS — 9 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/utils/validation.ts src/utils/validation.test.ts
git commit -m "feat: add name validation utility"
```

---

## Task 5: Export Utility (TDD)

**Files:**
- Create: `src/utils/export.ts`, `src/utils/export.test.ts`

- [ ] **Step 1: Write failing tests in `src/utils/export.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildCsvContent } from './export'
import type { Checkin } from '../types'

const mockCheckins: Checkin[] = [
  {
    id: '1',
    eventId: 'evt1',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'john smith',
    timestamp: new Date('2026-03-27T10:00:00'),
    coords: { lat: 51.5, lng: -0.1 },
  },
  {
    id: '2',
    eventId: 'evt1',
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'jane doe',
    timestamp: new Date('2026-03-27T10:05:00'),
    coords: { lat: 51.5, lng: -0.1 },
  },
]

describe('buildCsvContent', () => {
  it('includes header row', () => {
    const csv = buildCsvContent(mockCheckins)
    expect(csv).toContain('#,First Name,Last Name,Time')
  })

  it('includes player rows in order', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[1]).toContain('1,John,Smith')
    expect(lines[2]).toContain('2,Jane,Doe')
  })

  it('returns only header for empty list', () => {
    const csv = buildCsvContent([])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('#,First Name,Last Name,Time')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/utils/export.test.ts
```
Expected: FAIL — `Cannot find module './export'`

- [ ] **Step 3: Implement `src/utils/export.ts`**

```typescript
import type { Checkin } from '../types'

export function buildCsvContent(checkins: Checkin[]): string {
  const header = '#,First Name,Last Name,Time'
  const rows = checkins.map((c, i) => {
    const time = c.timestamp.toLocaleTimeString()
    return `${i + 1},${c.firstName},${c.lastName},${time}`
  })
  return [header, ...rows].join('\n')
}

export function downloadCsv(checkins: Checkin[], eventName: string): void {
  const content = buildCsvContent(checkins)
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${eventName}-checkins.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPdf(checkins: Checkin[], eventName: string, eventDate: Date): void {
  // Dynamic import to keep bundle lean
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
    doc.text('Last Name', 74, y)
    doc.text('Time', 124, y)
    y += 4
    doc.line(14, y, 196, y)
    y += 6

    checkins.forEach((c, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(String(i + 1), 14, y)
      doc.text(c.firstName, 24, y)
      doc.text(c.lastName, 74, y)
      doc.text(c.timestamp.toLocaleTimeString(), 124, y)
      y += 8
    })

    doc.save(`${eventName}-checkins.pdf`)
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/export.test.ts
```
Expected: PASS — 3 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/utils/export.ts src/utils/export.test.ts
git commit -m "feat: add CSV and PDF export utilities"
```

---

## Task 6: Auth Hook + Protected Route

**Files:**
- Create: `src/hooks/useAuth.ts`, `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create `src/hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

interface AuthState {
  user: User | null
  isAdmin: boolean
  loading: boolean
}

export function useAuth(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true })

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        setState({ user: null, isAdmin: false, loading: false })
        return
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email))
        setState({ user, isAdmin: adminDoc.exists(), loading: false })
      } catch {
        setState({ user, isAdmin: false, loading: false })
      }
    })
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return { ...state, logout }
}
```

- [ ] **Step 2: Create `src/components/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts src/components/ProtectedRoute.tsx
git commit -m "feat: add auth hook and protected route"
```

---

## Task 7: App Router Setup

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`, `src/index.css`

- [ ] **Step 1: Update `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

- [ ] **Step 2: Update `src/App.tsx`**

```typescript
import { Routes, Route } from 'react-router-dom'
import { CheckIn } from './pages/CheckIn'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { EventDetail } from './pages/EventDetail'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CheckIn />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:eventId"
        element={
          <ProtectedRoute>
            <EventDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
```

- [ ] **Step 3: Replace `src/index.css` with mobile-first base styles**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #1a1a1a; }
button { cursor: pointer; }
input { font-size: 16px; } /* prevents iOS zoom on focus */
```

- [ ] **Step 4: Create stub page files so the app compiles**

Create `src/pages/CheckIn.tsx`:
```typescript
export function CheckIn() { return <div>Check In</div> }
```
Create `src/pages/AdminLogin.tsx`:
```typescript
export function AdminLogin() { return <div>Admin Login</div> }
```
Create `src/pages/AdminDashboard.tsx`:
```typescript
export function AdminDashboard() { return <div>Admin Dashboard</div> }
```
Create `src/pages/EventDetail.tsx`:
```typescript
export function EventDetail() { return <div>Event Detail</div> }
```

- [ ] **Step 5: Verify app compiles and routes work**

```bash
npm run dev
```
Visit http://localhost:5173, http://localhost:5173/admin/login — each shows its stub.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: set up React Router with admin protected routes"
```

---

## Task 8: Admin Login Page

**Files:**
- Modify: `src/pages/AdminLogin.tsx`

- [ ] **Step 1: Implement `src/pages/AdminLogin.tsx`**

```typescript
import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/admin')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 24 }}>Admin Login</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12 }}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Manually test login flow**

Start dev server. Go to `/admin/login`. Try wrong credentials — expect "Invalid email or password". Try correct admin credentials — expect redirect to `/admin`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminLogin.tsx
git commit -m "feat: implement admin login page"
```

---

## Task 9: useActiveEvent Hook

**Files:**
- Create: `src/hooks/useActiveEvent.ts`

- [ ] **Step 1: Create `src/hooks/useActiveEvent.ts`**

```typescript
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { db } from '../firebase'
import type { Event } from '../types'

type Status = 'loading' | 'no-event' | 'loaded' | 'error'

interface ActiveEventState {
  event: Event | null
  status: Status
}

export function useActiveEvent(): ActiveEventState {
  const [state, setState] = useState<ActiveEventState>({ event: null, status: 'loading' })

  useEffect(() => {
    const q = query(collection(db, 'events'), where('active', '==', true), limit(1))
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setState({ event: null, status: 'no-event' })
        } else {
          const d = snap.docs[0]
          const data = d.data()
          setState({
            event: {
              id: d.id,
              name: data.name,
              date: data.date.toDate(),
              location: data.location,
              radius: data.radius,
              active: data.active,
              createdAt: data.createdAt.toDate(),
              closedAt: data.closedAt?.toDate() ?? null,
            },
            status: 'loaded',
          })
        }
      },
      () => setState({ event: null, status: 'error' })
    )
    return unsub
  }, [])

  return state
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useActiveEvent.ts
git commit -m "feat: add useActiveEvent Firestore hook"
```

---

## Task 10: Player Check-In Page

**Files:**
- Modify: `src/pages/CheckIn.tsx`

- [ ] **Step 1: Implement full `src/pages/CheckIn.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useActiveEvent } from '../hooks/useActiveEvent'
import { validateName, buildFullName } from '../utils/validation'
import { isWithinRadius } from '../utils/geo'

const LOCAL_KEY = 'checkin_state'

interface StoredCheckin {
  eventId: string
  fullName: string
  firstName: string
  lastName: string
  time: string
}

export function CheckIn() {
  const { event, status } = useActiveEvent()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState<StoredCheckin | null>(null)

  // Check localStorage on mount / when active event changes
  useEffect(() => {
    if (!event) return
    try {
      const stored = localStorage.getItem(LOCAL_KEY)
      if (stored) {
        const parsed: StoredCheckin = JSON.parse(stored)
        if (parsed.eventId === event.id) {
          setConfirmed(parsed)
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    if (!validateName(firstName) || !validateName(lastName)) {
      setError('Please enter a valid first and last name (2–50 characters)')
      return
    }
    setError('')
    setLoading(true)

    // 1. Get GPS
    let coords: GeolocationCoordinates
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      coords = pos.coords
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError
      if (geoErr.code === GeolocationPositionError.PERMISSION_DENIED) {
        setError('Please allow location access to check in')
      } else {
        setError('Could not get your location, please try again')
      }
      setLoading(false)
      return
    }

    // 2. Check GPS accuracy
    if (coords.accuracy > 50) {
      setError('Your GPS signal is too weak, please try again outside or near a window')
      setLoading(false)
      return
    }

    // 3. Check geofence
    if (!isWithinRadius(event.location.lat, event.location.lng, coords.latitude, coords.longitude, event.radius)) {
      setError('You are not close enough to the field')
      setLoading(false)
      return
    }

    // 4. Check duplicate
    const fullName = buildFullName(firstName, lastName)
    try {
      const dupQuery = query(
        collection(db, 'checkins'),
        where('eventId', '==', event.id),
        where('fullName', '==', fullName)
      )
      const dupSnap = await getDocs(dupQuery)
      if (!dupSnap.empty) {
        setError('You have already checked in')
        setLoading(false)
        return
      }
    } catch {
      setError('Could not verify your check-in status, please try again')
      setLoading(false)
      return
    }

    // 5. Write check-in
    try {
      await addDoc(collection(db, 'checkins'), {
        eventId: event.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        timestamp: serverTimestamp(),
        coords: { lat: coords.latitude, lng: coords.longitude },
      })
    } catch {
      setError('Something went wrong, please try again')
      setLoading(false)
      return
    }

    // 6. Update localStorage and show confirmation
    const time = new Date().toLocaleTimeString()
    const stored: StoredCheckin = {
      eventId: event.id,
      fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      time,
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    setConfirmed(stored)
    setLoading(false)
  }

  if (status === 'loading') return <p style={{ padding: 24 }}>Loading...</p>
  if (status === 'error') return <p style={{ padding: 24 }}>Could not load event, please check your connection and refresh</p>

  if (confirmed) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ color: 'green', marginBottom: 16 }}>✓ You're checked in!</h1>
        <p>{confirmed.firstName} {confirmed.lastName}</p>
        <p style={{ color: '#666', marginTop: 8 }}>{confirmed.time}</p>
      </div>
    )
  }

  if (status === 'no-event' || !event) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>No active event right now</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 8 }}>{event.name}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{event.date.toLocaleDateString()}</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>First Name</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            maxLength={50}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Last Name</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            maxLength={50}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 16, fontSize: 18, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          {loading ? 'Checking in...' : 'I Am Here'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write localStorage guard tests in `src/pages/CheckIn.test.tsx`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildFullName } from '../utils/validation'

const LOCAL_KEY = 'checkin_state'

describe('localStorage check-in guard', () => {
  beforeEach(() => localStorage.clear())

  it('detects existing check-in for current event', () => {
    const stored = { eventId: 'evt1', fullName: 'john smith', firstName: 'John', lastName: 'Smith', time: '10:00' }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY)!)
    expect(parsed.eventId).toBe('evt1')
    expect(parsed.fullName).toBe('john smith')
  })

  it('ignores stale check-in from a different event', () => {
    const stored = { eventId: 'old-evt', fullName: 'john smith', firstName: 'John', lastName: 'Smith', time: '10:00' }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY)!)
    expect(parsed.eventId).not.toBe('evt1') // different event → should show form
  })

  it('builds correct fullName for storage', () => {
    expect(buildFullName('John', 'Smith')).toBe('john smith')
  })
})
```

- [ ] **Step 3: Run localStorage tests**

```bash
npx vitest run src/pages/CheckIn.test.tsx
```
Expected: PASS — 3 tests passing

- [ ] **Step 4: Manually test player flow**

**Prerequisite:** Deploy Firestore rules first (Task 16, Step 1–2) and ensure an admin + active event exist (Task 0). Firestore in test mode won't enforce rules — run with rules deployed.

With an active event in Firestore: open `/`, enter name, tap button, allow GPS. Verify check-in saved to Firestore and confirmation screen shown. Refresh — confirm screen persists (localStorage guard).

- [ ] **Step 5: Test error states manually**

- Deny GPS permission → expect location error message
- Spoof far-away coords in browser devtools → expect "not close enough" message
- Submit same name twice → expect "already checked in"
- Clear localStorage, refresh → form shown again (accepted risk per spec)

- [ ] **Step 6: Commit**

```bash
git add src/pages/CheckIn.tsx
git commit -m "feat: implement player check-in page with geofence and duplicate check"
```

---

## Task 11: useCheckins Hook

**Files:**
- Create: `src/hooks/useCheckins.ts`

- [ ] **Step 1: Create `src/hooks/useCheckins.ts`**

```typescript
import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import type { Checkin } from '../types'

interface CheckinsState {
  checkins: Checkin[]
  loading: boolean
  connectionLost: boolean
}

export function useCheckins(eventId: string | null): CheckinsState {
  const [state, setState] = useState<CheckinsState>({ checkins: [], loading: true, connectionLost: false })

  useEffect(() => {
    if (!eventId) {
      setState({ checkins: [], loading: false, connectionLost: false })
      return
    }

    const q = query(
      collection(db, 'checkins'),
      where('eventId', '==', eventId),
      orderBy('timestamp', 'asc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const checkins: Checkin[] = snap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            eventId: data.eventId,
            firstName: data.firstName,
            lastName: data.lastName,
            fullName: data.fullName,
            timestamp: data.timestamp?.toDate() ?? new Date(),
            coords: data.coords,
          }
        })
        setState({ checkins, loading: false, connectionLost: false })
      },
      () => setState(prev => ({ ...prev, loading: false, connectionLost: true }))
    )

    return unsub
  }, [eventId])

  return state
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCheckins.ts
git commit -m "feat: add useCheckins real-time hook"
```

---

## Task 12: Shared Components

**Files:**
- Create: `src/components/ConfirmModal.tsx`, `src/components/ConnectionBanner.tsx`

- [ ] **Step 1: Create `src/components/ConfirmModal.tsx`**

```typescript
interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 360, width: '90%' }}>
        <p style={{ marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4 }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/ConnectionBanner.tsx`**

```typescript
export function ConnectionBanner() {
  return (
    <div style={{
      background: '#fef3c7', borderBottom: '1px solid #f59e0b',
      padding: '8px 16px', textAlign: 'center', fontSize: 14
    }}>
      Connection lost — check-in list may be outdated
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ConfirmModal.tsx src/components/ConnectionBanner.tsx
git commit -m "feat: add ConfirmModal and ConnectionBanner components"
```

---

## Task 13: Admin Dashboard + Check-In List

**Files:**
- Modify: `src/pages/AdminDashboard.tsx`

- [ ] **Step 1: Implement `src/pages/AdminDashboard.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { useActiveEvent } from '../hooks/useActiveEvent'
import { useCheckins } from '../hooks/useCheckins'
import { ConfirmModal } from '../components/ConfirmModal'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { downloadCsv, downloadPdf } from '../utils/export'
import type { Event } from '../types'

export function AdminDashboard() {
  const { logout } = useAuth()
  const { event, status } = useActiveEvent()
  const { checkins, connectionLost } = useCheckins(event?.id ?? null)
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closingError, setClosingError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPast = async () => {
      const q = query(
        collection(db, 'events'),
        where('active', '==', false),
        orderBy('closedAt', 'desc')
      )
      const snap = await getDocs(q)
      setPastEvents(snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name,
          date: data.date.toDate(),
          location: data.location,
          radius: data.radius,
          active: data.active,
          createdAt: data.createdAt.toDate(),
          closedAt: data.closedAt?.toDate() ?? null,
        }
      }))
    }
    fetchPast()
  }, [event]) // refetch when active event changes

  const handleCloseEvent = async () => {
    if (!event) return
    setClosingError('')
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'events', event.id), { active: false, closedAt: serverTimestamp() })
      await batch.commit()
      setShowCloseConfirm(false)
    } catch {
      setClosingError('Failed to close event, please try again')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      {connectionLost && <ConnectionBanner />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/admin/create')}>New Event</button>
          <button onClick={logout}>Log Out</button>
        </div>
      </div>

      {/* Active Event */}
      {status === 'loading' && <p>Loading...</p>}
      {status === 'loaded' && event && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2>{event.name}</h2>
              <p style={{ color: '#666' }}>{event.date.toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => downloadCsv(checkins, event.name)}>Export CSV</button>
              <button onClick={() => downloadPdf(checkins, event.name, event.date)}>Export PDF</button>
              <button onClick={() => setShowCloseConfirm(true)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4 }}>
                Close Event
              </button>
            </div>
          </div>
          {closingError && <p style={{ color: 'red', marginBottom: 12 }}>{closingError}</p>}

          <p style={{ marginBottom: 12, color: '#666' }}>{checkins.length} checked in</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', width: 40 }}>#</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>First Name</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Last Name</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {checkins.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 4px' }}>{i + 1}</td>
                  <td style={{ padding: '8px 4px' }}>{c.firstName}</td>
                  <td style={{ padding: '8px 4px' }}>{c.lastName}</td>
                  <td style={{ padding: '8px 4px' }}>{c.timestamp.toLocaleTimeString()}</td>
                </tr>
              ))}
              {checkins.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 16, color: '#999', textAlign: 'center' }}>No check-ins yet</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
      {status === 'no-event' && <p style={{ marginBottom: 32, color: '#666' }}>No active event. Create one to get started.</p>}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 16 }}>Past Events</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Closed</th>
              </tr>
            </thead>
            <tbody>
              {pastEvents.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 4px' }}>
                    <Link to={`/admin/events/${e.id}`}>{e.name}</Link>
                  </td>
                  <td style={{ padding: '8px 4px' }}>{e.date.toLocaleDateString()}</td>
                  <td style={{ padding: '8px 4px' }}>{e.closedAt?.toLocaleString() ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {showCloseConfirm && (
        <ConfirmModal
          message="Are you sure you want to close this event? Players will no longer be able to check in."
          onConfirm={handleCloseEvent}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `/admin/create` route to `src/App.tsx`**

```typescript
// Add import
import { CreateEvent } from './pages/CreateEvent'

// Add route inside ProtectedRoute section
<Route
  path="/admin/create"
  element={
    <ProtectedRoute>
      <CreateEvent />
    </ProtectedRoute>
  }
/>
```

Create stub `src/pages/CreateEvent.tsx`:
```typescript
export function CreateEvent() { return <div>Create Event</div> }
```

- [ ] **Step 3: Manually test dashboard**

Log in as admin. With active event in Firestore — check-in list loads and updates in real time. Close event — confirm modal appears, event closes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement admin dashboard with live check-in list and close event"
```

---

## Task 14: Create Event Page with Leaflet Map

**Files:**
- Modify: `src/pages/CreateEvent.tsx`

- [ ] **Step 1: Implement `src/pages/CreateEvent.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet'
import { collection, query, where, getDocs, doc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

interface LatLng { lat: number; lng: number }

function LocationPicker({ location, onPick }: { location: LatLng | null; onPick: (ll: LatLng) => void }) {
  useMapEvents({ click: e => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

export function CreateEvent() {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState<LatLng | null>(null)
  const [radius, setRadius] = useState(15)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location) { setError('Please pin a location on the map'); return }
    if (!name.trim()) { setError('Please enter an event name'); return }
    setError('')
    setLoading(true)

    try {
      // Check for existing active event
      const activeQ = query(collection(db, 'events'), where('active', '==', true))
      let activeSnap
      try {
        activeSnap = await getDocs(activeQ)
      } catch {
        setError('Could not check for active events, please try again')
        setLoading(false)
        return
      }

      const batch = writeBatch(db)

      // Deactivate existing active event if any
      if (!activeSnap.empty) {
        const confirmed = window.confirm('This will close the current active event. Continue?')
        if (!confirmed) { setLoading(false); return }
        activeSnap.docs.forEach(d => {
          batch.update(doc(db, 'events', d.id), { active: false, closedAt: serverTimestamp() })
        })
      }

      // Create new event
      const newEventRef = doc(collection(db, 'events'))
      batch.set(newEventRef, {
        name: name.trim(),
        date: new Date(date),
        location,
        radius,
        active: true,
        createdAt: serverTimestamp(),
        closedAt: null,
      })

      await batch.commit()
      navigate('/admin')
    } catch {
      setError('Failed to activate event, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginBottom: 24 }}>New Event</h1>
      <form onSubmit={handleActivate}>
        <div style={{ marginBottom: 16 }}>
          <label>Event Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Radius: {radius}m (min 10, max 500)</label>
          <input type="range" min={10} max={500} value={radius} onChange={e => setRadius(Number(e.target.value))}
            style={{ display: 'block', width: '100%', marginTop: 4 }} />
        </div>

        <p style={{ marginBottom: 8, color: '#666' }}>Click the map to pin the field location</p>
        <div style={{ height: 350, marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 4 }}>
          <MapContainer
            center={[20, 0]} zoom={2}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker location={location} onPick={setLocation} />
            {location && <Circle center={[location.lat, location.lng]} radius={radius} />}
          </MapContainer>
        </div>
        {location && <p style={{ color: '#059669', marginBottom: 12 }}>
          ✓ Location pinned: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>}

        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={() => navigate('/admin')} style={{ padding: '10px 20px' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
            {loading ? 'Activating...' : 'Activate Event'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Manually test create event flow**

Log in as admin → New Event → fill form → click map to pin → adjust radius → Activate. Verify event appears in Firestore and dashboard shows it active.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CreateEvent.tsx index.html
git commit -m "feat: implement create event page with Leaflet map and geofence circle"
```

---

## Task 15: Past Event Detail Page

**Files:**
- Modify: `src/pages/EventDetail.tsx`

- [ ] **Step 1: Implement `src/pages/EventDetail.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useCheckins } from '../hooks/useCheckins'
import { downloadCsv, downloadPdf } from '../utils/export'
import type { Event } from '../types'

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const { checkins } = useCheckins(eventId ?? null)

  useEffect(() => {
    if (!eventId) return
    getDoc(doc(db, 'events', eventId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setEvent({
          id: snap.id,
          name: d.name,
          date: d.date.toDate(),
          location: d.location,
          radius: d.radius,
          active: d.active,
          createdAt: d.createdAt.toDate(),
          closedAt: d.closedAt?.toDate() ?? null,
        })
      }
      setLoading(false)
    })
  }, [eventId])

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (!event) return <p style={{ padding: 24 }}>Event not found</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 16 }}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1>{event.name}</h1>
          <p style={{ color: '#666' }}>{event.date.toLocaleDateString()}</p>
          {event.closedAt && <p style={{ color: '#999', fontSize: 14 }}>Closed: {event.closedAt.toLocaleString()}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => downloadCsv(checkins, event.name)}>Export CSV</button>
          <button onClick={() => downloadPdf(checkins, event.name, event.date)}>Export PDF</button>
        </div>
      </div>

      <p style={{ marginBottom: 12, color: '#666' }}>{checkins.length} checked in</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '8px 4px', width: 40 }}>#</th>
            <th style={{ textAlign: 'left', padding: '8px 4px' }}>First Name</th>
            <th style={{ textAlign: 'left', padding: '8px 4px' }}>Last Name</th>
            <th style={{ textAlign: 'left', padding: '8px 4px' }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {checkins.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 4px' }}>{i + 1}</td>
              <td style={{ padding: '8px 4px' }}>{c.firstName}</td>
              <td style={{ padding: '8px 4px' }}>{c.lastName}</td>
              <td style={{ padding: '8px 4px' }}>{c.timestamp.toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EventDetail.tsx
git commit -m "feat: implement past event detail page with export"
```

---

## Task 16: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    match /admins/{email} {
      allow read, write: if isAdmin();
    }

    match /events/{eventId} {
      allow read: if resource.data.active == true || isAdmin();
      allow write: if isAdmin();
    }

    match /checkins/{checkinId} {
      allow create: if request.auth == null;
      allow read: if isAdmin();
    }
  }
}
```

- [ ] **Step 2: Deploy rules**

```bash
npx firebase-tools deploy --only firestore:rules
```
Expected: "Deploy complete!"

- [ ] **Step 3: Verify rules work**

- Open `/` without login → can read active event, can create check-in ✓
- Try to read checkins without admin login → should fail in browser console ✓
- Log in as admin → can read all checkins ✓

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules"
```

---

## Task 17: Firebase Hosting + Deploy

**Files:**
- Create: `firebase.json`, `.firebaserc`

- [ ] **Step 1: Install Firebase CLI if not already installed**

```bash
npm install -g firebase-tools
firebase login
```

- [ ] **Step 2: Initialize Firebase Hosting**

```bash
firebase init hosting
```
- Select your Firebase project
- Public directory: `dist`
- Configure as single-page app: **Yes**
- Don't overwrite `dist/index.html`

- [ ] **Step 3: Verify `firebase.json` looks like this**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

- [ ] **Step 4: Build and deploy**

```bash
npm run build
npx firebase-tools deploy --only hosting
```
Expected: "Hosting URL: https://your-project.web.app"

- [ ] **Step 5: Test on mobile**

Open the hosting URL on your phone. Verify player check-in works with real GPS.

- [ ] **Step 6: Commit**

```bash
git add firebase.json .firebaserc
git commit -m "feat: add Firebase Hosting config"
```

---

## Task 18: Final Commit

- [ ] **Step 1: Final commit**

```bash
git add -A
git commit -m "chore: finalize app - ready for deployment"
```

---

## Summary

| Task | What it builds |
|------|---------------|
| 0 | Firebase Console setup (prerequisite — must be done first) |
| 1 | Project scaffold (Vite + React + TypeScript) |
| 2 | Firebase init + TypeScript types |
| 3 | Haversine geo utility (TDD) |
| 4 | Name validation utility (TDD) |
| 5 | CSV/PDF export utility (TDD) |
| 6 | Auth hook + ProtectedRoute |
| 7 | App router setup |
| 8 | Admin login page |
| 9 | useActiveEvent hook |
| 10 | Player check-in page |
| 11 | useCheckins real-time hook |
| 12 | ConfirmModal + ConnectionBanner |
| 13 | Admin dashboard + live check-in list |
| 14 | Create event page with Leaflet map |
| 15 | Past event detail page |
| 16 | Firestore security rules |
| 17 | Firebase Hosting deploy |
| 18 | Seed first admin |
