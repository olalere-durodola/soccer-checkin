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
  const [pastEventsWithCounts, setPastEventsWithCounts] = useState<(Event & { checkinCount: number })[]>([])
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closingError, setClosingError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPast = async () => {
      try {
        const q = query(
          collection(db, 'events'),
          where('active', '==', false),
          orderBy('date', 'desc')
        )
        const snap = await getDocs(q)
        const events: Event[] = snap.docs.map(d => {
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
        })

        // Fetch check-in counts in parallel
        const counts = await Promise.all(
          events.map(e =>
            getDocs(query(collection(db, 'checkins'), where('eventId', '==', e.id)))
              .then(s => s.size)
              .catch(() => 0)
          )
        )
        setPastEventsWithCounts(events.map((e, i) => ({ ...e, checkinCount: counts[i] })))
      } catch {
        // network/permission error — silently show no past events
      }
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
      {pastEventsWithCounts.length > 0 && (
        <section>
          <h2 style={{ marginBottom: 16 }}>Past Events</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Check-ins</th>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Closed</th>
              </tr>
            </thead>
            <tbody>
              {pastEventsWithCounts.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 4px' }}>
                    <Link to={`/admin/events/${e.id}`}>{e.name}</Link>
                  </td>
                  <td style={{ padding: '8px 4px' }}>{e.date.toLocaleDateString()}</td>
                  <td style={{ padding: '8px 4px' }}>{e.checkinCount}</td>
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
