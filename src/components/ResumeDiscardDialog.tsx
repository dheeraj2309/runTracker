interface ResumeDiscardDialogProps {
  onResume: () => void;
  onDiscard: () => void;
}

export default function ResumeDiscardDialog({ onResume, onDiscard }: ResumeDiscardDialogProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-neutral-950/80">
      <div className="mx-6 rounded-2xl bg-neutral-800 p-6 text-neutral-100 shadow-xl">
        <p className="mb-2 text-sm font-medium">Unfinished run found</p>
        <p className="mb-6 text-xs text-neutral-400">
          It looks like a run was interrupted. Resume where you left off, or discard it and start fresh.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onDiscard} className="rounded-full px-4 py-2 text-sm text-neutral-300">
            Discard
          </button>
          <button onClick={onResume} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-900">
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}