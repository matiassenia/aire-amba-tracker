// src/state/useZones.ts
import { useEffect, useState } from "react";
import type { ZoneFC } from "@/lib/geo/geojson";

export function useZones(url = "/amba.geojson") {
  const [data, setData] = useState<ZoneFC | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
        const json = (await res.json()) as ZoneFC;

        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error cargando GeoJSON");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { zones: data, loading, err };
}
