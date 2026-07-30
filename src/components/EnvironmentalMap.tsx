import React, { Suspense } from "react";
import { Info, X } from "lucide-react";
import { BottomBar } from "@/components/layout/BottomBar";
import { StaticMapFallback } from "@/components/map/StaticMapFallback";
import type { Region, Scope, Station, StationQueryMetadata, Zone } from "@/types/airQuality";
import { cn } from "@/lib/utils";
import {
  availablePollutants,
  heatPointsForPollutant,
  POLLUTANTS,
  pollutantLabel,
  pollutantValue,
  type PollutantKey,
} from "@/lib/pollutantHeat";
import { pollutantInfo } from "@/lib/pollutantInfo";
import { stationFreshness } from "@/lib/stationFreshness";

const LeafletMap = React.lazy(() =>
  import("@/components/map/LeafletMap").then((mod) => ({ default: mod.LeafletMap })),
);

const POLLUTANT_KEYS: PollutantKey[] = ["pm25", "pm10", "no2", "o3", "so2", "co"];

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
    <div className="flex h-full w-full items-center justify-center bg-[#07111e]">
      <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/70 shadow-2xl backdrop-blur-xl">
        Cargando mapa...
      </div>
    </div>
  );
}

type EnvironmentalMapProps = {
  className?: string;
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  stations: Station[];
  zones: Zone[];
  regions: Region[];
  selectedRegion?: Region | null;
  metadata?: StationQueryMetadata | null;
  isLoading?: boolean;
  selectedZoneId: string | null;
  onZoneClick: (z: Zone) => void;
  onOpenEducation?: () => void;
};

function StationPanel({
  station,
  selectedPollutant,
  regionName,
  onClose,
}: {
  station: Station;
  selectedPollutant: PollutantKey;
  regionName: string;
  onClose: () => void;
}) {
  const freshness = stationFreshness(station.measured_at ?? station.time);
  const selectedValue = pollutantValue(station, selectedPollutant);
  const available = POLLUTANT_KEYS.filter((key) => pollutantValue(station, key) !== null);
  const missing = POLLUTANT_KEYS.filter((key) => pollutantValue(station, key) === null);

  return (
    <section
      aria-label="Detalle de estación"
      className={cn(
        "fixed inset-x-3 bottom-20 z-40 max-h-[62vh] overflow-y-auto rounded-[1.65rem] border border-white/10 bg-slate-950/78 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-fade-in",
        "md:absolute md:bottom-auto md:left-auto md:right-5 md:top-20 md:w-[22rem] md:max-h-[calc(100%-7rem)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">
            Estación WAQI
          </div>
          <h2 className="mt-1 text-lg font-semibold leading-tight text-white">{station.name}</h2>
          <p className="mt-1 text-sm text-white/65">{station.region_name ?? regionName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/8 p-2 text-white/70 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
          aria-label="Cerrar detalle de estación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/65">{pollutantLabel(selectedPollutant)}</div>
            <div className="mt-1 text-4xl font-semibold tracking-tight text-white">
              {selectedValue === null ? "Sin datos" : selectedValue}
            </div>
          </div>
          <div className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-50">
            valor WAQI
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span
          className={cn(
            "rounded-full border px-3 py-1",
            freshness.status === "stale"
              ? "border-amber-200/25 bg-amber-300/10 text-amber-50"
              : "border-white/10 bg-white/[0.06] text-white/75",
          )}
        >
          {freshness.label}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-white/75">
          Fuente: WAQI
        </span>
      </div>

      {freshness.status === "stale" && (
        <p className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-200/8 px-3 py-2 text-sm text-amber-50/90">
          Esta medición puede estar desactualizada.
        </p>
      )}

      <div className="mt-4">
        <div className="text-sm font-medium text-white/80">Disponibles</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {available.length ? (
            available.map((key) => (
              <span key={key} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/85">
                {pollutantLabel(key)} {pollutantValue(station, key)}
              </span>
            ))
          ) : (
            <span className="text-sm text-white/60">Ninguno informado</span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="text-sm font-medium text-white/75">Sin datos</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {missing.length ? (
            missing.map((key) => (
              <span key={key} className="rounded-full border border-white/8 px-3 py-1 text-sm text-white/45">
                {pollutantLabel(key)}
              </span>
            ))
          ) : (
            <span className="text-sm text-white/60">Ninguno</span>
          )}
        </div>
      </div>
    </section>
  );
}

function PollutantInfoPanel({
  pollutant,
  availableCount,
  onClose,
}: {
  pollutant: PollutantKey;
  availableCount: number;
  onClose: () => void;
}) {
  const info = pollutantInfo(pollutant);
  return (
    <section
      aria-label={`Información sobre ${info.shortName}`}
      className="fixed inset-x-3 bottom-20 z-40 rounded-[1.65rem] border border-white/10 bg-slate-950/82 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-fade-in md:absolute md:bottom-auto md:left-5 md:right-auto md:top-28 md:w-[23rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: info.visualColor }}>
            {info.shortName}
          </div>
          <h2 className="text-lg font-semibold text-white">{info.fullName}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/8 p-2 text-white/70 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
          aria-label="Cerrar información del contaminante"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/78">{info.description}</p>
      <div className="mt-4 grid gap-3 text-sm text-white/72">
        <p>
          <span className="font-medium text-white/90">Fuentes habituales: </span>
          {info.commonSources}
        </p>
        <p>
          <span className="font-medium text-white/90">Por qué se monitorea: </span>
          {info.whyMonitored}
        </p>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/75">
        Disponible en {availableCount} estaciones de esta región.
      </div>
    </section>
  );
}

function IntensityLegend({ label, pointCount }: { label: string; pointCount: number }) {
  return (
    <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium text-white/70 sm:inline">{label}</span>
        <div
          className="h-2 w-28 rounded-full sm:w-36"
          style={{
            background:
              "linear-gradient(90deg, rgba(30,64,175,0.45), rgba(34,211,238,0.72), rgba(20,184,166,0.78), rgba(251,191,36,0.72), rgba(251,113,133,0.74))",
          }}
        />
        <span className="text-xs text-white/65">{pointCount} est.</span>
      </div>
      <div className="mt-1 flex justify-between gap-3 text-[11px] text-white/55">
        <span>menor</span>
        <span>media</span>
        <span>mayor intensidad</span>
      </div>
      <p className="sr-only">
        Intensidad relativa de los valores informados por las estaciones disponibles.
      </p>
    </div>
  );
}

export function EnvironmentalMap({
  className,
  scope,
  onScopeChange,
  stations,
  zones,
  regions,
  selectedRegion = null,
  metadata = null,
  isLoading = false,
  selectedZoneId,
  onZoneClick,
  onOpenEducation,
}: EnvironmentalMapProps) {
  const [selectedPollutant, setSelectedPollutant] = React.useState<PollutantKey>("pm10");
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const fallbackMap = (
    <StaticMapFallback zones={zones} onZoneClick={onZoneClick} selectedZoneId={selectedZoneId ?? undefined} />
  );

  const available = React.useMemo(() => availablePollutants(stations), [stations]);
  const heatPointCount = React.useMemo(
    () => heatPointsForPollutant(stations, selectedPollutant).length,
    [stations, selectedPollutant],
  );
  const selectedPollutantLabel = pollutantLabel(selectedPollutant);

  React.useEffect(() => {
    if (!selectedStation) return;
    if (!stations.some((station) => station.uid === selectedStation.uid)) {
      setSelectedStation(null);
    }
  }, [selectedStation, stations]);

  const coverageMessage = React.useMemo(() => {
    if (isLoading) return "Actualizando estaciones reales...";
    if (stations.length === 0) return "No hay estaciones disponibles en esta región.";
    if (heatPointCount === 0) return `Sin valores de ${selectedPollutantLabel} en esta región.`;
    if (heatPointCount === 1) return `Una estación informa ${selectedPollutantLabel}; cobertura local.`;
    if (metadata?.coverage_partial) return "Cobertura parcial: algunas regiones no respondieron.";
    if (scope === "argentina") return "Las áreas sin estaciones no representan mediciones.";
    return null;
  }, [heatPointCount, isLoading, metadata?.coverage_partial, scope, selectedPollutantLabel, stations.length]);

  return (
    <div
      className={cn(
        "relative isolate h-full w-full overflow-hidden rounded-[2rem] bg-[#06111f] shadow-[0_28px_90px_rgba(0,0,0,0.42)]",
        className,
      )}
    >
      <div className="absolute inset-0 z-0">
        <MapErrorBoundary fallback={fallbackMap}>
          <Suspense fallback={<MapLoadingState />}>
            <LeafletMap
              stations={stations}
              zones={zones}
              region={selectedRegion}
              selectedPollutant={selectedPollutant}
              selectedStationUid={selectedStation?.uid ?? null}
              selectedZoneId={selectedZoneId}
              onStationSelect={setSelectedStation}
              onZoneClick={onZoneClick}
            />
          </Suspense>
        </MapErrorBoundary>
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2 md:inset-x-auto md:left-5 md:top-5 md:w-auto">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-950/48 p-1 shadow-2xl backdrop-blur-2xl">
          {POLLUTANTS.map((pollutant) => {
            const hasData = available.includes(pollutant.key);
            const isSelected = selectedPollutant === pollutant.key;
            return (
              <button
                key={pollutant.key}
                type="button"
                onClick={() => setSelectedPollutant(pollutant.key)}
                aria-pressed={isSelected}
                className={cn(
                  "min-h-10 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-200/70",
                  isSelected
                    ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
                    : "text-white/62 hover:bg-white/10 hover:text-white",
                  !hasData && !isSelected && "text-white/35",
                )}
              >
                {pollutant.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setInfoOpen((open) => !open);
            }}
            className="ml-1 min-h-10 rounded-full border border-white/10 bg-white/8 px-3 text-white/75 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
            aria-label={`Información sobre ${selectedPollutantLabel}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setInfoOpen(false);
            onOpenEducation?.();
          }}
          className="pointer-events-auto w-fit rounded-full border border-white/10 bg-slate-950/42 px-3 py-1.5 text-sm text-white/72 shadow-xl backdrop-blur-xl transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
        >
          Entender los contaminantes
        </button>

        {coverageMessage && (
          <div className="pointer-events-auto w-fit max-w-[min(92vw,30rem)] rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-white/72 shadow-xl backdrop-blur-xl">
            {coverageMessage}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-[5.6rem] left-3 right-3 z-20 flex justify-center md:bottom-5 md:left-auto md:right-5 md:justify-end">
        <div className="pointer-events-auto">
          <IntensityLegend label={selectedPollutantLabel} pointCount={heatPointCount} />
        </div>
      </div>

      {infoOpen && (
        <PollutantInfoPanel
          pollutant={selectedPollutant}
          availableCount={heatPointCount}
          onClose={() => setInfoOpen(false)}
        />
      )}

      {selectedStation && (
        <StationPanel
          station={selectedStation}
          selectedPollutant={selectedPollutant}
          regionName={selectedRegion?.name ?? "Región no informada"}
          onClose={() => setSelectedStation(null)}
        />
      )}

      <BottomBar scope={scope} onScopeChange={onScopeChange} regions={regions} />
    </div>
  );
}
