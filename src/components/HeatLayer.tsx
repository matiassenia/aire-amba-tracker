import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatPoint = {
  lat: number;
  lon: number;
  aqi: number; // numérico
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Mapea AQI a intensidad 0..1 con curva “con estilo”:
 * - levanta medios/bajos para que se note
 * - capea extremos para no quemar el mapa
 */
function aqiToIntensity(aqi: number) {
  const capped = clamp(aqi, 0, 200); // cap suave
  const t = capped / 200; // 0..1
  const boosted = Math.pow(t, 0.65); // sube medios/bajos
  return clamp(boosted, 0, 1);
}

export function HeatLayer({
  points,
  radius = 38,
  blur = 28,
  maxZoom = 13,
  minOpacity = 0.18,
}: {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
    minOpacity?: number;
    gradient: {
      0.0: "#2FBF71",
      0.45: "#F2C14E",
      0.70: "#F39C6B",
      0.88: "#E96B5A",
      1.0: "B07CF7",
    }
  })

  {
  const map = useMap();

  const heatData = useMemo(() => {
    // leaflet.heat acepta [lat, lon, intensity]
    return points.map((p) => [p.lat, p.lon, aqiToIntensity(p.aqi)] as [number, number, number]);
  }, [points]);

  useEffect(() => {
    if (!map) return;
    if (!heatData.length) return;

    // @ts-expect-error: leaflet.heat agrega L.heatLayer a runtime
    const layer = L.heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      minOpacity,
    });

    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, heatData, radius, blur, maxZoom, minOpacity]);

  return null;
}
