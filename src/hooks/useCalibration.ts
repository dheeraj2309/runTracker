import { useCallback, useState } from 'react';
import { useRun } from '../context/RunContext';

/**
 * Handles the Enter -> permission request -> first fix -> ready flow.
 * Deliberately separate from Phase 3's lib/geolocation.ts (watchPosition
 * wrapper for continuous tracking) — this is a one-off getCurrentPosition
 * call, only used before a run starts.
 */
export function useCalibration() {
  const { dispatch } = useRun();

  // Permission/fix errors are transient UI feedback, not run data — kept as
  // local state here rather than in RunState, consistent with treating
  // non-run data as outside the reducer.
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setError(null);
    dispatch({ type: 'SET_STATUS', payload: { status: 'calibrating' } });

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available on this device.');
      dispatch({ type: 'SET_STATUS', payload: { status: 'idle' } });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Single fix, any accuracy, counts as "stable" per your call.
        dispatch({
          type: 'SET_POSITION',
          payload: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
        dispatch({ type: 'SET_STATUS', payload: { status: 'ready' } });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it and refresh.'
            : 'Could not get your location. Try again.',
        );
        dispatch({ type: 'SET_STATUS', payload: { status: 'idle' } });
      },
    );
  }, [dispatch]);

  return { requestLocation, error };
}