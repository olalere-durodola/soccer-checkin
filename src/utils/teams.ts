export type Team = 'yellow' | 'orange'

/** Players past this position are unassigned (waitlist). */
export const TEAM_CAP = 20

/**
 * Team for a 1-based arrival position. Odd → Orange, even → Yellow, so a full
 * roster of 20 splits exactly 10/10. Positions beyond the cap get no team.
 * The position must come from an atomic counter (see CheckIn) — deriving it from
 * a non-atomic count lets simultaneous check-ins collide and unbalances teams.
 */
export function teamForPosition(position: number): Team | null {
  if (position > TEAM_CAP) return null
  return position % 2 !== 0 ? 'orange' : 'yellow'
}
