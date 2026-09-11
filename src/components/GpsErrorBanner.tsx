interface GpsErrorBannerProps {
  message: string;
  tone?: 'error' | 'warning';
}

export default function GpsErrorBanner({ message, tone = 'error' }: GpsErrorBannerProps) {
  const toneClass = tone === 'error' ? 'bg-red-500/90 text-neutral-100' : 'bg-amber-500/90 text-neutral-900';
  return (
    <div className={`absolute top-0 left-0 right-0 z-20 px-4 py-3 text-center text-sm font-medium ${toneClass}`}>
      {message}
    </div>
  );
}