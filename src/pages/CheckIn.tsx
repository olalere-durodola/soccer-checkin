import { useState, useEffect, useRef, useCallback } from 'react'
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useActiveEvent } from '../hooks/useActiveEvent'
import { validateName, buildFullName } from '../utils/validation'
import { isWithinRadius } from '../utils/geo'
import { teamForPosition } from '../utils/teams'
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

    // Atomic team assignment + write. A transaction serialises concurrent
    // check-ins on the per-event counter, so every player gets a unique
    // position → alternation never collides and teams stay balanced.
    let team: 'yellow' | 'orange' | null = null
    try {
      const counterRef = doc(db, 'counters', selectedEvent.id)
      const checkinRef = doc(collection(db, 'checkins'))
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef)
        const position = (snap.exists() ? (snap.data().count as number) : 0) + 1
        team = teamForPosition(position)
        if (snap.exists()) tx.update(counterRef, { count: position })
        else tx.set(counterRef, { count: position })
        tx.set(checkinRef, {
          eventId: selectedEvent.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          timestamp: serverTimestamp(),
          coords: { lat: c.latitude, lng: c.longitude },
          team,
          position,
        })
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

  if (status === 'loading') return <div className="screen"><p className="empty">Loading…</p></div>
  if (status === 'error') return <div className="screen"><p className="empty">Couldn't load the game — check your connection and refresh.</p></div>

  // Full-screen team reveal
  if (confirmed) {
    const team = confirmed.team
    const revealCls = team === 'yellow' ? 'reveal--yellow' : team === 'orange' ? 'reveal--orange' : 'reveal--neutral'
    return (
      <div className={`reveal ${revealCls}`}>
        <div className="reveal-check">✓</div>
        <div className="reveal-kicker">You're in</div>
        <div className="reveal-name">{confirmed.firstName}</div>
        {team ? (
          <div className="reveal-team">{team === 'yellow' ? '🟡' : '🟠'} Team {team}</div>
        ) : (
          <div className="reveal-note">You're checked in — team assigned at the field.</div>
        )}
        <div className="reveal-time">{confirmed.firstName} {confirmed.lastName} · {confirmed.time}</div>
      </div>
    )
  }

  if (status === 'no-event' || events.length === 0) {
    return (
      <div className="screen">
        <div className="card card-pad empty" style={{ marginTop: 40 }}>No active game right now.</div>
      </div>
    )
  }

  // Multiple events — show picker first
  if (events.length > 1 && !selectedEvent) {
    return (
      <div className="screen">
        <div className="kicker">Pick-up game</div>
        <h1 style={{ fontSize: 34, textTransform: 'uppercase', margin: '4px 0 20px' }}>Select your game</h1>
        {events.map(ev => (
          <button
            key={ev.id}
            onClick={() => setSelectedEvent(ev)}
            className="card card-pad"
            style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 12 }}
          >
            <strong style={{ fontSize: 17 }}>{ev.name}</strong>
            <span style={{ display: 'block', color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
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
  const statusCls = locationDenied ? 'status--err' : locationReady ? 'status--ok' : 'status--warn'
  const statusText = locationDenied
    ? 'Location off — turn it on in settings'
    : locationReady
      ? `Location ready${acc ? ` · ±${Math.round(acc)}m` : ''}`
      : coords
        ? `Sharpening GPS${acc ? ` · ±${Math.round(acc)}m` : ''}…`
        : 'Getting your location…'

  return (
    <div className="screen checkin-screen">
      {events.length > 1 && (
        <button className="btn--ghost" onClick={() => { setSelectedEvent(null); setError(''); setPending(false) }}
          style={{ border: 'none', background: 'none', marginBottom: 8 }}>
          ← All games
        </button>
      )}

      <div className="checkin-hero">
        <div className="kicker">Check in</div>
        <h1 className="event-name">
          <svg className="ball" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="#fff" stroke="#0E1116" strokeWidth="1.5" />
            <polygon points="16,10 21.7,14.15 19.53,20.85 12.47,20.85 10.3,14.15" fill="#0E1116" />
            <g stroke="#0E1116" strokeWidth="1.5">
              <line x1="16" y1="10" x2="16" y2="3.5" />
              <line x1="21.7" y1="14.15" x2="27.5" y2="11.5" />
              <line x1="19.53" y1="20.85" x2="23.5" y2="26.5" />
              <line x1="12.47" y1="20.85" x2="8.5" y2="26.5" />
              <line x1="10.3" y1="14.15" x2="4.5" y2="11.5" />
            </g>
          </svg>
          {selectedEvent.name}
        </h1>
        <p className="event-date">{selectedEvent.date.toLocaleDateString()}</p>
        <span className={`status ${statusCls}`}><span className="dot" />{statusText}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="firstName">First Name</label>
          <input id="firstName" className="input" value={firstName}
            onChange={e => setFirstName(e.target.value)} maxLength={50} autoComplete="given-name" />
        </div>
        <div className="field">
          <label className="label" htmlFor="lastName">Last Name</label>
          <input id="lastName" className="input" value={lastName}
            onChange={e => setLastName(e.target.value)} maxLength={50} autoComplete="family-name" />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn--hero" disabled={loading || pending}>
          {loading ? 'Checking in…' : pending ? 'Locating you…' : 'I Am Here'}
        </button>
        {pending ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
            Getting a precise location — this finishes on its own. For a faster lock, step outside, away from buildings.
          </p>
        ) : locationReady ? (
          <p className="field-hint">Tap when you're on the field.</p>
        ) : null}
      </form>
    </div>
  )
}
