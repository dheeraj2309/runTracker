import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import { runReducer, createInitialState } from './runReducer';
import type { RunState, RunAction } from '../types/run';

interface RunContextValue {
  state: RunState;
  dispatch: Dispatch<RunAction>;
}

const RunContext = createContext<RunContextValue | undefined>(undefined);

export function RunProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(runReducer, undefined, createInitialState);

  return (
    <RunContext.Provider value={{ state, dispatch }}>
      {children}
    </RunContext.Provider>
  );
}

export function useRun(): RunContextValue {
  const ctx = useContext(RunContext);
  if (ctx === undefined) {
    throw new Error('useRun must be used within a RunProvider');
  }
  return ctx;
}