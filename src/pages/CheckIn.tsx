import { useState, useEffect, useRef } from 'react'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useActiveEvent } from '../hooks/useActiveEvent'
import { validateName, buildFullName } from '../utils/validation'
import { isWithinRadius } from '../utils/geo'
import type { Event } from '../types'

const LOCAL_KEY = 'checkin_state'

interface StoredCheckin {
  eventId: string
  fullName: string
  firstName: string
  lastName: string
  time: string
}

export function CheckIn() {
  const { events, status } = useActiveEvent()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState<StoredCheckin | null>(null)

  // Background location state
  const [locationReady, setLocationReady] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const coordsRef = useRef<GeolocationCoordinates | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

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

  // Start watching location as soon as the form is visible
  useEffect(() => {
    if (!selectedEvent) return
    if (!navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        coordsRef.current = pos.coords
        setLocationReady(true)
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setLocationDenied(true)
        }
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 30000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [selectedEvent?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) return
    if (!validateName(firstName) || !validateName(lastName)) {
      setError('Please enter a valid first and last name (2–50 characters)')
      return
    }
    setError('')
    setLoading(true)

    // 1. Get coords (already acquired in background)
    const coords = coordsRef.current
    if (!coords) {
      if (locationDenied) {
        setError('Location access was denied — please allow location in your browser settings and try again')
      } else {
        setError('Still getting your location, please wait a moment and try again')
      }
      setLoading(false)
      return
    }

    // 2. Check geofence
    if (!isWithinRadius(selectedEvent.location.lat, selectedEvent.location.lng, coords.latitude, coords.longitude, selectedEvent.radius)) {
      setError('You are not close enough to the field')
      setLoading(false)
      return
    }

    // 4. Check duplicate
    const fullName = buildFullName(firstName, lastName)
    try {
      const dupSnap = await getDocs(query(
        collection(db, 'checkins'),
        where('eventId', '==', selectedEvent.id),
        where('fullName', '==', fullName)
      ))
      if (!dupSnap.empty) {
        setError('You have already checked in')
        setLoading(false)
        return
      }
    } catch {
      if (!mountedRef.current) return
      setError('Could not verify your check-in status, please try again')
      setLoading(false)
      return
    }

    // 5. Write check-in
    try {
      await addDoc(collection(db, 'checkins'), {
        eventId: selectedEvent.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        timestamp: serverTimestamp(),
        coords: { lat: coords.latitude, lng: coords.longitude },
      })
    } catch {
      if (!mountedRef.current) return
      setError('Something went wrong, please try again')
      setLoading(false)
      return
    }

    // 6. Update localStorage and show confirmation
    const time = new Date().toLocaleTimeString()
    const stored: StoredCheckin = {
      eventId: selectedEvent.id,
      fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      time,
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    if (!mountedRef.current) return
    setConfirmed(stored)
    setLoading(false)
  }

  if (status === 'loading') return <p style={{ padding: 24 }}>Loading...</p>
  if (status === 'error') return <p style={{ padding: 24 }}>Could not load event, please check your connection and refresh</p>

  if (confirmed) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ color: 'green', marginBottom: 16 }}>✓ You're checked in!</h1>
        <p>{confirmed.firstName} {confirmed.lastName} at {confirmed.time}</p>
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

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ marginBottom: 8 }}>{selectedEvent.name}</h1>
      <p style={{ color: '#666', marginBottom: 4 }}>{selectedEvent.date.toLocaleDateString()}</p>
      <p style={{ fontSize: 13, marginBottom: 20, color: locationDenied ? '#dc2626' : locationReady ? '#059669' : '#f59e0b' }}>
        {locationDenied ? '⚠ Location access denied — check browser settings' : locationReady ? '✓ Location ready' : '⟳ Getting your location...'}
      </p>
      {events.length > 1 && (
        <button onClick={() => { setSelectedEvent(null); setError('') }}
          style={{ marginBottom: 16, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}>
          ← Back to events
        </button>
      )}
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
