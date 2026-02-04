// Zone Detail Card - Slide-in panel when zone is clicked
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  getAqiColor,
  getAqiLabel,
  getContextualMessage,
  getConfidenceLabel,
  formatPollutant,
} from "@/lib/aqiUtils";
import type { ZoneAqiSnapshot } from "@/types/airQuality";
import { cn } from "@/lib/utils";
import { X, MapPin, Activity } from "lucide-react";

interface ZoneDetailCardProps {
  snapshot: ZoneAqiSnapshot | null;
  onClose: () => void;
}

export function ZoneDetailCard({ snapshot, onClose }: ZoneDetailCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (snapshot) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [snapshot]);

  if (!snapshot) return null;

  const aqi = snapshot.aqi ?? 0;
  const aqiColor = getAqiColor(aqi);
  const aqiLabel = getAqiLabel(aqi);
  const contextual = getContextualMessage(aqi);

  const dominantPol = snapshot.dominentpol;
  const stations = snapshot.nearestStations ?? [];

  const sourceLabel = snapshot.source === "REAL" ? "Real" : "Estimado";
  const precisionLabel = getConfidenceLabel(snapshot.confidence);

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-50 h-full w-80",
        "transition-transform duration-300 ease-out",
        isVisible ? "translate-x-0" : "translate-x-full"
      )}
    >
      <GlassCard className="h-full overflow-y-auto rounded-none rounded-l-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{snapshot.zoneName}</h2>

            <span className="text-xs uppercase tracking-wide text-white/50">
              {sourceLabel} · {precisionLabel}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-1.5 transition-colors hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>
        </div>

        {/* AQI Display */}
        <div className="mb-4 flex items-center gap-4 rounded-xl bg-white/5 p-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: `radial-gradient(circle, ${aqiColor}40 0%, transparent 70%)`,
              boxShadow: `0 0 30px ${aqiColor}30`,
            }}
          >
            <span className="tabular-nums text-3xl font-light" style={{ color: aqiColor }}>
              {aqi}
            </span>
          </div>

          <div className="flex-1">
            <span className="block text-lg font-medium" style={{ color: aqiColor }}>
              {aqiLabel}
            </span>
            <span className="text-sm text-white/40">Índice de Calidad del Aire</span>
          </div>
        </div>

        {/* Contextual Message */}
        <div className="mb-6 rounded-xl bg-white/5 p-3">
          <p className="text-sm leading-relaxed text-white/80">
            <span className="mr-2 text-lg">{contextual.emoji}</span>
            {contextual.message}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {/* Data Source */}
          <div className="rounded-xl bg-white/5 p-3">
            <span className="mb-1 block text-xs text-white/40">Fuente</span>
            <span className="text-sm font-medium text-white">{sourceLabel}</span>
          </div>

          {/* Dominant Pollutant */}
          <div className="rounded-xl bg-white/5 p-3">
            <span className="mb-1 block text-xs text-white/40">Contaminante</span>
            <span className="text-sm font-medium text-white">
              {dominantPol ? formatPollutant(dominantPol) : "—"}
            </span>
          </div>
        </div>

        {/* Nearest Stations */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
            <MapPin className="h-3 w-3" />
            Estaciones cercanas
          </h3>

          {stations.length === 0 ? (
            <div className="rounded-xl bg-white/5 p-3 text-sm text-white/60">
              No hay estaciones disponibles para esta zona.
            </div>
          ) : (
            <div className="space-y-2">
              {stations.map((s) => (
                <div
                  key={s.uid}
                  className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {s.name.replace(", Buenos Aires", "")}
                    </span>
                    <span className="text-xs text-white/40">{s.distanceKm.toFixed(1)} km</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3" style={{ color: getAqiColor(s.aqi) }} />
                    <span
                      className="tabular-nums text-sm font-medium"
                      style={{ color: getAqiColor(s.aqi) }}
                    >
                      {s.aqi}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
