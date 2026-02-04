// AireAmbaMap - Map module (presentational)
import React, { Suspense } from "react";
import { AirQualityBottomSheet } from "@/components/layout/AirQualityBottomSheet";
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
    <div className="flex h-full w-full items-center justify-center bg-[#1a1a2e]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        <span className="text-sm text-white/40">Cargando mapa...</span>
      </div>
    </div>
  );
}

// Helpers to avoid assuming the exact Zone shape
function getZoneId(z: Zone): string | undefined {
  // @ts-expect-error - tolerant mapping for unknown Zone shapes
  return z.id ?? z.zoneId ?? z?.properties?.id;
}

function getZoneName(z: Zone): string | undefined {
  // @ts-expect-error - tolerant mapping for unknown Zone shapes
  return z.name ?? z.zoneName ?? z?.properties?.name;
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
    <StaticMapFallback
      zones={zones}
      onZoneClick={onZoneClick}
      selectedZoneId={selectedZoneId ?? undefined}
    />
  );

  const [sheetOpen, setSheetOpen] = React.useState(false);

  const selectedZone = React.useMemo(() => {
    if (!selectedZoneId) return null;
    return zones.find((z) => getZoneId(z) === selectedZoneId) ?? null;
  }, [selectedZoneId, zones]);

  const selectedZoneName = React.useMemo(() => {
    if (!selectedZone) return null;
    return getZoneName(selectedZone) ?? selectedZoneId ?? null;
  }, [selectedZone, selectedZoneId]);

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
            // Placeholder: luego conectamos ZoneDetailCard real con snapshot (REAL/ESTIMATED, confidence, estaciones cercanas).
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/70">
                Zona seleccionada:{" "}
                <span className="font-medium text-white">{selectedZoneName}</span>
              </div>
              <div className="mt-2 text-xs text-white/40">
                Próximo paso: conectar ZoneDetailCard con snapshot (REAL/ESTIMATED, confidence, estaciones cercanas).
              </div>
            </div>
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
