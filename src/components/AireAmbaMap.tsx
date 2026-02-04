// AireAmbaMap - Map module (presentational)
import React, { Suspense } from "react";
import { AirQualityBottomSheet } from "@/components/layout/AirQualityBottomSheet";
import { AQISummaryCard } from "@/components/cards/AQISummaryCard";
import { BottomBar } from "@/components/layout/BottomBar";
import { StaticMapFallback } from "@/components/map/StaticMapFallback";
import type { Zone, Scope, Station, ZoneAqiSnapshot } from "@/types/airQuality";
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
    <div className="flex h-full w-full items-center justify-center bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        <span className="text-sm text-white/40">Cargando mapa...</span>
      </div>
    </div>
  );
}

function confidenceLabel(c: NonNullable<ZoneAqiSnapshot>["confidence"]) {
  if (c === "high") return "Confianza alta";
  if (c === "medium") return "Confianza media";
  return "Confianza baja";
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

  selectedSnapshot?: ZoneAqiSnapshot | null;
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
  selectedSnapshot = null,
}: AireAmbaMapProps) {
  const fallbackMap = (
    <StaticMapFallback
      zones={zones}
      onZoneClick={onZoneClick}
      selectedZoneId={selectedZoneId ?? undefined}
    />
  );

  const [sheetOpen, setSheetOpen] = React.useState(false);

  const selectedZone = React.useMemo(() => {
    if (!selectedZoneId) return null;
    return zones.find((z) => z.id === selectedZoneId) ?? null;
  }, [selectedZoneId, zones]);

  const selectedZoneName = selectedZone?.name ?? null;

  // Open bottom sheet when a zone is selected
  React.useEffect(() => {
    if (selectedZoneId) setSheetOpen(true);
  }, [selectedZoneId]);

  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden rounded-3xl bg-background",
        "border border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.25)]",
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

      {/* Bottom bar dentro del módulo */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <BottomBar scope={scope} onScopeChange={onScopeChange} />
      </div>

      {/* Bottom Sheet: Zone details + General status (collapsible) */}
      <AirQualityBottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        zoneTitle={selectedZoneName}
        zoneDetail={
          selectedZone ? (
            selectedSnapshot ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">
                      {selectedSnapshot.zoneName}
                    </div>
                    <div className="mt-1 text-3xl font-bold text-white">
                      AQI {selectedSnapshot.aqi}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      {selectedSnapshot.source === "REAL" ? "Real" : "Estimado"} ·{" "}
                      {confidenceLabel(selectedSnapshot.confidence)}
                    </div>
                  </div>
                </div>

                {selectedSnapshot.source === "ESTIMATED" &&
                  selectedSnapshot.nearestStations.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-white/50">
                        Basado en estaciones cercanas
                      </div>
                      <ul className="mt-2 space-y-1">
                        {selectedSnapshot.nearestStations.map((s) => (
                          <li
                            key={s.uid}
                            className="flex items-center justify-between text-sm text-white/80"
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-white/50">
                              {s.distanceKm.toFixed(1)} km
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No se pudo calcular el AQI para esta zona.
              </div>
            )
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Tocá una zona para ver el detalle.
            </div>
          )
        }
        generalDetail={
          <AQISummaryCard
            averageAqi={averageAqi}
            lastUpdated={lastUpdated}
            isUsingMockData={isUsingMockData}
            isLoading={isLoading}
          />
        }
        defaultGeneralOpen={false}
      />
    </div>
  );
}
