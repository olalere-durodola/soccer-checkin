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

function ActiveEventSection({ event, onClosed }: { event: Event; onClosed: () => void }) {
  const { checkins, connectionLost } = useCheckins(event.id)
  const [showConfirm, setShowConfirm] = useState(false)
  const [closeError, setCloseError] = useState('')

  const handleClose = async () => {
    setCloseError('')
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'events', event.id), { active: false, closedAt: serverTimestamp() })
      await batch.commit()
      setShowConfirm(false)
      onClosed()
    } catch {
      setCloseError('Failed to close event, please try again')
    }
  }

  return (
    <section style={{ marginBottom: 32, borderBottom: '1px solid #e5e7eb', paddingBottom: 32 }}>
      {connectionLost && <ConnectionBanner />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2>{event.name}</h2>
          <p style={{ color: '#666' }}>{event.date.toLocaleDateString()}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => downloadCsv(checkins, event.name)}>Export CSV</button>
          <button onClick={() => downloadPdf(checkins, event.name, event.date)}>Export PDF</button>
          <button onClick={() => setShowConfirm(true)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4 }}>
            Close Event
          </button>
        </div>
      </div>
      {closeError && <p style={{ color: 'red', marginBottom: 12 }}>{closeError}</p>}

      <p style={{ marginBottom: 12, color: '#666' }}>{checkins.length} checked in</p>

      {checkins.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 16 }}>No check-ins yet</div>
      ) : (
        <>
          {/* Team panels — first 20 check-ins */}
          <div style={{ display: 'flex', gap: 16, marginBottom: checkins.length > 20 ? 16 : 0 }}>
            {/* Yellow team */}
            {checkins.some((c, i) => i < 20 && c.team === 'yellow') && (
              <div style={{ flex: 1, background: '#fef9c3', borderRadius: 6, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: 8 }}>
                  🟡 Yellow ({checkins.slice(0, 20).filter(c => c.team === 'yellow').length})
                </div>
                {checkins.slice(0, 20)
                  .map((c, i) => ({ c, pos: i + 1 }))
                  .filter(({ c }) => c.team === 'yellow')
                  .map(({ c, pos }) => (
                    <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
                      {pos}. {c.firstName} {c.lastName} — {c.timestamp.toLocaleTimeString()}
                    </div>
                  ))}
              </div>
            )}

            {/* Orange team */}
            {checkins.some((c, i) => i < 20 && c.team === 'orange') && (
              <div style={{ flex: 1, background: '#fff7ed', borderRadius: 6, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: 8 }}>
                  🟠 Orange ({checkins.slice(0, 20).filter(c => c.team === 'orange').length})
                </div>
                {checkins.slice(0, 20)
                  .map((c, i) => ({ c, pos: i + 1 }))
                  .filter(({ c }) => c.team === 'orange')
                  .map(({ c, pos }) => (
                    <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
                      {pos}. {c.firstName} {c.lastName} — {c.timestamp.toLocaleTimeString()}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* No-team list — positions 21+ */}
          {checkins.length > 20 && (
            <div>
              <div style={{ fontWeight: 600, color: '#666', marginBottom: 8 }}>
                No team assigned ({checkins.length - 20})
              </div>
              {checkins.slice(20).map((c, i) => (
                <div key={c.id} style={{ fontSize: 13, marginBottom: 4 }}>
                  {21 + i}. {c.firstName} {c.lastName} — {c.timestamp.toLocaleTimeString()}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showConfirm && (
        <ConfirmModal
          message="Are you sure you want to close this event? Players will no longer be able to check in."
          onConfirm={handleClose}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </section>
  )
}

export function AdminDashboard() {
  const { logout } = useAuth()
  const { events, status } = useActiveEvent()
  const [pastEventsWithCounts, setPastEventsWithCounts] = useState<(Event & { checkinCount: number })[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
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
        const evts: Event[] = snap.docs.map(d => {
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
        const counts = await Promise.all(
          evts.map(e =>
            getDocs(query(collection(db, 'checkins'), where('eventId', '==', e.id)))
              .then(s => s.size)
              .catch(() => 0)
          )
        )
        setPastEventsWithCounts(evts.map((e, i) => ({ ...e, checkinCount: counts[i] })))
      } catch {
        // silently show no past events on error
      }
    }
    fetchPast()
  }, [events.length, refreshKey])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/admin/create')}>New Event</button>
          <button onClick={logout}>Log Out</button>
        </div>
      </div>

      {status === 'loading' && <p>Loading...</p>}
      {status === 'loaded' && events.map(event => (
        <ActiveEventSection
          key={event.id}
          event={event}
          onClosed={() => setRefreshKey(k => k + 1)}
        />
      ))}
      {status === 'no-event' && <p style={{ marginBottom: 32, color: '#666' }}>No active event. Create one to get started.</p>}

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
    </div>
  )
}
