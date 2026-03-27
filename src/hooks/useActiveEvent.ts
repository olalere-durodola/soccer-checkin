import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { db } from '../firebase'
import type { Event } from '../types'

type Status = 'loading' | 'no-event' | 'loaded' | 'error'

interface ActiveEventState {
  event: Event | null
  status: Status
}

export function useActiveEvent(): ActiveEventState {
  const [state, setState] = useState<ActiveEventState>({ event: null, status: 'loading' })

  useEffect(() => {
    const q = query(collection(db, 'events'), where('active', '==', true), limit(1))
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setState({ event: null, status: 'no-event' })
        } else {
          const d = snap.docs[0]
          const data = d.data()
          setState({
            event: {
              id: d.id,
              name: data.name,
              date: data.date.toDate(),
              location: data.location,
              radius: data.radius,
              active: data.active,
              createdAt: data.createdAt.toDate(),
              closedAt: data.closedAt?.toDate() ?? null,
            },
            status: 'loaded',
          })
        }
      },
      () => setState({ event: null, status: 'error' })
    )
    return unsub
  }, [])

  return state
}
