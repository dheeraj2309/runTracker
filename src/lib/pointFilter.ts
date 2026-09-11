import { haversineDistanceMeters } from "./geo-math";

/**
 * Reject fixes worse than this accuracy (meters), per your call.
 * No speed/teleport-based rejection for now — deferred, per your call.
 * Named constant so it's easy to retune without hunting through call sites.
 */
export const MAX_ACCURACY_METERS = 50;

export function isAcceptableFix(position: GeolocationPosition): boolean {
  return position.coords.accuracy <= MAX_ACCURACY_METERS;
}

const MIN_MOVEMENT_METERS = 3; // below this, treat as GPS noise rather than real movement

export function hasMinimumMovement(
  newFix: { lat: number; lng: number },
  lastPoint: { lat: number; lng: number } | null,
): boolean {
  if (!lastPoint) return true; // first point always accepted
  return haversineDistanceMeters(newFix, lastPoint) >= MIN_MOVEMENT_METERS;
}