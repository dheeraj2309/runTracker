import type { RunState, Segment } from '../types/run';
import { getAllStoredPoints, clearAllPoints } from './db';

const METADATA_KEY = 'run-tracker:active-run-metadata';

interface SegmentSkeleton {
  id: string;
  startTime: number;
  endTime: number | null;
}

interface RunMetadata {
  status: RunState['status'];
  segments: SegmentSkeleton[]; // points intentionally excluded — those live in IndexedDB, this stays small
}

export function saveMetadata(state: RunState): void {
  const metadata: RunMetadata = {
    status: state.status,
    segments: state.segments.map((seg) => ({ id: seg.id, startTime: seg.startTime, endTime: seg.endTime })),
  };
  localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
}

function loadMetadata(): RunMetadata | null {
  const raw = localStorage.getItem(METADATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RunMetadata;
  } catch {
    return null;
  }
}

export function hasInProgressRun(): boolean {
  const metadata = loadMetadata();
  return metadata !== null && (metadata.status === 'running' || metadata.status === 'paused');
}

/** Rebuilds a full RunState from localStorage metadata + IndexedDB points. Always forces status to 'paused' — a refresh gap is implicit pause time, regardless of what status was saved right before the crash. */
export async function rehydrateRunState(): Promise<RunState | null> {
  const metadata = loadMetadata();
  if (!metadata) return null;

  const storedPoints = await getAllStoredPoints();

  const segments: Segment[] = metadata.segments.map((skeleton) => {
    const points = storedPoints
      .filter((p) => p.segmentId === skeleton.id)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ segmentId, ...point }) => point);

    // If the segment was still open when the crash happened, close it at the last known point
    // (or startTime if it has none) — so the gap after that reads as pause time, not active duration.
    const endTime = skeleton.endTime ?? (points.length > 0 ? points[points.length - 1].timestamp : skeleton.startTime);

    return { id: skeleton.id, startTime: skeleton.startTime, endTime, points };
  });

  return {
    status: 'paused',
    segments,
    currentSegmentId: null,
    currentPosition: null, // caller derives this from the restored points, per your earlier call
  };
}

export async function clearActiveRun(): Promise<void> {
  localStorage.removeItem(METADATA_KEY);
  await clearAllPoints();
}