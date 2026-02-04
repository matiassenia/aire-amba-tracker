import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatPoint = {
  lat: number;
  lon: number;
  aqi: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function aqiToIntensity(aqi: number) {
  const capped = clamp(aqi, 0, 180);
  const t = capped / 180;
  const boosted = Math.pow(t, 0.75);
  return clamp(boosted, 0, 1);
}

export function HeatLayer({
  points,
  radius = 42,
  blur = 30,
  maxZoom = 13,
  minOpacity = 0.18,
  gradient,
  pane = "fx", // ✅ pane target
}: {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
  pane?: string;
}) {
  const map = useMap();

  const heatData = useMemo(() => {
    return points.map(
      (p) => [p.lat, p.lon, aqiToIntensity(p.aqi)] as [number, number, number]
    );
  }, [points]);

  useEffect(() => {
    if (!map) return;
    if (!heatData.length) return;

    // @ts-expect-error leaflet.heat agrega L.heatLayer en runtime
    const layer = L.heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      minOpacity,
      pane, // ✅ importantísimo: lo manda a ese pane
      ...(gradient ? { gradient } : {}),
    });

    layer.addTo(map);

    // ✅ aseguramos que NUNCA capture mouse
    const canvas = (layer as any)?._canvas as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.style.pointerEvents = "none";
    }

    return () => {
      map.removeLayer(layer);
    };
  }, [map, heatData, radius, blur, maxZoom, minOpacity, gradient, pane]);

  return null;
}
