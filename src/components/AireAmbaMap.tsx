// AireAmbaMap - Map module (presentational)
import React, { Suspense } from "react";
import { AQISummaryCard } from "@/components/cards/AQISummaryCard";
import { BottomBar } from "@/components/layout/BottomBar";
import { StaticMapFallback } from "@/components/map/StaticMapFallback";
import type { Zone, Scope, Station } from "@/types/airQuality";
import { cn } from "@/lib/utils";

// Lazy load Leaflet map
const LeafletMap = React.lazy(() =>
  import("@/components/map/LeafletMap").then((mod) => ({ default: mod.LeafletMap }))
);

// Error boundary for map
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Map Error:", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function MapLoadingState() {
  return (
    <div className="h-full w-full bg-[#1a1a2e] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Cargando mapa...</span>
      </div>
    </div>
  );
}

type AireAmbaMapProps = {
  className?: string;

  scope: Scope;
  onScopeChange: (s: Scope) => void;

  stations: Station[];
  zones: Zone[];

  averageAqi: number;
  lastUpdated?: string | null;
  isUsingMockData?: boolean;
  isLoading?: boolean;

  selectedZoneId: string | null;
  onZoneClick: (z: Zone) => void;
};

export function AireAmbaMap({
  className,
  scope,
  onScopeChange,
  stations,
  zones,
  averageAqi,
  lastUpdated = null,
  isUsingMockData = false,
  isLoading = false,
  selectedZoneId,
  onZoneClick,
}: AireAmbaMapProps) {
  const fallbackMap = (
    <StaticMapFallback zones={zones} onZoneClick={onZoneClick} selectedZoneId={selectedZoneId ?? undefined} />
  );

  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden rounded-3xl bg-background",
        "shadow-[0_12px_30px_rgba(0,0,0,0.25)] border border-white/10",
        className
      )}
    >
      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapErrorBoundary fallback={fallbackMap}>
          <Suspense fallback={<MapLoadingState />}>
            <LeafletMap
              stations={stations}
              zones={zones}
              scope={scope}
              averageAqi={averageAqi}
              selectedZoneId={selectedZoneId}
              onZoneClick={onZoneClick}
            />
          </Suspense>
        </MapErrorBoundary>
      </div>

      {/* AQI Summary (mini overlay) */}
      <div className={cn("absolute top-4 left-4 z-20 transition-opacity duration-300", selectedZoneId && "opacity-70")}>
        <AQISummaryCard
          averageAqi={averageAqi}
          lastUpdated={lastUpdated}
          isUsingMockData={isUsingMockData}
          isLoading={isLoading}
        />
      </div>

      {/* Bottom bar dentro del módulo */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <BottomBar scope={scope} onScopeChange={onScopeChange} />
      </div>
    </div>
  );
}
