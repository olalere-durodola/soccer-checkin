import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, where, getDocs, addDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore'
import { db } from '../firebase'
import { useActiveEvent } from '../hooks/useActiveEvent'
import { validateName, buildFullName } from '../utils/validation'
import { isWithinRadius } from '../utils/geo'
import type { Event } from '../types'

const LOCAL_KEY = 'checkin_state'

// Fixes less precise than this can't reliably verify the radius, so we keep
// refining rather than deciding on them. Kept tight (50 m) so only genuine
// phone GPS qualifies — coarse wifi/IP-based fixes (which a VPN can shift on
// non-GPS devices) are rejected, blocking remote/spoofed check-ins.
const MAX_ACCURACY_M = 50

interface StoredCheckin {
  eventId: string
  fullName: string
  firstName: string
  lastName: string
  time: string
  team?: 'yellow' | 'orange' | null
}

export function CheckIn() {
  const { events, status } = useActiveEvent()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)   // writing the check-in
  const [pending, setPending] = useState(false)   // tapped, waiting for a usable fix
  const [confirmed, setConfirmed] = useState<StoredCheckin | null>(null)

  // Location state — the latest fix lives in state so it can drive auto-complete
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const submitGuardRef = useRef(false)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // Auto-select if only one event; clear selection if events change
  useEffect(() => {
    if (events.length === 1) setSelectedEvent(events[0])
    else setSelectedEvent(null)
  }, [events.map(e => e.id).join(',')])

  // Check localStorage when selected event is known
  useEffect(() => {
    if (!selectedEvent) return
    try {
      const stored = localStorage.getItem(LOCAL_KEY)
      if (stored) {
        const parsed: StoredCheckin = JSON.parse(stored)
        if (parsed.eventId === selectedEvent.id) {
          setConfirmed(parsed)
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, [selectedEvent?.id])

  // Pre-warm GPS as soon as there is an event to check into — long before the
  // player taps. High accuracy is required because we enforce the radius; the
  // watch keeps refining so `coords` holds the freshest fix at all times.
  const hasEvent = events.length > 0
  useEffect(() => {
    if (!hasEvent || !navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => { if (mountedRef.current) setCoords(pos.coords) },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED && mountedRef.current) {
          setLocationDenied(true)
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 60000 }
    )
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [hasEvent])

  // The actual check-in, run once a trustworthy fix is in hand.
  const runCheckin = useCallback(async (c: GeolocationCoordinates) => {
    if (!selectedEvent || submitGuardRef.current) return

    // Not precise enough to verify the radius yet — keep waiting for a better fix.
    if (c.accuracy > MAX_ACCURACY_M) {
      setPending(true)
      return
    }

    // Strict geofence, padded by the fix's accuracy (capped at the radius so a
    // poor fix can't wave someone in from far away).
    const padding = Math.min(c.accuracy, selectedEvent.radius)
    if (!isWithinRadius(selectedEvent.location.lat, selectedEvent.location.lng, c.latitude, c.longitude, selectedEvent.radius, padding)) {
      setPending(false)
      setError('You are not close enough to the field')
      return
    }

    submitGuardRef.current = true
    setPending(false)
    setLoading(true)
    setError('')

    const fullName = buildFullName(firstName, lastName)

    // Duplicate check
    try {
      const dupSnap = await getDocs(query(
        collection(db, 'checkins'),
        where('eventId', '==', selectedEvent.id),
        where('fullName', '==', fullName)
      ))
      if (!dupSnap.empty) {
        setError('You have already checked in')
        setLoading(false); submitGuardRef.current = false; return
      }
    } catch {
      if (!mountedRef.current) return
      setError('Could not verify your check-in status, please try again')
      setLoading(false); submitGuardRef.current = false; return
    }

    // Team assignment (first 20 alternate orange/yellow)
    let team: 'yellow' | 'orange' | null = null
    try {
      const countSnap = await getCountFromServer(query(
        collection(db, 'checkins'),
        where('eventId', '==', selectedEvent.id)
      ))
      const position = countSnap.data().count + 1
      if (position <= 20) team = position % 2 !== 0 ? 'orange' : 'yellow'
    } catch {
      if (!mountedRef.current) return
      setError('Could not verify your check-in status, please try again')
      setLoading(false); submitGuardRef.current = false; return
    }

    // Write check-in
    try {
      await addDoc(collection(db, 'checkins'), {
        eventId: selectedEvent.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        timestamp: serverTimestamp(),
        coords: { lat: c.latitude, lng: c.longitude },
        team,
      })
    } catch {
      if (!mountedRef.current) return
      setError('Something went wrong, please try again')
      setLoading(false); submitGuardRef.current = false; return
    }

    const time = new Date().toLocaleTimeString()
    const stored: StoredCheckin = {
      eventId: selectedEvent.id, fullName,
      firstName: firstName.trim(), lastName: lastName.trim(), time, team,
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    if (!mountedRef.current) return
    setConfirmed(stored)
    setLoading(false)
  }, [selectedEvent, firstName, lastName])

  // Auto-complete: once the player has tapped, finish the moment a usable fix lands.
  useEffect(() => {
    if (pending && coords && !submitGuardRef.current) runCheckin(coords)
  }, [pending, coords, runCheckin])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) return
    if (!validateName(firstName) || !validateName(lastName)) {
      setError('Please enter a valid first and last name (2–50 characters)')
      return
    }
    setError('')
    if (locationDenied && !coords) {
      setError('Location access was denied — please allow location in your browser settings and try again')
      return
    }
    // If a usable fix is already in hand, this completes instantly; otherwise we
    // mark intent and the effect above finishes as soon as a fix arrives.
    if (coords && coords.accuracy <= MAX_ACCURACY_M) {
      runCheckin(coords)
    } else {
      setPending(true)
    }
  }

  if (status === 'loading') return <p style={{ padding: 24 }}>Loading...</p>
  if (status === 'error') return <p style={{ padding: 24 }}>Could not load event, please check your connection and refresh</p>

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

  if (status === 'no-event' || events.length === 0) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>No active event right now</p>
      </div>
    )
  }

  // Multiple events — show picker first
  if (events.length > 1 && !selectedEvent) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 24 }}>Select Your Event</h1>
        {events.map(ev => (
          <button
            key={ev.id}
            onClick={() => setSelectedEvent(ev)}
            style={{
              display: 'block', width: '100%', padding: 16, marginBottom: 12,
              textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 8, cursor: 'pointer'
            }}
          >
            <strong>{ev.name}</strong>
            <span style={{ display: 'block', color: '#666', fontSize: 14, marginTop: 4 }}>
              {ev.date.toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    )
  }

  if (!selectedEvent) return null

  const acc = coords?.accuracy
  const locationReady = coords != null && acc != null && acc <= MAX_ACCURACY_M
  const statusText = locationDenied
    ? '⚠ Location access denied — check browser settings'
    : locationReady
      ? `✓ Location ready${acc ? ` (±${Math.round(acc)}m)` : ''}`
      : coords
        ? `⟳ Improving GPS accuracy${acc ? ` (±${Math.round(acc)}m)` : ''}…`
        : '⟳ Getting your location…'

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 8 }}>{selectedEvent.name}</h1>
      <p style={{ color: '#666', marginBottom: 4 }}>{selectedEvent.date.toLocaleDateString()}</p>
      <p style={{ fontSize: 13, marginBottom: 20, color: locationDenied ? '#dc2626' : locationReady ? '#059669' : '#f59e0b' }}>
        {statusText}
      </p>
      {events.length > 1 && (
        <button onClick={() => { setSelectedEvent(null); setError(''); setPending(false) }}
          style={{ marginBottom: 16, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}>
          ← Back to events
        </button>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            maxLength={50}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            maxLength={50}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || pending}
          style={{ width: '100%', padding: 16, fontSize: 18, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          {loading ? 'Checking in…' : pending ? 'Locating you…' : 'I Am Here'}
        </button>
        {pending && (
          <p style={{ fontSize: 13, color: '#666', marginTop: 10, textAlign: 'center' }}>
            Getting a precise location — this finishes on its own. For a faster lock, step outside, away from buildings.
          </p>
        )}
      </form>
    </div>
  )
}
