import type { Segment, Point } from '../types/run';
import { totalDistanceMeters, calculateSmoothedPaceMinPerKm } from './geo-math';

/** Flattens all points across all segments, in chronological order. */
export function getAllPoints(segments: Segment[]): Point[] {
  return segments.flatMap((seg) => seg.points);
}

/** Total distance across the whole run so far, in meters. */
export function getTotalDistanceMeters(segments: Segment[]): number {
  return segments.reduce((sum, seg) => sum + totalDistanceMeters(seg.points), 0);
}

/**
 * Total active (non-paused) duration across the whole run, in ms.
 * Closed segments contribute their fixed span; an open segment (if any)
 * contributes up to `now`, so this ticks live while running.
 */
export function getTotalDurationMs(segments: Segment[], now: number): number {
  return segments.reduce((sum, seg) => {
    const end = seg.endTime ?? now;
    return sum + Math.max(0, end - seg.startTime);
  }, 0);
}

/**
 * Current live pace. Deliberately uses only the most recent segment's
 * points, NOT all points flattened across segments — pace is rolling-window
 * based (Phase 3), and mixing points across a pause gap would count the
 * paused wall-clock time as if it were running time, silently corrupting
 * the pace number right after every Resume.
 */
export function getCurrentPaceMinPerKm(segments: Segment[]): number | null {
  if (segments.length === 0) return null;
  const lastSegment = segments[segments.length - 1];
  return calculateSmoothedPaceMinPerKm(lastSegment.points);
}

export interface SegmentStats {
  segmentId: string;
  distanceMeters: number;
  durationMs: number;
  avgPaceMinPerKm: number | null; // whole-segment average, NOT rolling window — segment is complete by the time this is shown
}


export function getSegmentStats(segment: Segment): SegmentStats {
  const distanceMeters = totalDistanceMeters(segment.points);
  const durationMs = Math.max(0, (segment.endTime ?? Date.now()) - segment.startTime);
  const avgPaceMinPerKm =
    distanceMeters === 0 ? null : durationMs / 1000 / 60 / (distanceMeters / 1000);

  return { segmentId: segment.id, distanceMeters, durationMs, avgPaceMinPerKm };
}

export interface OverallStats {
  distanceMeters: number;
  durationMs: number;
  avgPaceMinPerKm: number | null;
}

/** Whole-run average pace — distinct from getCurrentPaceMinPerKm's rolling window, used for the finished Summary. */
export function getOverallStats(segments: Segment[], now: number): OverallStats {
  const distanceMeters = getTotalDistanceMeters(segments);
  const durationMs = getTotalDurationMs(segments, now);
  const avgPaceMinPerKm =
    distanceMeters === 0 ? null : durationMs / 1000 / 60 / (distanceMeters / 1000);

  return { distanceMeters, durationMs, avgPaceMinPerKm };
}