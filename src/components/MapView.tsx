import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polygon,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import { HeatLayer } from "@/components/HeatLayer";
import { buildGrid, fetchAqiByGeo, type WaqiGeoPoint } from "@/lib/waqi";
import { buildDenseGrid, idwEstimate } from "@/lib/idw";
import { useMapEvent } from "react-leaflet";
import { useZones } from "@/state/useZones";
import { ZoneLayer } from "@/components/map/ZoneLayer";
import { getZoneId } from "@/lib/geo/geojson";
import type { ZoneFeature } from "@/lib/geo/geojson";



function MapClickClear({ onClear }: { onClear: () => void }) {
    useMapEvent("click", () => onClear());
    return null;
  }

// Paleta AQI “Apple-like”
function aqiColor(aqi: number) {
  if (aqi <= 50) return "#2FBF71";
  if (aqi <= 100) return "#F2C14E";
  if (aqi <= 150) return "#F39C6B";
  if (aqi <= 200) return "#E96B5A";
  if (aqi <= 300) return "#B07CF7";
  return "#7A1E2C";
}

function aqiLabel(aqi: number) {
  if (aqi <= 50) return "Bueno";
  if (aqi <= 100) return "Moderado";
  if (aqi <= 150) return "No saludable (sensibles)";
  if (aqi <= 200) return "No saludable";
  if (aqi <= 300) return "Muy no saludable";
  return "Peligroso";
}

type GeoJSONLike = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: any;
    };
  }>;
};

// (opcional) si seguís usando mask rings desde /amba.geojson
function extractRings(geo: GeoJSONLike): LatLngExpression[][] {
  const rings: LatLngExpression[][] = [];

  for (const f of geo.features ?? []) {
    const g = f.geometry;
    if (!g) continue;

    if (g.type === "Polygon") {
      const outer = g.coordinates?.[0];
      if (outer?.length) {
        rings.push(outer.map(([lon, lat]: [number, number]) => [lat, lon]));
      }
    }

    if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates ?? []) {
        const outer = poly?.[0];
        if (outer?.length) {
          rings.push(outer.map(([lon, lat]: [number, number]) => [lat, lon]));
        }
      }
    }
  }

  return rings;
}

// ✅ gradient tipado correctamente
const HEAT_GRADIENT = {
  0: "#2FBF71",
  0.45: "#F2C14E",
  0.7: "#F39C6B",
  0.88: "#E96B5A",
  1: "#B07CF7",
} as const satisfies Record<number, string>;

export function MapView() {
  const center: [number, number] = [-34.6037, -58.3816];
  const token = import.meta.env.VITE_WAQI_TOKEN as string | undefined;

  // ✅ Zonas (GeoJSON barrios/partidos)
  const { zones, loading: zonesLoading, err: zonesErr } = useZones("/amba.geojson");
  const [selectedZone, setSelectedZone] = useState<ZoneFeature | null>(null);
  const selectedId = selectedZone ? getZoneId(selectedZone, 0) : null;

  // AMBA bbox
  const bbox = useMemo(
    () => ({
      south: -34.95,
      west: -59.1,
      north: -34.35,
      east: -58.05,
    }),
    []
  );

  // Grilla WAQI (≈ 24 puntos)
  const grid = useMemo(
    () =>
      buildGrid({
        ...bbox,
        stepLat: 0.18,
        stepLon: 0.18,
      }),
    [bbox]
  );

  const [points, setPoints] = useState<WaqiGeoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: grid.length });

  // Mask inversa (fog outside)
  const [maskRings, setMaskRings] = useState<LatLngExpression[][]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadMask() {
      try {
        const res = await fetch("/amba.geojson", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar /amba.geojson");
        const geo = (await res.json()) as GeoJSONLike;
        const rings = extractRings(geo);
        if (!cancelled) setMaskRings(rings);
      } catch (e: any) {
        // no bloquea la app
        console.warn("Mask geojson error:", e?.message ?? e);
      }
    }

    loadMask();
    return () => {
      cancelled = true;
    };
  }, []);

  // Carga WAQI por grilla (muestreo)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setErr("Falta VITE_WAQI_TOKEN en el .env (reiniciá npm run dev).");
        return;
      }

      setLoading(true);
      setErr(null);
      setPoints([]);
      setProgress({ done: 0, total: grid.length });

      try {
        const results: WaqiGeoPoint[] = [];

        for (let i = 0; i < grid.length; i++) {
          if (cancelled) break;

          const g = grid[i];
          try {
            const p = await fetchAqiByGeo({ ...g, token });
            results.push(p);
          } catch {
            results.push({ lat: g.lat, lon: g.lon, aqi: null });
          }

          setProgress({ done: i + 1, total: grid.length });
          await new Promise((r) => setTimeout(r, 250)); // throttle
        }

        if (!cancelled) {
          setPoints(results);
          setLastUpdate(new Date());
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error cargando WAQI");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = window.setInterval(load, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [grid, token]);

  // Recorte heurístico (evita río / outliers)
  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (typeof p.aqi !== "number") return false;
      const { lat, lon } = p;

      if (lon > -58.2) return false; // Río
      if (lat > -34.35 || lat < -34.98) return false;
      if (lon < -59.25) return false;

      return true;
    });
  }, [points]);

  // IDW: campo continuo
  const idwHeatPoints = useMemo(() => {
    const samples = filteredPoints.map((p) => ({
      lat: p.lat,
      lon: p.lon,
      value: p.aqi as number,
    }));

    if (samples.length < 3) return [];

    const dense = buildDenseGrid(bbox, { stepLat: 0.035, stepLon: 0.035 });

    const out: { lat: number; lon: number; aqi: number }[] = [];

    for (const pt of dense) {
      const est = idwEstimate(pt, samples, {
        power: 2,
        k: 8,
        maxDistKm: 35,
        minPoints: 3,
      });

      if (typeof est === "number") out.push({ lat: pt.lat, lon: pt.lon, aqi: est });
    }

    return out;
  }, [filteredPoints, bbox]);

  // Promedio
  const avgAqi = useMemo(() => {
    const aqis = filteredPoints.map((p) => p.aqi as number);
    if (!aqis.length) return null;
    return Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length);
  }, [filteredPoints]);

  // Mask inversa (outer world + holes)
  const inverseMaskPositions = useMemo(() => {
    if (!maskRings.length) return null;

    const world: LatLngExpression[] = [
      [85, -180],
      [85, 180],
      [-85, 180],
      [-85, -180],
    ];

    return [world, ...maskRings] as any;
  }, [maskRings]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 12,
          right: 12,
          width: 360,
          maxWidth: "calc(100% - 24px)",
          background: "rgba(255,255,255,0.80)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 16,
          padding: "12px 12px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Aire AMBA</div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>WAQI · muestreo + IDW</div>
          </div>

          {avgAqi != null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: aqiColor(avgAqi),
                  display: "inline-block",
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.85)",
                }}
              />
              <span style={{ fontWeight: 700 }}>AQI {avgAqi}</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
          {loading ? (
            <div style={{ opacity: 0.85 }}>
              Cargando… {progress.done}/{progress.total}
            </div>
          ) : err ? (
            <div style={{ color: "#c0392b" }}>{err}</div>
          ) : (
            <div style={{ opacity: 0.85 }}>
              {filteredPoints.length} muestras ·{" "}
              {lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </div>
          )}
          <div style={{ opacity: 0.60, fontSize: 11 }}>{avgAqi != null ? aqiLabel(avgAqi) : ""}</div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.60, fontSize: 11 }}>
          Zonas: {zonesLoading ? "cargando…" : zonesErr ? "error" : zones?.features?.length ?? 0}
          {" · "}
          Mask: {maskRings.length ? "ON" : "OFF"}
          {selectedZone ? " · Selección: " + (selectedZone.properties?.name ?? "zona") : ""}
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
          >
        <MapClickClear onClear={ ()=> setSelectedZone(null)} />
      
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Zonas arriba del basemap, debajo del heat (para que el heat “bañe” encima) */}
        {zones?.features?.length ? (
          <ZoneLayer
            features={zones.features}
            selectedId={selectedId}
            onSelect={(f) => setSelectedZone(f)}
          />
        ) : null}

        {/* Heat IDW */}
        <HeatLayer
          points={idwHeatPoints}
          radius={55}
          blur={45}
          minOpacity={0.2}
          maxZoom={13}
          gradient={HEAT_GRADIENT}
        />

        {/* Mask inversa */}
        {inverseMaskPositions && (
          <Polygon
            positions={inverseMaskPositions}
            pathOptions={{
              stroke: false,
              fillColor: "#ffffff",
              fillOpacity: 0.45,
            }}
          />
        )}

        {/* Puntos WAQI */}
        {filteredPoints.map((p, idx) => {
          const aqi = p.aqi as number;
          const color = aqiColor(aqi);

          return (
            <CircleMarker
              key={`pt-${p.lat},${p.lon},${idx}`}
              center={[p.lat, p.lon]}
              radius={3.5}
              pathOptions={{
                color: "rgba(255,255,255,0.95)",
                weight: 1.5,
                opacity: 0.85,
                fillColor: color,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div style={{ minWidth: 230 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Muestra WAQI</div>
                  <div style={{ opacity: 0.7, fontSize: 11 }}>Estimación por estación más cercana</div>

                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: color,
                        display: "inline-block",
                        boxShadow: "0 0 0 2px rgba(255,255,255,0.85)",
                      }}
                    />
                    <div>
                      AQI: <b>{aqi}</b>
                      <div style={{ opacity: 0.75, fontSize: 11 }}>{aqiLabel(aqi)}</div>
                    </div>
                  </div>

                  <div style={{ opacity: 0.7, fontSize: 11, marginTop: 8 }}>
                    ({p.lat.toFixed(4)}, {p.lon.toFixed(4)})
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
