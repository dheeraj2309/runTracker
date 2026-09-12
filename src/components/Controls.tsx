import { useState } from "react";
import { useRun } from "../context/RunContext";
import FinishConfirmModal from "./FinishConfirmModal";

interface ControlsProps {
  pendingReconciliation?: boolean;
  onResumeAfterCrash?: () => void;
}
export default function Controls({
  pendingReconciliation,
  onResumeAfterCrash,
}: ControlsProps) {
  const { state, dispatch } = useRun();
  const [showFinishModal, setShowFinishModal] = useState(false);

  const handleStart = () =>
    dispatch({
      type: "START",
      payload: { timestamp: Date.now(), segmentId: crypto.randomUUID() },
    });

  const handlePause = () =>
    dispatch({ type: "PAUSE", payload: { timestamp: Date.now() } });

  const handleResume = () => {
    if (pendingReconciliation && onResumeAfterCrash) {
      onResumeAfterCrash();
      return;
    }
    dispatch({
      type: "RESUME",
      payload: { timestamp: Date.now(), segmentId: crypto.randomUUID() },
    });
  };

  const handleConfirmFinish = () => {
    dispatch({ type: "FINISH", payload: { timestamp: Date.now() } });
    setShowFinishModal(false);
  };

  return (
    <>
      <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center gap-4">
        {state.status === "ready" && (
          <button
            onClick={handleStart}
            className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-neutral-900"
          >
            Start
          </button>
        )}
        {state.status === "running" && (
          <>
            <button
              onClick={handlePause}
              className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-neutral-900"
            >
              Pause
            </button>
            <button
              onClick={() => setShowFinishModal(true)}
              className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-neutral-100"
            >
              Finish
            </button>
          </>
        )}
        {state.status === "paused" && (
          <>
            <button
              onClick={handleResume}
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-neutral-900"
            >
              Resume
            </button>
            <button
              onClick={() => setShowFinishModal(true)}
              className="rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-neutral-100"
            >
              Finish
            </button>
          </>
        )}
      </div>

      {showFinishModal && (
        <FinishConfirmModal
          onConfirm={handleConfirmFinish}
          onCancel={() => setShowFinishModal(false)}
        />
      )}
    </>
  );
}
