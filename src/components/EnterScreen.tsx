import { useCalibration } from '../hooks/useCalibration';
import { useRun } from '../context/RunContext';
import GpsErrorBanner from './GpsErrorBanner';
import CalibratingOverlay from './CalibratingOverlay';

export default function EnterScreen() {
  const { state } = useRun();
  const { requestLocation, error } = useCalibration();

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 bg-neutral-900 text-neutral-100">
      {error && <GpsErrorBanner message={error} />}
      <h1 className="text-xl font-medium">Run Tracker</h1>
      <button
        onClick={requestLocation}
        className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-neutral-900"
      >
        Enter
      </button>
      {state.status === 'calibrating' && <CalibratingOverlay />}
    </div>
  );
}