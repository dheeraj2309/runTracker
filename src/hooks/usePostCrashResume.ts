import { useCallback, useState } from 'react';
import { useRun } from '../context/RunContext';
import { reconcileResume } from '../lib/gpsReconciliation';

export function usePostCrashResume() {
  const { state, dispatch } = useRun();
  const [pendingReconciliation, setPendingReconciliation] = useState(false);

  const markPendingAfterHydrate = useCallback(() => setPendingReconciliation(true), []);

  const resumeAfterCrash = useCallback(() => {
    const lastSegment = state.segments[state.segments.length - 1];
    const preCrashPoints = lastSegment ? lastSegment.points : [];

    const fallbackToPlainResume = () => {
      dispatch({ type: 'RESUME', payload: { timestamp: Date.now(), segmentId: crypto.randomUUID() } });
      setPendingReconciliation(false);
    };

    if (!('geolocation' in navigator) || preCrashPoints.length === 0) {
      fallbackToPlainResume();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newFix = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        };
        const decision = reconcileResume(preCrashPoints, newFix);

        if (decision.type === 'bridge') {
          dispatch({
            type: 'BRIDGE_SEGMENT',
            payload: {
              segmentId: lastSegment.id,
              point: {
                id: crypto.randomUUID(),
                lat: newFix.lat,
                lng: newFix.lng,
                timestamp: newFix.timestamp,
                accuracy: newFix.accuracy,
                source: 'real',
                skipPaceTransition: true,
              },
            },
          });
          setPendingReconciliation(false);
        } else {
          fallbackToPlainResume();
        }
      },
      fallbackToPlainResume, // couldn't get a fresh fix — don't block the user, just resume normally
    );
  }, [state.segments, dispatch]);

  return { pendingReconciliation, markPendingAfterHydrate, resumeAfterCrash };
}