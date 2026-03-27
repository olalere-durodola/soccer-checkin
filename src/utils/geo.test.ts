import { describe, it, expect } from 'vitest'
import { haversineDistance, isWithinRadius } from './geo'

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(51.5, -0.1, 51.5, -0.1)).toBe(0)
  })
  it('returns approximate distance between two points in meters', () => {
    const dist = haversineDistance(51.5000, -0.1, 51.5009, -0.1)
    expect(dist).toBeGreaterThan(90)
    expect(dist).toBeLessThan(110)
  })
  it('returns distance in meters not kilometers', () => {
    const dist = haversineDistance(51.5, -0.1, 51.501, -0.1)
    expect(dist).toBeGreaterThan(50)
    expect(dist).toBeLessThan(200)
  })
})

describe('isWithinRadius', () => {
  it('returns true when player is within radius', () => {
    expect(isWithinRadius(51.5, -0.1, 51.5, -0.1, 15)).toBe(true)
  })
  it('returns false when player is outside radius', () => {
    expect(isWithinRadius(51.5, -0.1, 51.501, -0.1, 15)).toBe(false)
  })
  it('returns true when player is exactly at radius boundary', () => {
    const dist = haversineDistance(51.5, -0.1, 51.5001, -0.1)
    expect(isWithinRadius(51.5, -0.1, 51.5001, -0.1, dist)).toBe(true)
  })
})
