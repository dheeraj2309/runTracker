import { useRun } from '../context/RunContext';
import { getAllPoints, getOverallStats, getSegmentStats } from '../lib/runStats';
import MapView from './MapView';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatPace(minPerKm: number | null): string {
  if (minPerKm === null) return '--:--';
  const totalSeconds = Math.round(minPerKm * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export default function SummaryScreen() {
  const { state } = useRun();
  const allPoints = getAllPoints(state.segments);
  const overall = getOverallStats(state.segments, Date.now());

  // Start/finish flags need at least one real point each; with zero points the map falls back to no markers.
  const hasRoute = allPoints.length > 0;
  const startPoint = hasRoute ? allPoints[0] : null;
  const finishPoint = hasRoute ? allPoints[allPoints.length - 1] : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-neutral-900 text-neutral-100">
      <div className="h-64 shrink-0">
        {hasRoute && startPoint && finishPoint ? (
          <MapView center={startPoint} points={allPoints} markers={{ start: startPoint, finish: finishPoint }} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">No route recorded</div>
        )}
      </div>

      <div className="flex justify-around border-b border-neutral-800 py-4">
        <div className="text-center">
          <p className="text-xs text-neutral-400">Distance</p>
          <p className="text-lg font-semibold">{(overall.distanceMeters / 1000).toFixed(2)} km</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-neutral-400">Duration</p>
          <p className="text-lg font-semibold">{formatDuration(overall.durationMs)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-neutral-400">Avg pace</p>
          <p className="text-lg font-semibold">{formatPace(overall.avgPaceMinPerKm)}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-neutral-400">Segments</p>
        {state.segments.map((seg, i) => {
          const stats = getSegmentStats(seg);
          return (
            <div key={seg.id} className="flex justify-between border-b border-neutral-800 py-2 text-sm">
              <span className="text-neutral-400">#{i + 1}</span>
              <span>{(stats.distanceMeters / 1000).toFixed(2)} km</span>
              <span>{formatDuration(stats.durationMs)}</span>
              <span>{formatPace(stats.avgPaceMinPerKm)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}