import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { HeatLayer } from "@/components/HeatLayer";
import { buildGrid, fetchAqiByGeo, type WaqiGeoPoint } from "@/lib/waqi";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function aqiColor(aqi: number) {
  if (aqi <= 50) return "#22c55e"; // green
  if (aqi <= 100) return "#eab308"; // yellow
  if (aqi <= 150) return "#f97316"; // orange
  if (aqi <= 200) return "#ef4444"; // red
  if (aqi <= 300) return "#a855f7"; // purple
  return "#7f1d1d"; // maroon
}

function aqiLabel(aqi: number) {
  if (aqi <= 50) return "Bueno";
  if (aqi <= 100) return "Moderado";
  if (aqi <= 150) return "No saludable (sensibles)";
  if (aqi <= 200) return "No saludable";
  if (aqi <= 300) return "Muy no saludable";
  return "Peligroso";
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function MapView() {
  const center: [number, number] = [-34.6037, -58.3816];
  const token = import.meta.env.VITE_WAQI_TOKEN as string | undefined;

  // AMBA bbox
  const bbox = useMemo(
    () => ({
      south: -34.95,
      west: -59.10,
      north: -34.35,
      east: -58.05,
    }),
    []
  );

  // Grilla (≈ 24 puntos)
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
  const [refreshKey, setRefreshKey] = useState(0);

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
          await new Promise((r) => setTimeout(r, 250)); // throttle (cuidamos WAQI)
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
  }, [grid, token, refreshKey]);

  // ✅ Recorte heurístico (evita río / outliers)
  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (typeof p.aqi !== "number") return false;
      const { lat, lon } = p;

      if (lon > -58.2) return false; // río
      if (lat > -34.35 || lat < -34.98) return false;
      if (lon < -59.25) return false;

      return true;
    });
  }, [points]);

  // 📌 Resumen útil: promedio + peor punto
  const summary = useMemo(() => {
    const aqis = filteredPoints.map((p) => p.aqi as number);
    if (!aqis.length) return null;

    const avg = aqis.reduce((a, b) => a + b, 0) / aqis.length;
    const max = Math.max(...aqis);
    const maxPoint = filteredPoints.find((p) => (p.aqi as number) === max);

    return {
      avg: Math.round(avg),
      max,
      maxPoint,
    };
  }, [filteredPoints]);

  const legend = (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
      {[
        { label: "0–50", c: "#22c55e" },
        { label: "51–100", c: "#eab308" },
        { label: "101–150", c: "#f97316" },
        { label: "151–200", c: "#ef4444" },
        { label: "201–300", c: "#a855f7" },
      ].map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: it.c,
              display: "inline-block",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.85)",
            }}
          />
          <span style={{ fontSize: 11, opacity: 0.8 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* HUD glass */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: 12,
          right: 12,
          width: 380,
          maxWidth: "calc(100% - 24px)",
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 14,
          padding: "12px 12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>Aire AMBA</div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>Heatmap por muestreo geográfico (WAQI)</div>
          </div>

          <button
            onClick={() => setRefreshKey((x) => x + 1)}
            disabled={loading}
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.8)",
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            title="Recargar datos"
          >
            {loading ? "Cargando…" : "Recargar"}
          </button>
        </div>

        {legend}

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Chip promedio */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(0,0,0,0.06)",
              flex: "1 1 160px",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: summary ? aqiColor(summary.avg) : "rgba(0,0,0,0.08)",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.75)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>Promedio estimado</div>
              <div style={{ opacity: 0.75, fontSize: 11 }}>
                {summary ? `AQI ${summary.avg} · ${aqiLabel(summary.avg)}` : "—"}
              </div>
            </div>
          </div>

          {/* Chip peor */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 10px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(0,0,0,0.06)",
              flex: "1 1 160px",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: summary ? aqiColor(summary.max) : "rgba(0,0,0,0.08)",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.75)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>Peor punto</div>
              <div style={{ opacity: 0.75, fontSize: 11 }}>
                {summary ? `AQI ${summary.max} · ${aqiLabel(summary.max)}` : "—"}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            Cargando puntos… {progress.done}/{progress.total}
            <div
              style={{
                height: 6,
                marginTop: 8,
                borderRadius: 999,
                background: "rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.35)",
                  transition: "width 200ms linear",
                }}
              />
            </div>
          </div>
        ) : err ? (
          <div style={{ color: "#c0392b", marginTop: 10 }}>{err}</div>
        ) : (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            {filteredPoints.length} puntos · {lastUpdate ? `Actualizado ${formatTime(lastUpdate)}` : ""}
          </div>
        )}

        <div style={{ opacity: 0.6, marginTop: 6, fontSize: 11 }}>
          Nota: esto es una visualización estimada (no medición oficial por barrio).
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🔥 Heatmap (más premium: menos derrame, más presencia) */}
        <HeatLayer
          points={filteredPoints.map((p) => ({
            lat: p.lat,
            lon: p.lon,
            aqi: p.aqi as number,
          }))}
          radius={44}
          blur={26}
          minOpacity={0.28}
          maxZoom={13}
        />

        {/* 🔎 Puntos: estilo “pro” (borde blanco para legibilidad) */}
        {filteredPoints.map((p, idx) => {
          const aqi = p.aqi as number;
          const color = aqiColor(aqi);

          return (
            <CircleMarker
              key={`pt-${p.lat},${p.lon},${idx}`}
              center={[p.lat, p.lon]}
              radius={4.5}
              pathOptions={{
                color: "rgba(255,255,255,0.9)",
                weight: 2,
                opacity: 0.9,
                fillColor: color,
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div style={{ minWidth: 230 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{p.name ?? "Punto AMBA"}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: color,
                        boxShadow: "0 0 0 2px rgba(255,255,255,0.85)",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 12 }}>
                        AQI: <b>{aqi}</b>
                      </div>
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
