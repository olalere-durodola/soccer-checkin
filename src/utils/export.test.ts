import { describe, it, expect } from 'vitest'
import { buildCsvContent } from './export'
import type { Checkin } from '../types'

const base = { id: '1', eventId: 'evt1', fullName: 'john smith', timestamp: new Date('2026-03-27T10:00:00'), coords: { lat: 51.5, lng: -0.1 } }

const mockCheckins: Checkin[] = [
  { ...base, id: '1', firstName: 'John', lastName: 'Smith', fullName: 'john smith', team: 'yellow' },
  { ...base, id: '2', firstName: 'Jane', lastName: 'Doe',   fullName: 'jane doe',   team: 'orange' },
  { ...base, id: '3', firstName: 'Bob',  lastName: 'Jones', fullName: 'bob jones',  team: null },
]

describe('buildCsvContent', () => {
  it('includes updated header row', () => {
    const csv = buildCsvContent(mockCheckins)
    expect(csv).toContain('#,First Name,Last Name,Team,Time')
  })

  it('includes yellow team label', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[1]).toContain('1,John,Smith,Yellow')
  })

  it('includes orange team label', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[2]).toContain('2,Jane,Doe,Orange')
  })

  it('leaves team blank for null', () => {
    const csv = buildCsvContent(mockCheckins)
    const lines = csv.trim().split('\n')
    expect(lines[3]).toContain('3,Bob,Jones,,')
  })

  it('leaves team blank for undefined (backward compat)', () => {
    const checkin: Checkin = { ...base, id: '4', firstName: 'Al', lastName: 'Xu', fullName: 'al xu' }
    const csv = buildCsvContent([checkin])
    const lines = csv.trim().split('\n')
    expect(lines[1]).toContain('1,Al,Xu,,')
  })

  it('returns only header for empty list', () => {
    const csv = buildCsvContent([])
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('#,First Name,Last Name,Team,Time')
  })
})
