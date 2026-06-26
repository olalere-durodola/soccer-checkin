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
  const [radius, setRadius] = useState(50)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [flyTo, setFlyTo] = useState<LatLng | null>(null)
  const navigate = useNavigate()

  // OpenStreetMap — good worldwide, but often missing exact residential house numbers
  const geocodeNominatim = async (q: string): Promise<LatLng | null> => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const results = await res.json()
    if (Array.isArray(results) && results.length) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
    }
    return null
  }

  // US Census geocoder — free, no key, excellent at exact US street addresses.
  // It sends no CORS header, so `fetch` is blocked in the browser; we load it
  // via JSONP (a <script> tag) instead, which isn't subject to CORS.
  const geocodeCensus = (q: string): Promise<LatLng | null> =>
    new Promise((resolve) => {
      const cb = `__censusCb_${Date.now()}`
      const win = window as unknown as Record<string, unknown>
      const script = document.createElement('script')
      let settled = false
      let timer = 0
      const finish = (ll: LatLng | null) => {
        if (settled) return
        settled = true
        delete win[cb]
        script.remove()
        clearTimeout(timer)
        resolve(ll)
      }
      win[cb] = (data: { result?: { addressMatches?: Array<{ coordinates?: { x: number; y: number } }> } }) => {
        const m = data?.result?.addressMatches?.[0]
        finish(m?.coordinates ? { lat: m.coordinates.y, lng: m.coordinates.x } : null)
      }
      timer = window.setTimeout(() => finish(null), 8000)
      script.onerror = () => finish(null)
      script.src = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=jsonp&callback=${cb}`
      document.body.appendChild(script)
    })

  const handleAddressSearch = async () => {
    if (!address.trim()) return
    setAddressError('')
    setSearchLoading(true)
    try {
      // Try OSM first (worldwide); fall back to the US Census geocoder for
      // exact US street addresses OSM doesn't have.
      let ll = await geocodeNominatim(address).catch(() => null)
      if (!ll) ll = await geocodeCensus(address).catch(() => null)
      if (!ll) {
        setAddressError("Couldn't find that address. Try a nearby park or landmark, or just click the map to drop a pin.")
      } else {
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
    <div className="screen" style={{ maxWidth: 700 }}>
      <div className="kicker">Matchday</div>
      <h1 style={{ fontSize: 34, textTransform: 'uppercase', margin: '4px 0 22px' }}>New Game</h1>
      <form onSubmit={handleActivate}>
        <div className="field">
          <label className="label">Game Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Saturday Pick-up" />
        </div>
        <div className="field">
          <label className="label">Date</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">Check-in radius: {radius}m <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(min 10, max 500)</span></label>
          <input type="range" min={10} max={500} value={radius} onChange={e => setRadius(Number(e.target.value))}
            style={{ display: 'block', width: '100%', marginTop: 4 }} />
        </div>

        <div className="field">
          <label className="label">Search Address</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
              placeholder="e.g. 6409 Everest Dr, Aubrey TX"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn--outline" onClick={handleAddressSearch} disabled={searchLoading}>
              {searchLoading ? '…' : 'Search'}
            </button>
          </div>
          {addressError && <p className="error-text" style={{ marginTop: 6, marginBottom: 0 }}>{addressError}</p>}
        </div>

        <p style={{ marginBottom: 8, color: 'var(--muted)', fontSize: 14 }}>Or click the map to pin the field location</p>
        <div style={{ height: 350, marginBottom: 16, border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker onPick={ll => { setLocation(ll); setFlyTo(null) }} />
            <MapFlyTo center={flyTo} />
            {location && <Circle center={[location.lat, location.lng]} radius={radius} />}
          </MapContainer>
        </div>
        {location && <p style={{ color: '#0B7C4A', marginBottom: 12, fontWeight: 600 }}>
          ✓ Location pinned: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </p>}

        {error && <p className="error-text">{error}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn--outline" onClick={() => navigate('/admin')}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Activating…' : 'Activate Game'}
          </button>
        </div>
      </form>

    </div>
  )
}
