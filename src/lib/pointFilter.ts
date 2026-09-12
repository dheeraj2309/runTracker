import { haversineDistanceMeters } from "./geo-math";

/**
 * Reject fixes worse than this accuracy (meters), per your call.
 * No speed/teleport-based rejection for now — deferred, per your call.
 * Named constant so it's easy to retune without hunting through call sites.
 */
export const MAX_ACCURACY_METERS = 40;

export function isAcceptableFix(position: GeolocationPosition): boolean {
  return position.coords.accuracy <= MAX_ACCURACY_METERS;
}

const MIN_MOVEMENT_METERS = 3.0
export function hasMinimumMovement(
  newFix: { lat: number; lng: number },
  lastPoint: { lat: number; lng: number } | null,
): boolean {
  if (!lastPoint) return true;
  return haversineDistanceMeters(newFix, lastPoint) >= MIN_MOVEMENT_METERS;
}

const MAX_PLAUSIBLE_SPEED_MPS = 7; // ~25 km/h, generous for a sprint — a tunable guess, retune if real sprint testing trips it

export function isPlausibleJump(
  newFix: { lat: number; lng: number; timestamp: number },
  lastPoint: { lat: number; lng: number; timestamp: number } | null,
): boolean {
  if (!lastPoint) return true;
  const distanceMeters = haversineDistanceMeters(newFix, lastPoint);
  const elapsedSeconds = (newFix.timestamp - lastPoint.timestamp) / 1000;
  if (elapsedSeconds <= 0) return true; // can't evaluate, don't block on it
  return distanceMeters / elapsedSeconds <= MAX_PLAUSIBLE_SPEED_MPS;
}