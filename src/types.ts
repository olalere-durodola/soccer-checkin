export interface Event {
  id: string
  name: string
  date: Date
  location: { lat: number; lng: number }
  radius: number        // meters, default 15, min 10, max 500
  active: boolean
  createdAt: Date
  closedAt: Date | null
}

export interface Checkin {
  id: string
  eventId: string
  firstName: string     // as-entered (mixed case)
  lastName: string      // as-entered (mixed case)
  fullName: string      // "firstname lastname" lowercased, for duplicate detection
  timestamp: Date
  coords: { lat: number; lng: number }
}

export interface Admin {
  email: string
  createdAt: Date
}
