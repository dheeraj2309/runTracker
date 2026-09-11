import { useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { Point } from "../types/run";

interface MapViewProps {
  center: { lat: number; lng: number };
  points?: Point[]; // when provided: draws trail + live blip + shows the recenter button
  markers?: { start: Point; finish: Point }; // set for the finished Summary route; omitted during a live run
  isGpsLost?: boolean;
  autoRecenterSignal?: number; // incrementing this triggers a one-time recenter, e.g. on GPS reconnect
}

export default function MapView({
  center,
  points,
  markers,
  isGpsLost,
  autoRecenterSignal,
}: MapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const isFirstRecenterRun = useRef(true);

  const lastPoint =
    points && points.length > 0 ? points[points.length - 1] : null;
  const blipPosition = lastPoint ?? (!markers ? center : null); // pre-run: show blip at current position; post-finish (markers set): no live blip
  const trailPositions = points?.map((p) => [p.lat, p.lng] as [number, number]) ?? [];

  const handleRecenter = () => {
    const target = lastPoint ?? center;
    mapRef.current?.setView([target.lat, target.lng]);
  };

  // Skips the mount-time run so this only fires on an actual reconnect transition, not on initial render.
  useEffect(() => {
    if (isFirstRecenterRun.current) {
      isFirstRecenterRun.current = false;
      return;
    }
    if (lastPoint) {
      mapRef.current?.setView([lastPoint.lat, lastPoint.lng]);
    }
  }, [autoRecenterSignal]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={17}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trailPositions.length > 1 && (
          <Polyline
            positions={trailPositions}
            pathOptions={{
              color: isGpsLost ? "#6b7280" : "#10b981",
              weight: 4,
            }}
          />
        )}
        {blipPosition && !markers && (
          <CircleMarker
            center={[blipPosition.lat, blipPosition.lng]}
            radius={8}
            pathOptions={{
              color: isGpsLost ? "#6b7280" : "#10b981",
              fillColor: isGpsLost ? "#6b7280" : "#10b981",
              fillOpacity: 1,
            }}
          />
        )}
        {markers && (
          <>
            <CircleMarker
              center={[markers.start.lat, markers.start.lng]}
              radius={8}
              pathOptions={{
                color: "#10b981",
                fillColor: "#10b981",
                fillOpacity: 1,
              }}
            />
            <CircleMarker
              center={[markers.finish.lat, markers.finish.lng]}
              radius={8}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 1,
              }}
            />
          </>
        )}
      </MapContainer>

      {points && !markers && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-24 right-4 z-10 rounded-full bg-neutral-900/80 px-4 py-2 text-sm text-neutral-100"
        >
          Recenter
        </button>
      )}
    </div>
  );
}
