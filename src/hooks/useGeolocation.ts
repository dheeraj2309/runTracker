import { useEffect, useRef, useState } from 'react';
import { useRun } from '../context/RunContext';
import { watchPosition } from '../lib/geolocation';
import { hasMinimumMovement, isAcceptableFix } from '../lib/pointFilter';
import type { Point } from '../types/run';

const LOST_TIMEOUT_MS = 30000; // per your call

export function useGeolocation() {
  const { state, dispatch } = useRun();
  const watchIdRef = useRef<number | null>(null);
  const lastFixTimeRef = useRef<number>(Date.now());
  const isGpsLostRef = useRef(false); // mirrors isGpsLost state, avoids stale-closure reads inside the watchPosition callback

  const [isGpsLost, setIsGpsLost] = useState(false);
  const [reconnectSignal, setReconnectSignal] = useState(0); // increments once per lost->reconnected transition, consumed by MapView to trigger the one-time auto-recenter
  const lastAcceptedPointRef = useRef<{ lat: number; lng: number } | null>(null); // new

   useEffect(() => {
    if (state.status !== 'running') {
      // ...existing teardown stays
      lastAcceptedPointRef.current = null; // reset so a new segment doesn't compare against a stale point
      return;
    }

    lastFixTimeRef.current = Date.now();

    watchIdRef.current = watchPosition(
      (position) => {
        if (!isAcceptableFix(position)) return;

        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!hasMinimumMovement(coords, lastAcceptedPointRef.current)) return; // new: reject noise-sized movement

        lastFixTimeRef.current = Date.now();

        if (isGpsLostRef.current) {
          isGpsLostRef.current = false;
          setIsGpsLost(false);
          setReconnectSignal((n) => n + 1);
        }

        const point: Point = {
          id: crypto.randomUUID(),
          lat: coords.lat,
          lng: coords.lng,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
          source: 'real',
        };
        lastAcceptedPointRef.current = coords; // new
        dispatch({ type: 'ADD_POINT', payload: point });
      },
      (error) => {
        console.warn('[useGeolocation] watch error:', error);
      },
    );

    // ...rest unchanged
  }, [state.status, dispatch]);

  return { isGpsLost, reconnectSignal };
}