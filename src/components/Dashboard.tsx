import { useRun } from '../context/RunContext';
import { useTicker } from '../hooks/useTicker';
import { getTotalDistanceMeters, getTotalDurationMs, getCurrentPaceMinPerKm } from '../lib/runStats';

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

export default function Dashboard() {
  const { state } = useRun();
  const now = useTicker(state.status === 'running');

  const distanceMeters = getTotalDistanceMeters(state.segments);
  const durationMs = getTotalDurationMs(state.segments, now);
  const pace = getCurrentPaceMinPerKm(state.segments);

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex justify-around bg-neutral-900/80 px-4 py-3 text-neutral-100">
      <div className="text-center">
        <p className="text-xs text-neutral-400">Distance</p>
        <p className="text-lg font-semibold">{(distanceMeters / 1000).toFixed(2)} km</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-neutral-400">Duration</p>
        <p className="text-lg font-semibold">{formatDuration(durationMs)}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-neutral-400">Pace</p>
        <p className="text-lg font-semibold">{formatPace(pace)}</p>
      </div>
    </div>
  );
}