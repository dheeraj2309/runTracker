interface FinishConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FinishConfirmModal({ onConfirm, onCancel }: FinishConfirmModalProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-950/60">
      <div className="mx-6 rounded-2xl bg-neutral-800 p-6 text-neutral-100 shadow-xl">
        <p className="mb-4 text-sm font-medium">Finish this run?</p>
        <p className="mb-6 text-xs text-neutral-400">You won't be able to resume tracking after this.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-neutral-300">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-neutral-100">
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}