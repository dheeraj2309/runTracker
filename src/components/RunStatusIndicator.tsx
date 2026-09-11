import { useRun } from '../context/RunContext';

const STATUS_STYLES: Record<string, string> = {
  running: 'bg-emerald-500 text-neutral-900',
  paused: 'bg-amber-500 text-neutral-900',
};

const STATUS_LABELS: Record<string, string> = {
  running: 'Active',
  paused: 'Paused',
};

export default function RunStatusIndicator() {
  const { state } = useRun();

  if (state.status !== 'running' && state.status !== 'paused') return null;

  return (
    <div className="absolute top-16 left-1/2 z-10 -translate-x-1/2">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[state.status]}`}>
        {STATUS_LABELS[state.status]}
      </span>
    </div>
  );
}