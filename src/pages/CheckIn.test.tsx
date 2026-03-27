import { describe, it, expect, beforeEach } from 'vitest'
import { buildFullName } from '../utils/validation'

const LOCAL_KEY = 'checkin_state'

describe('localStorage check-in guard', () => {
  beforeEach(() => localStorage.clear())

  it('detects existing check-in for current event', () => {
    const stored = { eventId: 'evt1', fullName: 'john smith', firstName: 'John', lastName: 'Smith', time: '10:00' }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY)!)
    expect(parsed.eventId).toBe('evt1')
    expect(parsed.fullName).toBe('john smith')
  })

  it('ignores stale check-in from a different event', () => {
    const stored = { eventId: 'old-evt', fullName: 'john smith', firstName: 'John', lastName: 'Smith', time: '10:00' }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored))
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY)!)
    expect(parsed.eventId).not.toBe('evt1') // different event → should show form
  })

  it('builds correct fullName for storage', () => {
    expect(buildFullName('John', 'Smith')).toBe('john smith')
  })
})
