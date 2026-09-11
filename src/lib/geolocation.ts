/**
 * Thin wrapper around the browser's watchPosition/clearWatch — isolates the
 * raw Geolocation API so the rest of the app never touches `navigator.geolocation`
 * directly. Continuous tracking only; Phase 2's one-off getCurrentPosition
 * (in useCalibration) is intentionally separate.
 */

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0, // never reuse a cached fix — always want the latest
  timeout: 15000,
};

export function watchPosition(
  onFix: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
): number {
  return navigator.geolocation.watchPosition(onFix, onError, WATCH_OPTIONS);
}

export function clearPositionWatch(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}