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
        <p>{confirmed.firstName} {confirmed.lastName} at {confirmed.time}</p>
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
