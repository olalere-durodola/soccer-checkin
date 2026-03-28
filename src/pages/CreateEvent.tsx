import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, useMapEvents, useMap } from 'react-leaflet'
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

interface LatLng { lat: number; lng: number }

function LocationPicker({ onPick }: { onPick: (ll: LatLng) => void }) {
  useMapEvents({ click: e => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function MapFlyTo({ center }: { center: LatLng | null }) {
  const map = useMap()
  if (center) map.flyTo([center.lat, center.lng], 18)
  return null
}

export function CreateEvent() {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState<LatLng | null>(null)
  const [radius, setRadius] = useState(15)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [flyTo, setFlyTo] = useState<LatLng | null>(null)
  const navigate = useNavigate()

  const handleAddressSearch = async () => {
    if (!address.trim()) return
    setAddressError('')
    setSearchLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const results = await res.json()
      if (!results.length) {
        setAddressError('Address not found, try a more specific search')
      } else {
        const ll: LatLng = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
        setLocation(ll)
        setFlyTo(ll)
      }
    } catch {
      setAddressError('Could not search address, please try again')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!location) { setError('Please pin a location on the map'); return }
    if (!name.trim()) { setError('Please enter an event name'); return }
    setError('')
    setLoading(true)
    try {
      const batch = writeBatch(db)
      const newEventRef = doc(collection(db, 'events'))
      batch.set(newEventRef, {
        name: name.trim(),
        date: (() => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d) })(),
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

        <div style={{ marginBottom: 12 }}>
          <label>Search Address</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
              placeholder="e.g. Central Park, New York"
              style={{ flex: 1, padding: 8 }}
            />
            <button type="button" onClick={handleAddressSearch} disabled={searchLoading}
              style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4 }}>
              {searchLoading ? '...' : 'Search'}
            </button>
          </div>
          {addressError && <p style={{ color: 'red', marginTop: 4, fontSize: 14 }}>{addressError}</p>}
        </div>

        <p style={{ marginBottom: 8, color: '#666' }}>Or click the map to pin the field location</p>
        <div style={{ height: 350, marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 4 }}>
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker onPick={ll => { setLocation(ll); setFlyTo(null) }} />
            <MapFlyTo center={flyTo} />
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
