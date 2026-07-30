import { useMemo, useState } from "react";
import { EnvironmentalMap } from "../components/EnvironmentalMap";
import { useAirQualityData } from "@/hooks/useAirQualityData";
import type { Scope, Zone } from "@/types/airQuality";
import { pollutantInfo } from "@/lib/pollutantInfo";
import type { PollutantKey } from "@/lib/pollutantHeat";

const POLLUTANT_KEYS: PollutantKey[] = ["pm25", "pm10", "no2", "o3", "so2", "co"];

export default function Index() {
  const [scope, setScope] = useState<Scope>("argentina");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [educationOpen, setEducationOpen] = useState(false);

  const { stations, zones, regions, selectedRegion, metadata, lastUpdated, isLoading, errorMessage } =
    useAirQualityData(scope);

  const selectedZoneId = selectedZone?.id ?? null;

  const summary = useMemo(() => {
    if (errorMessage) {
      return { label: "Sin datos", text: errorMessage };
    }
    if (metadata) {
      const pollutants = metadata.pollutants_available.length
        ? metadata.pollutants_available.join(", ")
        : "sin contaminantes disponibles";
      return {
        label: `${metadata.stations_returned} estaciones`,
        text: `${metadata.stations_with_data} estaciones con datos. Contaminantes: ${pollutants}.`,
      };
    }
    return {
      label: "Cargando cobertura",
      text: "Consultando estaciones reales disponibles.",
    };
  }, [metadata, errorMessage]);

  const dataSource = stations.some((station) => station.source === "waqi") ? "WAQI" : null;

  return (
    <div className="min-h-screen w-full bg-background app-surface">
      <header className="px-3 pb-1 pt-3 sm:px-4">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 rounded-full border border-white/10 bg-slate-950/42 px-4 py-2 shadow-xl backdrop-blur-2xl">
          <div>
            <h1 className="text-base font-semibold leading-tight text-white">Aire Argentina</h1>
            <p className="text-xs text-white/58">
              {selectedRegion?.name ?? scope} {dataSource ? `· ${dataSource}` : ""}
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 sm:flex">
            <div className="text-sm font-semibold">{summary.label}</div>
            <div className="h-1 w-1 rounded-full bg-white/35" />
            <div className="text-xs text-white/62">{isLoading ? "Actualizando" : "Datos reales"}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1920px] px-2 pb-3 pt-2 sm:px-4">
        <section className="min-w-0">
            <div className="h-[75vh] min-h-[500px] md:h-[80vh] xl:h-[85vh] xl:min-h-[680px] 2xl:h-[88vh]">
              <EnvironmentalMap
                scope={scope}
                onScopeChange={(s: Scope) => {
                  setScope(s);
                  setSelectedZone(null);
                }}
                stations={stations}
                zones={zones}
                regions={regions}
                selectedRegion={selectedRegion}
                metadata={metadata}
                isLoading={isLoading}
                selectedZoneId={selectedZoneId}
                onOpenEducation={() => setEducationOpen((open) => !open)}
                onZoneClick={(z: Zone) =>
                  setSelectedZone((prev) => (prev?.id === z.id ? null : z))
                }
              />
            </div>

            <div className="mx-auto mt-3 max-w-4xl rounded-3xl border border-white/10 bg-slate-950/35 p-3 text-sm text-white/70 shadow-xl backdrop-blur-xl lg:hidden">
              {errorMessage && (
                <div className="mb-3 rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-50">
                  {errorMessage}
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-white/62">Cobertura</div>
                <div className="text-sm font-semibold">
                  {summary.label}
                </div>
              </div>
              <div className="mt-2 text-sm">{summary.text}</div>
              <div className="mt-3 text-xs text-white/40">
                {isLoading ? "Actualizando..." : `Actualizado ${lastUpdated ?? ""}`}
              </div>
            </div>

            {educationOpen && (
              <section className="mx-auto mt-3 max-w-6xl rounded-[1.75rem] border border-white/10 bg-slate-950/42 p-4 text-white shadow-xl backdrop-blur-2xl animate-fade-in">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Entender los contaminantes</h2>
                    <p className="mt-1 text-sm text-white/62">Guía rápida de lectura para los valores informados por WAQI.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEducationOpen(false)}
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm text-white/72 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {POLLUTANT_KEYS.map((key) => {
                    const info = pollutantInfo(key);
                    return (
                      <article key={key} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: info.visualColor }} />
                          <h3 className="font-semibold text-white">{info.shortName}</h3>
                          <span className="truncate text-sm text-white/60">{info.fullName}</span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/70">{info.description}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </section>
      </main>
    </div>
  );
}
