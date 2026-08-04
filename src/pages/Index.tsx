import { useMemo, useRef, useState } from "react";
import { EnvironmentalMap } from "../components/EnvironmentalMap";
import { EducationGuide } from "@/components/layout/EducationGuide";
import { useAirQualityData } from "@/hooks/useAirQualityData";
import type { Scope, Zone } from "@/types/airQuality";

export default function Index() {
  const [scope, setScope] = useState<Scope>("argentina");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [educationOpen, setEducationOpen] = useState(false);
  const guideTriggerRef = useRef<HTMLButtonElement | null>(null);

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
    <div className="h-dvh w-full overflow-hidden bg-background app-surface">
      <header className="sr-only">
        <h1>Aire Argentina</h1>
      </header>

      <main className="h-full w-full overflow-hidden p-0 sm:p-3">
        <section className="h-full min-w-0 overflow-hidden">
          <div className="h-full">
            <EnvironmentalMap
              className="rounded-none sm:rounded-[2rem]"
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
              onZoneClick={(z: Zone) =>
                setSelectedZone((prev) => (prev?.id === z.id ? null : z))
              }
              errorMessage={errorMessage}
              appTitle="Aire Argentina"
              dataSource={dataSource}
              summaryLabel={summary.label}
              lastUpdated={lastUpdated}
              onOpenGuide={() => setEducationOpen(true)}
              guideButtonRef={guideTriggerRef}
            />
          </div>

          {educationOpen && (
            <EducationGuide
              onClose={() => {
                setEducationOpen(false);
                window.setTimeout(() => guideTriggerRef.current?.focus(), 0);
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}
