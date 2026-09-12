import { useEffect, useRef, useState } from "react";
import { useRun } from "../context/RunContext";
import { clearPositionWatch, watchPosition } from "../lib/geolocation";
import {
  isAcceptableFix,
  hasMinimumMovement,
  isPlausibleJump,
} from "../lib/pointFilter";
import type { Point } from "../types/run";
import { appendPoint } from "../lib/db";

const LOST_TIMEOUT_MS = 30000; // per your call

export function useGeolocation() {
  const { state, dispatch } = useRun();
  const watchIdRef = useRef<number | null>(null);
  const lastFixTimeRef = useRef<number>(Date.now());
  const isGpsLostRef = useRef(false); // mirrors isGpsLost state, avoids stale-closure reads inside the watchPosition callback
  const lastAcceptedPointRef = useRef<{
    lat: number;
    lng: number;
    timestamp: number;
  } | null>(null); // back

  const [isGpsLost, setIsGpsLost] = useState(false);
  const [reconnectSignal, setReconnectSignal] = useState(0); // increments once per lost->reconnected transition, consumed by MapView to trigger the one-time auto-recenter

  useEffect(() => {
    if (state.status !== "running") {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      isGpsLostRef.current = false;
      setIsGpsLost(false);
      lastAcceptedPointRef.current = null; // reset for the next segment
      return;
    }

    lastFixTimeRef.current = Date.now();

    watchIdRef.current = watchPosition(
      (position) => {
        if (!isAcceptableFix(position)) return;

        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
        };
        if (!hasMinimumMovement(coords, lastAcceptedPointRef.current)) return; // back
        if (!isPlausibleJump(coords, lastAcceptedPointRef.current)) return; // new

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
          speed:
            typeof position.coords.speed === "number"
              ? position.coords.speed
              : undefined,
          source: "real",
        };
        lastAcceptedPointRef.current = coords;

        dispatch({ type: "ADD_POINT", payload: point });
        if (state.currentSegmentId) {
          void appendPoint(state.currentSegmentId, point);
        }
      },
      (error) => {
        console.warn("[useGeolocation] watch error:", error);
      },
    );

    const lostCheckInterval = setInterval(() => {
      if (
        !isGpsLostRef.current &&
        Date.now() - lastFixTimeRef.current > LOST_TIMEOUT_MS
      ) {
        isGpsLostRef.current = true;
        setIsGpsLost(true);
      }
    }, 2000);

    return () => {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(lostCheckInterval);
    };
  }, [state.status, dispatch]);

  return { isGpsLost, reconnectSignal };
}
