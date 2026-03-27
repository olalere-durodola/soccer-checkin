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
    getDoc(doc(db, 'events', eventId))
      .then(snap => {
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
      .catch(() => {
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
