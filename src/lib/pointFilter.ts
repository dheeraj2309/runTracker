/**
 * Reject fixes worse than this accuracy (meters), per your call.
 * No speed/teleport-based rejection for now — deferred, per your call.
 * Named constant so it's easy to retune without hunting through call sites.
 */
export const MAX_ACCURACY_METERS = 50;

export function isAcceptableFix(position: GeolocationPosition): boolean {
  return position.coords.accuracy <= MAX_ACCURACY_METERS;
}