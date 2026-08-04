import React, { Suspense } from "react";
import { X } from "lucide-react";
import { BottomBar } from "@/components/layout/BottomBar";
import { StaticMapFallback } from "@/components/map/StaticMapFallback";
import type { Region, Scope, Station, StationQueryMetadata, Zone } from "@/types/airQuality";
import { cn } from "@/lib/utils";
import {
  availablePollutants,
  heatDiagnosticsForPollutant,
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
  formatAge,
  formatMeasurementDate,
  metadataWasUpdatedRecently,
  thermalCoverageState,
  type PollutantMeasurement,
  type ThermalCoverageSummary,
} from "@/lib/thermalCoverage";
import { historicalHeatPointsForPollutant, type MapViewMode } from "@/lib/historicalThermal";
import { resolveMapRenderer } from "@/lib/mapRenderer";
import { findPollutantHotspot, type PollutantHotspot } from "@/lib/maplibreHeat";
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

const MapLibreGlobe = React.lazy(() =>
  import("@/components/map/MapLibreGlobe").then((mod) => ({ default: mod.MapLibreGlobe })),
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
  errorMessage?: string | null;
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
  const selectedMeasurement = selectedValue === null
    ? null
    : thermalCoverageState([station], selectedPollutant, 0).latestMeasurement;
  const selectedMeasurementExpired = Boolean(selectedMeasurement && selectedMeasurement.freshnessMultiplier <= 0);
  const available = POLLUTANT_KEYS.filter((key) => pollutantValue(station, key) !== null);
  const missing = POLLUTANT_KEYS.filter((key) => pollutantValue(station, key) === null);
  const coverage = stationCoverageInfo(station, stations);

  return (
    <section
      aria-label="Detalle de estación"
      className={cn(
        "fixed inset-x-3 bottom-20 z-40 max-h-[62vh] overflow-y-auto rounded-[1.65rem] border border-white/10 bg-slate-950/78 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-fade-in",
        "max-h-[calc(100dvh-7rem)] overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]",
        "md:absolute md:bottom-auto md:left-auto md:right-5 md:top-20 md:w-[24rem] md:max-h-[calc(100dvh-7rem)]",
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
          Fuente: {(station.source ?? "WAQI").toUpperCase()}
        </span>
        {selectedMeasurementExpired && (
          <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-amber-50">
            Dato antiguo
          </span>
        )}
      </div>

      {selectedMeasurement && (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/75">
          Última medición: {formatMeasurementDate(selectedMeasurement.measuredAt)} · {formatAge(selectedMeasurement.ageHours)}
        </p>
      )}

      {selectedMeasurementExpired ? (
        <p className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-200/8 px-3 py-2 text-sm text-amber-50/90">
          Dato antiguo: no se usa para interpolación térmica ni para hotspots recientes.
        </p>
      ) : freshness.status === "stale" && (
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
  hotspot,
  coverageSummary,
  onViewHotspot,
  onViewLatestStation,
  onClose,
}: {
  pollutant: PollutantKey;
  hotspot: PollutantHotspot | null;
  coverageSummary: ThermalCoverageSummary;
  onViewHotspot: () => void;
  onViewLatestStation: () => void;
  onClose: () => void;
}) {
  const info = pollutantInfo(pollutant);
  const copy = POLLUTANT_PANEL_COPY[pollutant];
  const latest = coverageSummary.latestMeasurement;
  const expiredOnly = coverageSummary.state === "expired-data-only";

  return (
    <section
      aria-label={`Información de ${info.shortName}`}
      className={cn(
        "fixed inset-x-3 bottom-20 z-40 max-h-[48vh] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-slate-950/82 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-fade-in",
        "max-h-[calc(100dvh-7rem)] overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]",
        "md:absolute md:bottom-auto md:left-auto md:right-5 md:top-20 md:w-[24rem] md:max-h-[calc(100dvh-7rem)]",
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
        {expiredOnly && latest && (
          <div className="rounded-2xl border border-amber-200/15 bg-amber-200/8 p-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100/75">Último nivel informado</dt>
            <dd className="mt-1 text-white/82">
              {info.shortName} {latest.value} · {latest.category}
            </dd>
            <dd className="mt-1 text-sm text-white/70">{latest.station.name}</dd>
            <dd className="mt-1 text-xs text-amber-50/80">
              Medido el {formatMeasurementDate(latest.measuredAt)} · Dato antiguo · no usado para interpolación
            </dd>
            <button
              type="button"
              onClick={onViewLatestStation}
              className="mt-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/72 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
            >
              Ver última estación
            </button>
          </div>
        )}
        {!expiredOnly && hotspot && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/70">Mayor nivel disponible</dt>
            <dd className="mt-1 text-white/78">
              AQI {Math.round(hotspot.maxAqi)} · {hotspot.category} · {hotspot.stationCount} estaciones
            </dd>
            <dd className="mt-1 text-xs text-white/50">
              {hotspot.freshestMeasuredAt ? `Dato más reciente: ${hotspot.freshestMeasuredAt}` : "Sin fecha reciente informada"}
            </dd>
            <button
              type="button"
              onClick={onViewHotspot}
              className="mt-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/72 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
            >
              Ver foco en el mapa
            </button>
          </div>
        )}
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

function LatestMeasurementsPanel({
  measurements,
  pollutant,
  onSelectStation,
}: {
  measurements: PollutantMeasurement[];
  pollutant: PollutantKey;
  onSelectStation: (station: Station) => void;
}) {
  const label = pollutantLabel(pollutant);
  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3" aria-label="Últimas mediciones disponibles">
      <h3 className="text-sm font-semibold text-white">Últimas mediciones disponibles</h3>
      <div className="mt-2 grid gap-2">
        {measurements.map((measurement) => (
          <article key={measurement.station.uid} className="rounded-2xl border border-amber-200/15 bg-amber-200/8 p-3 text-sm text-white/78">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-white">{measurement.station.name}</div>
                <div className="mt-1">
                  {label}: {measurement.value} · {measurement.category}
                </div>
                <div className="mt-1 text-xs text-white/62">
                  Última medición: {formatMeasurementDate(measurement.measuredAt)} · {formatAge(measurement.ageHours)}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  Fuente: {(measurement.station.source ?? "WAQI").toUpperCase()} · {measurement.station.region_name ?? measurement.station.region_id ?? "Región no informada"}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-0.5 text-[11px] text-amber-50">
                Dato antiguo
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectStation(measurement.station)}
              className="mt-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/72 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
            >
              Ver estación en el mapa
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

type ContextPanel = "summary" | "measurements" | "station" | null;

function ExpiredDataNotice({
  regionName,
  pollutantLabelText,
  pollutant,
  summary,
  metadata,
  showMeasurements,
  onToggleMeasurements,
  onSelectStation,
}: {
  regionName: string;
  pollutantLabelText: string;
  pollutant: PollutantKey;
  summary: ThermalCoverageSummary;
  metadata: StationQueryMetadata | null;
  showMeasurements: boolean;
  onToggleMeasurements: () => void;
  onSelectStation: (station: Station) => void;
}) {
  const appRecentlyUpdated = metadataWasUpdatedRecently(metadata);
  return (
    <section className="pointer-events-auto max-w-[min(92vw,34rem)] rounded-3xl border border-amber-200/18 bg-slate-950/72 p-4 text-white shadow-2xl backdrop-blur-2xl" aria-label="Estado de mediciones antiguas">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100/75">Datos disponibles, no recientes</div>
      <h2 className="mt-1 text-base font-semibold text-white">Sin mediciones recientes para {pollutantLabelText} en {regionName}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/76">
        Las estaciones disponibles no registran actualizaciones dentro de las últimas 72 horas, por lo que no se genera una interpolación térmica.
      </p>
      <div className="mt-3 grid gap-1 text-sm text-white/70">
        <div>Última medición disponible: {formatMeasurementDate(summary.latestMeasurementAt)}</div>
        {metadata?.updated_at && <div>Datos consultados por la aplicación: {formatMeasurementDate(metadata.updated_at)}</div>}
      </div>
      {appRecentlyUpdated && summary.latestAgeHours !== null && summary.latestAgeHours > 72 && (
        <p className="mt-2 text-xs leading-relaxed text-white/58">
          La aplicación consultó la fuente recientemente, pero las estaciones no publicaron mediciones más nuevas.
        </p>
      )}
      <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm leading-relaxed text-white/72">
        Esto no indica una falla del mapa. La visualización térmica solo se genera con datos suficientemente recientes.
      </p>
      <details className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/70">
        <summary className="cursor-pointer font-medium text-white/82">¿Por qué no se colorea el mapa?</summary>
        <p className="mt-2 leading-relaxed">
          Las zonas térmicas se calculan únicamente con mediciones de hasta 72 horas de antigüedad. En esta región, las últimas estaciones disponibles superan ese límite. Para evitar representar como actual una situación antigua, el mapa muestra las estaciones pero no interpola áreas entre ellas.
        </p>
        <p className="mt-2 leading-relaxed">La frecuencia de actualización depende de cada red o estación publicada por la fuente de datos.</p>
      </details>
      <button
        type="button"
        onClick={onToggleMeasurements}
        className="mt-3 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-medium text-white/78 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
      >
        {showMeasurements ? "Ocultar últimas mediciones" : "Ver últimas mediciones"}
      </button>
      {showMeasurements && (
        <LatestMeasurementsPanel measurements={summary.expiredMeasurements} pollutant={pollutant} onSelectStation={onSelectStation} />
      )}
    </section>
  );
}

function IntensityLegend({
  label,
  pointCount,
  coverageState,
  viewMode,
}: {
  label: string;
  pointCount: number;
  coverageState: ThermalCoverageSummary["state"];
  viewMode: MapViewMode;
}) {
  if (coverageState === "expired-data-only" && viewMode === "current") {
    return (
      <div className="max-w-[min(92vw,26rem)] rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
        <div className="text-sm font-medium text-white/82">Sin estaciones recientes para interpolar</div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/65">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-white/50 bg-white/20 opacity-60" /> punto atenuado = dato antiguo</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-8 rounded-full" style={{ background: aqiHeatGradientCss() }} /> zona térmica = medición reciente/interpolada</span>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[min(92vw,26rem)] rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium text-white/70 sm:inline">
          {viewMode === "latest" ? "Últimas mediciones disponibles" : label}
        </span>
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
        {viewMode === "latest" ? "Puede incluir datos antiguos; no representa la calidad del aire actual." : "Interpolación visual entre estaciones; las áreas intermedias no son mediciones directas."}
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
  errorMessage = null,
  selectedZoneId,
  onZoneClick,
}: EnvironmentalMapProps) {
  const [selectedPollutant, setSelectedPollutant] = React.useState<PollutantKey>("pm10");
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(null);
  const [pollutantPanelOpen, setPollutantPanelOpen] = React.useState(true);
  const [mapLibreUnavailable, setMapLibreUnavailable] = React.useState(false);
  const [focusHotspotRequest, setFocusHotspotRequest] = React.useState(0);
  const [forceHotspotNavigation, setForceHotspotNavigation] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<MapViewMode>("current");
  const [contextPanel, setContextPanel] = React.useState<ContextPanel>("summary");

  const fallbackMap = (
    <StaticMapFallback zones={zones} onZoneClick={onZoneClick} selectedZoneId={selectedZoneId ?? undefined} />
  );
  const requestedRenderer = resolveMapRenderer(import.meta.env.VITE_MAP_RENDERER, import.meta.env.DEV);
  const mapRenderer = requestedRenderer === "maplibre" && !mapLibreUnavailable ? "maplibre" : "leaflet";

  const available = React.useMemo(() => availablePollutants(stations), [stations]);
  const heatPointCount = React.useMemo(
    () => heatPointsForPollutant(stations, selectedPollutant).length,
    [stations, selectedPollutant],
  );
  const historicalPointCount = React.useMemo(
    () => historicalHeatPointsForPollutant(stations, selectedPollutant).length,
    [stations, selectedPollutant],
  );
  const heatDiagnostics = React.useMemo(
    () => heatDiagnosticsForPollutant(stations, selectedPollutant),
    [stations, selectedPollutant],
  );
  const usesReducedOldData = heatDiagnostics.stale > 0 || heatDiagnostics.old > 0;
  const selectedPollutantLabel = pollutantLabel(selectedPollutant);
  const thermalCoverage = React.useMemo(
    () => thermalCoverageState(stations, selectedPollutant, heatPointCount, isLoading),
    [heatPointCount, isLoading, selectedPollutant, stations],
  );
  const hotspot = React.useMemo(
    () => findPollutantHotspot(stations, selectedPollutant),
    [stations, selectedPollutant],
  );
  const hotspotsByPollutant = React.useMemo(() => {
    return new Map(POLLUTANTS.map((pollutant) => [pollutant.key, findPollutantHotspot(stations, pollutant.key)]));
  }, [stations]);

  React.useEffect(() => {
    if (!selectedStation) return;
    if (!stations.some((station) => station.uid === selectedStation.uid)) {
      setSelectedStation(null);
    }
  }, [selectedStation, stations]);

  React.useEffect(() => {
    if (selectedStation) setContextPanel("station");
  }, [selectedStation]);

  React.useEffect(() => {
    setSelectedStation(null);
    setContextPanel("summary");
  }, [selectedPollutant, scope]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedStation) {
        setSelectedStation(null);
        setContextPanel("summary");
        return;
      }
      if (pollutantPanelOpen) setPollutantPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pollutantPanelOpen, selectedStation]);

  const coverageMessage = React.useMemo(() => {
    if (isLoading) return "Actualizando estaciones reales...";
    if (errorMessage) return null;
    if (stations.length === 0) return "No hay estaciones disponibles en esta región.";
    if (thermalCoverage.state === "expired-data-only") return null;
    if (thermalCoverage.state === "no-pollutant-data") return `No hay mediciones de ${selectedPollutantLabel} disponibles en las estaciones de esta región.`;
    if (heatPointCount === 1) return `Una estación informa ${selectedPollutantLabel}; cobertura local.`;
    if (metadata?.coverage_partial) return "Cobertura parcial: algunas regiones no respondieron.";
    if (scope === "argentina") return "Las áreas sin estaciones no representan mediciones.";
    return null;
  }, [errorMessage, heatPointCount, isLoading, metadata?.coverage_partial, scope, selectedPollutantLabel, stations.length, thermalCoverage.state]);

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
            {mapRenderer === "maplibre" ? (
              <MapLibreGlobe
                stations={stations}
                zones={zones}
                region={selectedRegion}
                selectedPollutant={selectedPollutant}
                viewMode={viewMode}
                selectedStationUid={selectedStation?.uid ?? null}
                selectedZoneId={selectedZoneId}
                panelOpen={pollutantPanelOpen || Boolean(selectedStation)}
                hotspot={hotspot}
                focusHotspotRequest={focusHotspotRequest}
                forceHotspotNavigation={forceHotspotNavigation}
                onStationSelect={setSelectedStation}
                onZoneClick={onZoneClick}
                onUnavailable={() => setMapLibreUnavailable(true)}
              />
            ) : (
              <LeafletMap
                stations={stations}
                zones={zones}
                region={selectedRegion}
                selectedPollutant={selectedPollutant}
                viewMode={viewMode}
                selectedStationUid={selectedStation?.uid ?? null}
                selectedZoneId={selectedZoneId}
                onStationSelect={setSelectedStation}
                onZoneClick={onZoneClick}
              />
            )}
          </Suspense>
        </MapErrorBoundary>
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2 md:inset-x-auto md:left-5 md:top-5 md:w-auto">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-slate-950/48 p-1 shadow-2xl backdrop-blur-2xl">
          <span className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/70 md:inline-flex">
            {selectedRegion?.name ?? (scope === "argentina" ? "Argentina" : "Región")}
          </span>
          {POLLUTANTS.map((pollutant) => {
            const hasData = available.includes(pollutant.key);
            const isSelected = selectedPollutant === pollutant.key;
            return (
              <button
                key={pollutant.key}
                type="button"
                onClick={() => {
                  const changed = selectedPollutant !== pollutant.key;
                  setForceHotspotNavigation(false);
                  setSelectedPollutant(pollutant.key);
                  setPollutantPanelOpen(true);
                  if (changed && hotspotsByPollutant.get(pollutant.key)) {
                    setForceHotspotNavigation(false);
                    setFocusHotspotRequest((request) => request + 1);
                  }
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

        <div className="pointer-events-auto flex w-fit max-w-[min(92vw,30rem)] rounded-full border border-white/10 bg-slate-950/58 p-1 shadow-xl backdrop-blur-2xl" role="group" aria-label="Modo de visualización">
          {([
            ["current", "Actual"],
            ["latest", "Últimas mediciones"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === "latest") setContextPanel("measurements");
              }}
              className={cn(
                "min-h-10 rounded-full px-3 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-200/70",
                viewMode === mode ? "bg-white/18 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
          <span className="sr-only" aria-live="polite">
            Modo activo: {viewMode === "current" ? "Actual" : "Últimas mediciones"}
          </span>
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

        {usesReducedOldData && (
          <div className="pointer-events-auto w-fit max-w-[min(92vw,32rem)] rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1.5 text-sm text-amber-50/90 shadow-xl backdrop-blur-xl">
            Esta visualización incluye datos antiguos con intensidad reducida. Revisá la fecha de cada estación.
          </div>
        )}

        {thermalCoverage.state === "expired-data-only" && !errorMessage && (
          <ExpiredDataNotice
            regionName={selectedRegion?.name ?? (scope === "argentina" ? "Argentina" : "esta región")}
            pollutantLabelText={selectedPollutantLabel}
            pollutant={selectedPollutant}
            summary={thermalCoverage}
            metadata={metadata}
            showMeasurements={contextPanel === "measurements"}
            onToggleMeasurements={() => {
              setViewMode("latest");
              setContextPanel("measurements");
            }}
            onSelectStation={(station) => {
              setViewMode("latest");
              setSelectedStation(station);
            }}
          />
        )}

        {errorMessage && (
          <div className="pointer-events-auto w-fit max-w-[min(92vw,32rem)] rounded-full border border-red-300/20 bg-red-300/10 px-3 py-1.5 text-sm text-red-50 shadow-xl backdrop-blur-xl">
            {errorMessage}
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
          <IntensityLegend
            label={selectedPollutantLabel}
            pointCount={viewMode === "latest" ? historicalPointCount : heatPointCount}
            coverageState={thermalCoverage.state}
            viewMode={viewMode}
          />
        </div>
      </div>

      {viewMode === "latest" && historicalPointCount > 0 && (
        <div className="pointer-events-none absolute inset-x-3 top-[8.75rem] z-20 flex justify-center md:inset-x-auto md:left-5 md:top-[8.5rem] md:justify-start">
          <div className="pointer-events-auto max-w-[min(92vw,32rem)] rounded-2xl border border-violet-200/15 bg-slate-950/62 px-3 py-2 text-sm text-white/78 shadow-xl backdrop-blur-2xl">
            <div className="font-medium text-violet-100">Visualización de últimas mediciones</div>
            <div className="text-xs text-white/58">
              {historicalPointCount} estaciones · del {formatMeasurementDate(thermalCoverage.oldestMeasurementAt)} al {formatMeasurementDate(thermalCoverage.latestMeasurementAt)} · No representa la calidad del aire actual
            </div>
          </div>
        </div>
      )}

      {pollutantPanelOpen && contextPanel !== "station" && (
        <PollutantInfoPanel
          pollutant={selectedPollutant}
          hotspot={hotspot}
          coverageSummary={thermalCoverage}
          onViewHotspot={() => {
            setForceHotspotNavigation(true);
            setFocusHotspotRequest((request) => request + 1);
          }}
          onViewLatestStation={() => {
            if (thermalCoverage.latestMeasurement) {
              setViewMode("latest");
              setSelectedStation(thermalCoverage.latestMeasurement.station);
            }
          }}
          onClose={() => setPollutantPanelOpen(false)}
        />
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
