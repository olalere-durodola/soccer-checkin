import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import type { Checkin } from '../types'

interface CheckinsState {
  checkins: Checkin[]
  loading: boolean
  connectionLost: boolean
}

export function useCheckins(eventId: string | null): CheckinsState {
  const [state, setState] = useState<CheckinsState>({ checkins: [], loading: true, connectionLost: false })

  useEffect(() => {
    if (!eventId) {
      setState({ checkins: [], loading: false, connectionLost: false })
      return
    }

    const q = query(
      collection(db, 'checkins'),
      where('eventId', '==', eventId),
      orderBy('timestamp', 'asc')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const checkins: Checkin[] = snap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            eventId: data.eventId,
            firstName: data.firstName,
            lastName: data.lastName,
            fullName: data.fullName,
            timestamp: data.timestamp?.toDate() ?? new Date(),
            coords: data.coords,
          }
        })
        setState({ checkins, loading: false, connectionLost: false })
      },
      () => setState(prev => ({ ...prev, loading: false, connectionLost: true }))
    )

    return unsub
  }, [eventId])

  return state
}
