import { describe, it, expect } from 'vitest'
import { teamForPosition } from './teams'

describe('teamForPosition', () => {
  it('alternates orange (odd) / yellow (even)', () => {
    expect(teamForPosition(1)).toBe('orange')
    expect(teamForPosition(2)).toBe('yellow')
    expect(teamForPosition(13)).toBe('orange')
    expect(teamForPosition(20)).toBe('yellow')
  })

  it('returns null past the team cap of 20', () => {
    expect(teamForPosition(21)).toBeNull()
    expect(teamForPosition(99)).toBeNull()
  })

  it('splits a full roster of 20 exactly 10/10', () => {
    const counts = { yellow: 0, orange: 0 }
    for (let p = 1; p <= 20; p++) {
      const t = teamForPosition(p)
      if (t) counts[t]++
    }
    expect(counts).toEqual({ yellow: 10, orange: 10 })
  })
})
