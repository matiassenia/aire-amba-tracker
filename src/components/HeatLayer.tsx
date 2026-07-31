import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatLayerWithCanvas = L.Layer & {
  _canvas?: HTMLCanvasElement;
};

type HeatPoint = {
  lat: number;
  lon: number;
  intensity: number;
};

export function HeatLayer({
  points,
  radius = 42,
  blur = 30,
  maxZoom = 13,
  minOpacity = 0.18,
  max = 1,
  gradient,
  pane = "fx",
}: {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  minOpacity?: number;
  max?: number;
  gradient?: Record<number, string>;
  pane?: string;
}) {
  const map = useMap();

  const heatData = useMemo(() => {
    return points
      .filter((p) => Number.isFinite(p.intensity) && p.intensity > 0)
      .map((p) => [p.lat, p.lon, Math.min(p.intensity, 1)] as [number, number, number]);
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
      max,
      pane, // ✅ pane target
      ...(gradient ? { gradient } : {}),
    });

    layer.addTo(map);

    // ✅ aseguramos que NUNCA capture mouse
    const canvas = (layer as HeatLayerWithCanvas)._canvas;
    if (canvas) {
      canvas.style.pointerEvents = "none";
    }

    return () => {
      map.removeLayer(layer);
    };
  }, [map, heatData, radius, blur, maxZoom, minOpacity, max, gradient, pane]);

  return null;
}
