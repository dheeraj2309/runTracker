import type { RunState, RunAction, Segment } from '../types/run';

export function createInitialState(): RunState {
  return {
    status: 'idle',
    segments: [],
    currentSegmentId: null,
    currentPosition: null,
  };
}

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'START': {
      if (state.status !== 'ready') return state; // invalid transition, ignore
      const newSegment: Segment = {
        id: action.payload.segmentId,
        startTime: action.payload.timestamp,
        endTime: null,
        points: [],
      };
      return {
        ...state,
        status: 'running',
        segments: [...state.segments, newSegment],
        currentSegmentId: newSegment.id,
      };
    }

    case 'PAUSE': {
      if (state.status !== 'running' || state.currentSegmentId === null) return state;
      return {
        ...state,
        status: 'paused',
        segments: state.segments.map((seg) =>
          seg.id === state.currentSegmentId
            ? { ...seg, endTime: action.payload.timestamp }
            : seg,
        ),
        currentSegmentId: null,
      };
    }

    case 'RESUME': {
      if (state.status !== 'paused') return state;
      const newSegment: Segment = {
        id: action.payload.segmentId,
        startTime: action.payload.timestamp,
        endTime: null,
        points: [],
      };
      return {
        ...state,
        status: 'running',
        segments: [...state.segments, newSegment],
        currentSegmentId: newSegment.id,
      };
    }

    case 'FINISH': {
      if (state.status !== 'running' && state.status !== 'paused') return state;
      const segments =
        state.currentSegmentId === null
          ? state.segments
          : state.segments.map((seg) =>
              seg.id === state.currentSegmentId
                ? { ...seg, endTime: action.payload.timestamp }
                : seg,
            );
      return {
        ...state,
        status: 'finished',
        segments,
        currentSegmentId: null,
      };
    }

    case 'ADD_POINT': {
      if (state.status !== 'running' || state.currentSegmentId === null) return state;
      return {
        ...state,
        segments: state.segments.map((seg) =>
          seg.id === state.currentSegmentId
            ? { ...seg, points: [...seg.points, action.payload] }
            : seg,
        ),
      };
    }
    case 'SET_STATUS': {
      // Generic status setter, no transition guards yet (deferred per earlier decision).
      return { ...state, status: action.payload.status };
    }

    case 'SET_POSITION': {
      return { ...state, currentPosition: action.payload };
    }
    
    case 'HYDRATE': {
      return action.payload;
    }

    case 'DISCARD': {
      return createInitialState();
    }

    default:
      return state;
  }
}