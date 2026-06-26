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
    <div className="screen screen-wide">
      <button className="btn--ghost" onClick={() => navigate('/admin')} style={{ border: 'none', background: 'none', marginBottom: 8 }}>← Back</button>
      <div className="bar" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 30, textTransform: 'uppercase' }}>{event.name}</h1>
          <p style={{ color: 'var(--muted)', fontWeight: 600 }}>{event.date.toLocaleDateString()}</p>
          {event.closedAt && <p style={{ color: 'var(--faint)', fontSize: 13 }}>Closed: {event.closedAt.toLocaleString()}</p>}
        </div>
        <div className="row-actions">
          <button className="btn btn--outline" onClick={() => downloadCsv(checkins, event.name)}>Export CSV</button>
          <button className="btn btn--outline" onClick={() => downloadPdf(checkins, event.name, event.date)}>Export PDF</button>
        </div>
      </div>

      <div className="scoreboard"><span className="count">{checkins.length}</span><span className="count-label">checked in</span></div>

      <div className="card" style={{ overflow: 'hidden', marginTop: 14 }}>
        <table className="table">
          <thead>
            <tr><th style={{ width: 40 }}>#</th><th>First Name</th><th>Last Name</th><th>Time</th></tr>
          </thead>
          <tbody>
            {checkins.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td>{c.firstName}</td>
                <td>{c.lastName}</td>
                <td>{c.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
