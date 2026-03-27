import { describe, it, expect } from 'vitest'
import { buildCsvContent } from './export'
import type { Checkin } from '../types'

const mockCheckins: Checkin[] = [
  { id: '1', eventId: 'evt1', firstName: 'John', lastName: 'Smith', fullName: 'john smith', timestamp: new Date('2026-03-27T10:00:00'), coords: { lat: 51.5, lng: -0.1 } },
  { id: '2', eventId: 'evt1', firstName: 'Jane', lastName: 'Doe', fullName: 'jane doe', timestamp: new Date('2026-03-27T10:05:00'), coords: { lat: 51.5, lng: -0.1 } },
]

describe('buildCsvContent', () => {
  it('includes header row', () => {
    const csv = buildCsvContent(mockCheckins)
    expect(csv).toContain('#,First Name,Last Name,Time')
  })
  it('includes player rows in order', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[1]).toContain('1,John,Smith')
    expect(lines[2]).toContain('2,Jane,Doe')
  })
  it('returns only header for empty list', () => {
    const csv = buildCsvContent([])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('#,First Name,Last Name,Time')
  })
})
