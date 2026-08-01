// Politica unica de frescura (contrato compartido con backend/station_coverage.py).
//
//   RECENT_AFTER_HOURS = 6   -> dato considerado reciente (plena confianza).
//   STALE_AFTER_HOURS  = 24  -> a partir de aqui el dato NO cuenta para cobertura.
//
// Estados:
//   recent  -> menor a RECENT_AFTER_HOURS.
//   aging   -> entre RECENT_AFTER_HOURS y STALE_AFTER_HOURS: util pero envejeciendo.
//   stale   -> mayor o igual a STALE_AFTER_HOURS: sin cobertura.
//   unknown -> sin timestamp valido.
export type FreshnessStatus = "recent" | "aging" | "stale" | "unknown";

export const RECENT_AFTER_HOURS = 6;
export const STALE_AFTER_HOURS = 24;

export function stationFreshness(
  measuredAt: string | null | undefined,
  now: Date = new Date(),
): { status: FreshnessStatus; label: string; ageHours: number | null } {
  if (!measuredAt) {
    return { status: "unknown", label: "Fecha desconocida", ageHours: null };
  }
  const measured = new Date(measuredAt);
  if (Number.isNaN(measured.getTime())) {
    return { status: "unknown", label: "Fecha desconocida", ageHours: null };
  }
  const diffMs = Math.max(0, now.getTime() - measured.getTime());
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < RECENT_AFTER_HOURS) {
    return {
      status: "recent",
      label: hours < 1 ? "Actualizado hace menos de 1 hora" : `Actualizado hace ${Math.round(hours)} h`,
      ageHours: hours,
    };
  }
  if (hours < STALE_AFTER_HOURS) {
    return { status: "aging", label: `Actualizado hace ${Math.round(hours)} h`, ageHours: hours };
  }
  const days = Math.round(hours / 24);
  return { status: "stale", label: `Actualizado hace ${days} dias`, ageHours: hours };
}
