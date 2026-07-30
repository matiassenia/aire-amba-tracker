export type FreshnessStatus = "recent" | "stale" | "unknown";

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
  if (hours < 1) {
    return { status: "recent", label: "Actualizado hace menos de 1 hora", ageHours: hours };
  }
  if (hours < 24) {
    return { status: "recent", label: `Actualizado hace ${Math.round(hours)} h`, ageHours: hours };
  }
  const days = Math.round(hours / 24);
  return { status: "stale", label: `Actualizado hace ${days} dias`, ageHours: hours };
}
