import React, { Suspense } from "react";
import { X } from "lucide-react";
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
import { aqiHeatGradientCss, AQI_HEAT_LEGEND } from "@/lib/aqiHeatScale";
import { pollutantInfo } from "@/lib/pollutantInfo";
import { stationFreshness, RECENT_AFTER_HOURS } from "@/lib/stationFreshness";
import {
  coverageConfidenceLabel,
  coverageConfidenceMessage,
  formatDistanceKm,
  pointCoverage,
  stationCoverageInfo,
} from "@/lib/coverage";

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
};

const POLLUTANT_PANEL_COPY: Record<
  PollutantKey,
  {
    analogy: string;
    low: string;
    high: string;
    notMeaning: string;
    mapRepresentation: string;
  }
> = {
  pm25: {
    analogy: "Polvo invisible extremadamente pequeño.",
    low: "Menor presencia de partículas finas en el aire.",
    high: "Mayor presencia de partículas finas cerca de la estación.",
    notMeaning: "No permite saber por sí solo de dónde proviene.",
    mapRepresentation: "El color muestra la intensidad estimada para PM2.5 entre estaciones.",
  },
  pm10: {
    analogy: "Polvo más grande que puede levantarse del suelo.",
    low: "Menor presencia de partículas gruesas en suspensión.",
    high: "Mayor presencia de polvo o partículas cerca de la estación.",
    notMeaning: "No identifica una obra, calle o fuente puntual específica.",
    mapRepresentation: "El color muestra la intensidad estimada para PM10 entre estaciones.",
  },
  no2: {
    analogy: "Una señal típica de combustión urbana.",
    low: "Menor presencia de dióxido de nitrógeno en el aire.",
    high: "Mayor presencia cerca de tránsito, motores o combustión.",
    notMeaning: "No prueba por sí solo qué vehículo o industria lo generó.",
    mapRepresentation: "El color muestra la intensidad estimada para NO₂ entre estaciones.",
  },
  o3: {
    analogy: "Un contaminante que se cocina con sol y precursores.",
    low: "Menor presencia de ozono a nivel del suelo.",
    high: "Mayor presencia asociada a reacciones químicas con luz solar.",
    notMeaning: "No significa que haya una fuente directa de ozono en ese punto.",
    mapRepresentation: "El color muestra la intensidad estimada para O₃ entre estaciones.",
  },
  so2: {
    analogy: "Una huella de combustibles con azufre.",
    low: "Menor presencia de dióxido de azufre en el aire.",
    high: "Mayor presencia cerca de combustión o procesos industriales compatibles.",
    notMeaning: "No identifica por sí solo una planta o actividad concreta.",
    mapRepresentation: "El color muestra la intensidad estimada para SO₂ entre estaciones.",
  },
  co: {
    analogy: "Una señal de combustión incompleta.",
    low: "Menor presencia de monóxido de carbono en el aire.",
    high: "Mayor presencia asociada a combustión incompleta cerca de la estación.",
    notMeaning: "No permite ubicar por sí solo la fuente exacta.",
    mapRepresentation: "El color muestra la intensidad estimada para CO entre estaciones.",
  },
};

function StationPanel({
  station,
  selectedPollutant,
  regionName,
  stations,
  onClose,
}: {
  station: Station;
  selectedPollutant: PollutantKey;
  regionName: string;
  stations: Station[];
  onClose: () => void;
}) {
  const freshness = stationFreshness(station.measured_at ?? station.time);
  const selectedValue = pollutantValue(station, selectedPollutant);
  const available = POLLUTANT_KEYS.filter((key) => pollutantValue(station, key) !== null);
  const missing = POLLUTANT_KEYS.filter((key) => pollutantValue(station, key) === null);
  const coverage = stationCoverageInfo(station, stations);

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

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">
          Posibles fuentes habituales
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/78">
          {pollutantInfo(selectedPollutant).stationExplanation}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/55">
          Estas son fuentes habituales asociadas al contaminante. La plataforma no determina la
          causa específica de esta medición.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span
          className={cn(
            "rounded-full border px-3 py-1",
            freshness.status === "stale"
              ? "border-amber-200/25 bg-amber-300/10 text-amber-50"
              : freshness.status === "aging"
                ? "border-amber-200/20 bg-amber-200/5 text-amber-100/85"
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
          Esta medición puede estar desactualizada y no representa el aire actual.
        </p>
      )}

      {freshness.status === "aging" && (
        <p className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-200/8 px-3 py-2 text-sm text-amber-50/90">
          Esta medición tiene más de {RECENT_AFTER_HOURS} h: sigue contando para cobertura, pero
          está envejeciendo.
        </p>
      )}

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">
            Cobertura
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs",
              coverage.directConfidence === "high"
                ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-50"
                : coverage.directConfidence === "none"
                  ? "border-red-200/25 bg-red-300/10 text-red-50"
                  : "border-amber-200/25 bg-amber-300/10 text-amber-50",
            )}
          >
            {coverageConfidenceLabel(coverage.directConfidence)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/78">
          {coverageConfidenceMessage(coverage.directConfidence)}
        </p>
        {coverage.nearestOther && (
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Estación más cercana:{" "}
            <span className="text-white">
              "{coverage.nearestOther.station.name}" a{" "}
              {formatDistanceKm(coverage.nearestOther.distanceKm)}
            </span>
          </p>
        )}
        {coverage.totalStations > 1 && (
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Otras estaciones en la región:{" "}
            {coverage.withinRadii[5]} a &lt;5 km · {coverage.withinRadii[10]} a &lt;10 km ·{" "}
            {coverage.withinRadii[20]} a &lt;20 km
          </p>
        )}
      </div>

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
  onClose,
}: {
  pollutant: PollutantKey;
  onClose: () => void;
}) {
  const info = pollutantInfo(pollutant);
  const copy = POLLUTANT_PANEL_COPY[pollutant];

  return (
    <section
      aria-label={`Información de ${info.shortName}`}
      className={cn(
        "fixed inset-x-3 bottom-20 z-40 max-h-[48vh] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-slate-950/82 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-fade-in",
        "md:absolute md:bottom-auto md:left-5 md:right-auto md:top-20 md:w-[22rem] md:max-h-[calc(100%-7rem)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: info.visualColor }}>
            {info.shortName}
          </div>
          <h2 className="text-lg font-semibold text-white">{info.fullName}</h2>
          <p className="mt-1 text-sm text-white/62">{copy.analogy}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/8 p-2 text-white/70 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
          aria-label="Cerrar información del contaminante"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <dl className="mt-3 grid gap-2 text-sm leading-relaxed">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">Qué es</dt>
          <dd className="mt-1 text-white/76">{info.description}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">Fuentes frecuentes</dt>
          <dd className="mt-1 text-white/76">{info.commonSources}</dd>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
          <div className="rounded-2xl border border-emerald-200/15 bg-emerald-200/8 p-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100/70">Cuando está bajo</dt>
            <dd className="mt-1 text-white/76">{copy.low}</dd>
          </div>
          <div className="rounded-2xl border border-amber-200/15 bg-amber-200/8 p-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100/75">Cuando está alto</dt>
            <dd className="mt-1 text-white/76">{copy.high}</dd>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">Lo que no significa</dt>
          <dd className="mt-1 text-white/76">{copy.notMeaning}</dd>
        </div>
        <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 p-3">
          <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/70">Cómo se representa en el mapa</dt>
          <dd className="mt-1 text-white/76">{copy.mapRepresentation}</dd>
        </div>
      </dl>
    </section>
  );
}

function IntensityLegend({ label, pointCount }: { label: string; pointCount: number }) {
  return (
    <div className="max-w-[min(92vw,26rem)] rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium text-white/70 sm:inline">{label}</span>
        <div
          className="h-2.5 w-28 rounded-full sm:w-40"
          style={{ background: aqiHeatGradientCss() }}
        />
        <span className="text-xs text-white/65">{pointCount} est.</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {AQI_HEAT_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-[10px] leading-none text-white/60">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-3 text-[11px] text-white/55">
        <span>menor intensidad</span>
        <span>mayor intensidad</span>
      </div>
      <p className="mt-1 max-w-[min(92vw,24rem)] text-[10px] leading-snug text-white/45">
        Interpolación visual entre estaciones; las áreas intermedias no son mediciones directas.
      </p>
      <p className="sr-only">
        Escala de calidad del aire para {label}: de menor a mayor intensidad, Bueno, Moderado,
        Sensibles, Dañino, Muy dañino y Peligroso.
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
}: EnvironmentalMapProps) {
  const [selectedPollutant, setSelectedPollutant] = React.useState<PollutantKey>("pm10");
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
  const [pollutantPanelOpen, setPollutantPanelOpen] = React.useState(true);

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

  const regionCoverage = React.useMemo(() => {
    if (isLoading || stations.length === 0 || !selectedRegion) return null;
    return pointCoverage(selectedRegion.center[0], selectedRegion.center[1], stations);
  }, [isLoading, selectedRegion, stations]);

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
                onClick={() => {
                  setSelectedPollutant(pollutant.key);
                  setPollutantPanelOpen(true);
                }}
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
        </div>

        {coverageMessage && (
          <div className="pointer-events-auto w-fit max-w-[min(92vw,30rem)] rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-white/72 shadow-xl backdrop-blur-xl">
            {coverageMessage}
          </div>
        )}

        {metadata && metadata.foreign_stations_filtered > 0 && (
          <div className="pointer-events-auto w-fit max-w-[min(92vw,30rem)] rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-white/72 shadow-xl backdrop-blur-xl">
            Se descartaron {metadata.foreign_stations_filtered} estaciones fuera de Argentina.
          </div>
        )}

        {!coverageMessage && regionCoverage?.nearest && (
          <div className="pointer-events-auto w-fit max-w-[min(92vw,30rem)] rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-white/72 shadow-xl backdrop-blur-xl">
            Estación más cercana al centro de la región: "{regionCoverage.nearest.station.name}" a{" "}
            {formatDistanceKm(regionCoverage.nearest.distanceKm)} ·{" "}
            {coverageConfidenceLabel(regionCoverage.confidence)}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-[5.6rem] left-3 right-3 z-20 flex justify-center md:bottom-5 md:left-auto md:right-5 md:justify-end">
        <div className="pointer-events-auto">
          <IntensityLegend label={selectedPollutantLabel} pointCount={heatPointCount} />
        </div>
      </div>

      {pollutantPanelOpen && (
        <PollutantInfoPanel pollutant={selectedPollutant} onClose={() => setPollutantPanelOpen(false)} />
      )}

      {selectedStation && (
        <StationPanel
          station={selectedStation}
          selectedPollutant={selectedPollutant}
          regionName={selectedRegion?.name ?? "Región no informada"}
          stations={stations}
          onClose={() => setSelectedStation(null)}
        />
      )}

      <BottomBar scope={scope} onScopeChange={onScopeChange} regions={regions} />
    </div>
  );
}
