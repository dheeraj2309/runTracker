import { useState } from "react";
import { RunProvider, useRun } from "./context/RunContext";
import EnterScreen from "./components/EnterScreen";
import MapView from "./components/MapView";
import Dashboard from "./components/Dashboard";
import Controls from "./components/Controls";
import RunStatusIndicator from "./components/RunStatusIndicator";
import SummaryScreen from "./components/SummaryScreen";
import GpsErrorBanner from "./components/GpsErrorBanner";
import ResumeDiscardDialog from "./components/ResumeDiscardDialog";
import { useGeolocation } from "./hooks/useGeolocation";
import { usePersistence } from "./hooks/usePersistence";
import { usePostCrashResume } from "./hooks/usePostCrashResume";
import { getAllPoints } from "./lib/runStats";
import {
  hasInProgressRun,
  rehydrateRunState,
  clearActiveRun,
} from "./lib/persistence";

function AppShell() {
  const { state, dispatch } = useRun();
  const { isGpsLost, reconnectSignal } = useGeolocation();
  usePersistence();
  const { pendingReconciliation, markPendingAfterHydrate, resumeAfterCrash } =
    usePostCrashResume();

  const [showRecoveryDialog, setShowRecoveryDialog] = useState(() =>
    hasInProgressRun(),
  );

  const handleResumeRecovery = async () => {
    const restored = await rehydrateRunState();
    if (restored) {
      const allRestoredPoints = restored.segments.flatMap((s) => s.points);
      const lastPoint = allRestoredPoints[allRestoredPoints.length - 1] ?? null;
      dispatch({
        type: "HYDRATE",
        payload: {
          ...restored,
          currentPosition: lastPoint
            ? { lat: lastPoint.lat, lng: lastPoint.lng }
            : null,
        },
      });
      markPendingAfterHydrate();
    }
    setShowRecoveryDialog(false);
  };

  const handleDiscardRecovery = async () => {
    await clearActiveRun();
    setShowRecoveryDialog(false);
  };

  if (showRecoveryDialog) {
    return (
      <ResumeDiscardDialog
        onResume={handleResumeRecovery}
        onDiscard={handleDiscardRecovery}
      />
    );
  }

  if (state.status === "idle") {
    return <EnterScreen />;
  }

  const points = getAllPoints(state.segments);

  return (
    <div className="relative h-full w-full">
      {state.currentPosition ? (
        <MapView
          center={state.currentPosition}
          points={points.length > 0 ? points : undefined}
          isGpsLost={state.status === "running" ? isGpsLost : false}
          autoRecenterSignal={reconnectSignal}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          Map unavailable
        </div>
      )}

      {state.status === "running" && isGpsLost && (
        <GpsErrorBanner message="GPS lost, reconnecting…" tone="warning" />
      )}

      {(state.status === "running" || state.status === "paused") && (
        <>
          <Dashboard />
          <RunStatusIndicator />
        </>
      )}

      <Controls
        pendingReconciliation={pendingReconciliation}
        onResumeAfterCrash={resumeAfterCrash}
      />

      {state.status === "finished" && (
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
