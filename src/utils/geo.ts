const EARTH_RADIUS_M = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Whether a player is inside the field radius.
 *
 * `accuracyM` (the GPS fix's accuracy in metres) is subtracted from the
 * distance so a real attendee standing on the field isn't falsely rejected by
 * normal GPS jitter — i.e. they count as inside when they could plausibly be
 * inside given the fix's uncertainty. Defaults to 0 (exact check).
 */
export function isWithinRadius(
  fieldLat: number,
  fieldLng: number,
  playerLat: number,
  playerLng: number,
  radiusM: number,
  accuracyM = 0,
): boolean {
  const distance = haversineDistance(fieldLat, fieldLng, playerLat, playerLng)
  return distance - accuracyM <= radiusM
}
