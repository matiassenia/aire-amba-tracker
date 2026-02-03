import { useMemo, useState } from "react";
import { AireAmbaMap } from "../components/AireAmbaMap";
import { useAirQualityData } from "@/hooks/useAirQualityData";
import type { Scope, Zone } from "@/types/airQuality";

function aqiLabel(aqi: number) {
  if (aqi <= 50) return "Bueno";
  if (aqi <= 100) return "Moderado";
  if (aqi <= 150) return "Sensibles";
  if (aqi <= 200) return "Dañino";
  if (aqi <= 300) return "Muy dañino";
  return "Peligroso";
}

function recommendation(aqi: number) {
  if (aqi <= 50) return "Hoy es un gran día para caminar 🚶‍♂️";
  if (aqi <= 100) return "Buen día para salir. Evitá ejercicio intenso 🟡";
  if (aqi <= 150) return "Mejor limitar actividades al aire libre ⚠️";
  if (aqi <= 200) return "Evitá actividad física afuera 🏠";
  return "Mejor quedarse en casa hoy 🏠";
}

export default function Index() {
  const [scope, setScope] = useState<Scope>("amba");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const { stations, zones, averageAqi, lastUpdated, isUsingMockData, isLoading } =
    useAirQualityData(scope);

  const summary = useMemo(() => {
    const aqi = averageAqi ?? 0;
    return {
      aqi,
      label: aqiLabel(aqi),
      rec: recommendation(aqi),
    };
  }, [averageAqi]);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header fijo */}
      <header className="sticky top-0 z-30 glass-card px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Aire AMBA</h1>
            <p className="text-sm text-muted-foreground">
              Calidad del aire · WAQI {isUsingMockData ? "· demo" : ""}
            </p>
          </div>

          {/* Mini resumen compacto (header) */}
          <div className="hidden sm:flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-4 py-2">
            <div className="text-sm font-semibold">AQI {summary.aqi}</div>
            <div className="text-xs text-white/60">{summary.label}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* MAPA módulo */}
          <section className="min-w-0">
            <div className="h-[56vh] max-h-[680px] min-h-[380px]">
              <AireAmbaMap
                scope={scope}
                onScopeChange={(s: Scope) => {
                  setScope(s);
                  setSelectedZone(null);
                }}
                stations={stations}
                zones={zones}
                averageAqi={averageAqi ?? 0}
                selectedZoneId={selectedZone?.id ?? null}
                onZoneClick={(z: Zone) =>
                  setSelectedZone((prev) => (prev?.id === z.id ? null : z))
                }
              />
            </div>

            {/* Mobile panel debajo del mapa (NO overlay) */}
            <div className="mt-4 lg:hidden glass-card rounded-3xl p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm text-white/60">Estado general</div>
                <div className="text-sm font-semibold">
                  AQI {summary.aqi} · {summary.label}
                </div>
              </div>
              <div className="mt-2 text-sm">{summary.rec}</div>
              <div className="mt-3 text-xs text-white/40">
                {isLoading ? "Actualizando..." : `Actualizado ${lastUpdated ?? ""}`}
              </div>
            </div>
          </section>

          {/* PANEL DERECHO (desktop): prioridad zona */}
          <aside className="hidden lg:block">
            <div className="glass-card rounded-3xl p-4">
              {selectedZone ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Zona seleccionada</h2>
                    <button
                      className="text-xs text-white/60 hover:text-white"
                      onClick={() => setSelectedZone(null)}
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="mt-2 text-sm text-white/70">
                    {selectedZone.name ?? "Zona"}
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3">
                    <div className="text-sm font-semibold">AQI (pendiente)</div>
                    <div className="text-xs text-white/60">
                      Próximo: calcular AQI por zona + “Estimado” + confianza
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-semibold">Estado general</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Promedio del área ({scope.toUpperCase()})
                  </p>

                  <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="text-3xl font-semibold">AQI {summary.aqi}</div>
                    <div className="text-sm text-white/70 mt-1">{summary.label}</div>
                    <div className="text-sm mt-3">{summary.rec}</div>
                    <div className="text-xs text-white/40 mt-4">
                      {isLoading ? "Actualizando..." : `Actualizado ${lastUpdated ?? ""}`}
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
