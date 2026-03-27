import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet'
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
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
