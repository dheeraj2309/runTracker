import { RunProvider, useRun } from './context/RunContext';
import EnterScreen from './components/EnterScreen';
import MapView from './components/MapView';
import Dashboard from './components/Dashboard';
import Controls from './components/Controls';
import RunStatusIndicator from './components/RunStatusIndicator';
import SummaryScreen from './components/SummaryScreen';
import GpsErrorBanner from './components/GpsErrorBanner';
import { useGeolocation } from './hooks/useGeolocation';
import { getAllPoints } from './lib/runStats';

function AppShell() {
  const { state } = useRun();
  const { isGpsLost, reconnectSignal } = useGeolocation();

  if (state.status === 'idle'|| state.status === 'calibrating') {
    return <EnterScreen />;
  }

  const points = getAllPoints(state.segments);

  return (
    <div className="relative h-full w-full">
      {state.currentPosition ? (
        <MapView
          center={state.currentPosition}
          points={points.length > 0 ? points : undefined}
          isGpsLost={state.status === 'running' ? isGpsLost : false}
          autoRecenterSignal={reconnectSignal}
        />
      ) : (
        // Safety net: currentPosition should always exist by 'ready', but fall back rather than a blank screen.
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">Map unavailable</div>
      )}


      {state.status === 'running' && isGpsLost && (
        <GpsErrorBanner message="GPS lost, reconnecting…" tone="warning" />
      )}

      {(state.status === 'running' || state.status === 'paused') && (
        <>
          <Dashboard />
          <RunStatusIndicator />
        </>
      )}

      <Controls />

      {state.status === 'finished' && (
        <div className="absolute inset-0 z-20">
          <SummaryScreen />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <RunProvider>
      <AppShell />
    </RunProvider>
  );
}