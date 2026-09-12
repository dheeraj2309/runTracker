import { useEffect, useRef } from 'react';
import { useRun } from '../context/RunContext';
import { saveMetadata, clearActiveRun } from '../lib/persistence';

const PERIODIC_SAVE_MS = 10000;

export function usePersistence() {
  const { state } = useRun();
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevStatusRef = useRef(state.status);

  // Immediate save on any actual status transition (covers PAUSE/RESUME/FINISH from the plan).
  useEffect(() => {
    if (prevStatusRef.current === state.status) return;
    if (state.status === 'running' || state.status === 'paused') {
      saveMetadata(state);
    } else if (state.status === 'finished') {
      clearActiveRun(); // per plan: finishing clears active storage
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  // Periodic safety-net save, pauses itself when not running — per plan.
  useEffect(() => {
    if (state.status !== 'running') return;
    const interval = setInterval(() => saveMetadata(stateRef.current), PERIODIC_SAVE_MS);
    return () => clearInterval(interval);
  }, [state.status]);
}