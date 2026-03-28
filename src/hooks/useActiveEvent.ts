import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import type { Event } from '../types'

type Status = 'loading' | 'no-event' | 'loaded' | 'error'

interface ActiveEventsState {
  events: Event[]
  status: Status
}

export function useActiveEvent(): ActiveEventsState {
  const [state, setState] = useState<ActiveEventsState>({ events: [], status: 'loading' })

  useEffect(() => {
    const q = query(collection(db, 'events'), where('active', '==', true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setState({ events: [], status: 'no-event' })
        } else {
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
          setState({ events, status: 'loaded' })
        }
      },
      () => setState({ events: [], status: 'error' })
    )
    return unsub
  }, [])

  return state
}
