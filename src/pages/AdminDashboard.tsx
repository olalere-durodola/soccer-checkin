import { useState, useEffect, useRef } from 'react'
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

/** Animates the displayed number from its previous value to the new one. */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    const to = value
    if (reduce || from === to) { setDisplay(to); fromRef.current = to; return }
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / 500)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{display}</>
}

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

  const first20 = checkins.slice(0, 20).map((c, i) => ({ c, pos: i + 1 }))
  const yellow = first20.filter(({ c }) => c.team === 'yellow')
  const orange = first20.filter(({ c }) => c.team === 'orange')

  return (
    <section style={{ marginBottom: 30, borderBottom: '1px solid var(--line)', paddingBottom: 26 }}>
      {connectionLost && <ConnectionBanner />}
      <div className="bar" style={{ marginBottom: 14 }}>
        <div>
          <span className="live"><span className="dot" />Live</span>
          <h2 style={{ fontSize: 24, textTransform: 'uppercase', marginTop: 2 }}>{event.name}</h2>
          <p style={{ color: 'var(--muted)', fontWeight: 600 }}>{event.date.toLocaleDateString()}</p>
        </div>
        <div className="row-actions">
          <button className="btn btn--outline" onClick={() => downloadCsv(checkins, event.name)}>Export CSV</button>
          <button className="btn btn--outline" onClick={() => downloadPdf(checkins, event.name, event.date)}>Export PDF</button>
          <button className="btn btn--danger" onClick={() => setShowConfirm(true)}>Close</button>
        </div>
      </div>
      {closeError && <p className="error-text">{closeError}</p>}

      <div className="scoreboard">
        <span className="count"><CountUp value={checkins.length} /></span>
        <span className="count-label">checked in</span>
      </div>

      {checkins.length === 0 ? (
        <div className="card card-pad empty" style={{ marginTop: 14 }}>No check-ins yet — share the link or QR with players.</div>
      ) : (
        <>
          <div className="teams">
            <div className="team-panel team-panel--yellow">
              <div className="team-head">🟡 Yellow <span className="team-count">{yellow.length}</span></div>
              {yellow.length === 0
                ? <div className="waiting"><span className="dot" />Waiting for players…</div>
                : yellow.map(({ c, pos }) => (
                  <div key={c.id} className="player">
                    <span className="num">{pos}</span><span className="nm">{c.firstName} {c.lastName}</span>
                    <span className="tm">{c.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                ))}
            </div>
            <div className="team-panel team-panel--orange">
              <div className="team-head">🟠 Orange <span className="team-count">{orange.length}</span></div>
              {orange.length === 0
                ? <div className="waiting"><span className="dot" />Waiting for players…</div>
                : orange.map(({ c, pos }) => (
                  <div key={c.id} className="player">
                    <span className="num">{pos}</span><span className="nm">{c.firstName} {c.lastName}</span>
                    <span className="tm">{c.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                ))}
            </div>
          </div>

          {checkins.length > 20 && (
            <div className="card card-pad" style={{ marginTop: 4 }}>
              <div className="section-label">Waitlist — no team ({checkins.length - 20})</div>
              {checkins.slice(20).map((c, i) => (
                <div key={c.id} className="player">
                  <span className="num">{21 + i}</span><span className="nm">{c.firstName} {c.lastName}</span>
                  <span className="tm">{c.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showConfirm && (
        <ConfirmModal
          message="Close this game? Players will no longer be able to check in."
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
    <div className="screen screen-wide">
      <div className="bar">
        <h1>Matchday</h1>
        <div className="row-actions">
          <button className="btn btn--primary" onClick={() => navigate('/admin/create')}>New Game</button>
          <button className="btn btn--outline" onClick={logout}>Log Out</button>
        </div>
      </div>

      {status === 'loading' && <p className="empty">Loading…</p>}
      {status === 'loaded' && events.map(event => (
        <ActiveEventSection
          key={event.id}
          event={event}
          onClosed={() => setRefreshKey(k => k + 1)}
        />
      ))}
      {status === 'no-event' && (
        <div className="card card-pad empty" style={{ marginBottom: 28 }}>No active game. Create one to get started.</div>
      )}

      {pastEventsWithCounts.length > 0 && (
        <section>
          <div className="section-label">Past games</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Game</th><th>Date</th><th>Check-ins</th><th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {pastEventsWithCounts.map(e => (
                  <tr key={e.id}>
                    <td><Link to={`/admin/events/${e.id}`}>{e.name}</Link></td>
                    <td>{e.date.toLocaleDateString()}</td>
                    <td>{e.checkinCount}</td>
                    <td>{e.closedAt?.toLocaleString() ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
