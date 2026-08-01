import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Region, Station, Zone } from "@/types/airQuality";
import { aqiColor } from "@/lib/aqiHeatScale";
import { pollutantLabel, pollutantValue, type PollutantKey } from "@/lib/pollutantHeat";
import {
  findPollutantHotspot,
  mapLibreHeatExpressions,
  overviewLayerExpressions,
  type PollutantHotspot,
  stationsToHeatGeoJSON,
  visualGroupsForStations,
} from "@/lib/maplibreHeat";
import {
  AMBA_GLOBE_CAMERA,
  AMBA_HOTSPOT_CAMERA_ZOOM,
  ARGENTINA_GLOBE_CAMERA,
  AIR_QUALITY_LAYER_ORDER,
  cameraTransitionDuration,
  cameraForHotspot,
  isWebGLAvailable,
  isMobileViewport,
  shouldNavigateToHotspot,
  prefersReducedMotion,
  shouldPulseHotspot,
  shouldAutoRotate,
  type GlobeCamera,
} from "@/lib/maplibreGlobe";

type MapLibreGlobeProps = {
  stations: Station[];
  zones: Zone[];
  region: Region | null;
  selectedPollutant: PollutantKey;
  selectedStationUid?: number | null;
  selectedZoneId?: string | null;
  panelOpen?: boolean;
  hotspot?: PollutantHotspot | null;
  focusHotspotRequest?: number;
  forceHotspotNavigation?: boolean;
  onStationSelect: (station: Station) => void;
  onZoneClick: (zone: Zone) => void;
  onUnavailable: () => void;
};

const HEAT_SOURCE_ID = "air-quality-heat";
const STATION_SOURCE_ID = "air-quality-stations";
const GROUP_SOURCE_ID = "air-quality-visual-groups";
const HOTSPOT_SOURCE_ID = "selected-hotspot";

function cameraForRegion(region: Region | null): GlobeCamera {
  if (!region || region.id === "argentina") return ARGENTINA_GLOBE_CAMERA;
  if (region.id === "amba") return AMBA_GLOBE_CAMERA;
  return {
    latitude: region.center[0],
    longitude: region.center[1],
    zoom: Math.max(4, region.default_zoom),
    bearing: -8,
    pitch: 18,
  };
}

function currentGlobeCamera(map: MapLibreMap): GlobeCamera {
  const center = map.getCenter();
  return {
    latitude: center.lat,
    longitude: center.lng,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

function flyToCamera(map: MapLibreMap, camera: GlobeCamera, reducedMotion = false, duration?: number) {
  map.flyTo({
    center: [camera.longitude, camera.latitude],
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch,
    duration: duration ?? cameraTransitionDuration(currentGlobeCamera(map), camera, reducedMotion),
    speed: 0.45,
    curve: 1.15,
    essential: false,
    easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  });
}

function stationFeatureCollection(stations: Station[], pollutant: PollutantKey) {
  return {
    type: "FeatureCollection" as const,
    features: stations.map((station) => {
      const value = pollutantValue(station, pollutant);
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [station.lon, station.lat] as [number, number] },
        properties: {
          uid: station.uid,
          name: station.name,
          aqi: value ?? -1,
          hasValue: value !== null,
          color: value === null ? "#64748b" : aqiColor(value),
        },
      };
    }),
  };
}

function groupFeatureCollection(stations: Station[], pollutant: PollutantKey) {
  return {
    type: "FeatureCollection" as const,
    features: visualGroupsForStations(stations, pollutant).map((group) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [group.lon, group.lat] as [number, number] },
      properties: {
        id: group.id,
        stationCount: group.stationCount,
        maxAqi: group.maxAqi,
        averageAqi: group.averageAqi,
        color: group.color,
        category: group.category,
        intensity: group.intensity,
        freshPercent: group.freshPercent,
        stalePercent: group.stalePercent,
        oldPercent: group.oldPercent,
        freshnessFactor: group.freshnessFactor,
      },
    })),
  };
}

function hotspotFeatureCollection(hotspot: PollutantHotspot | null, pulseOpacity = 0.42) {
  return {
    type: "FeatureCollection" as const,
    features: hotspot
      ? [
          {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [hotspot.lon, hotspot.lat] as [number, number] },
            properties: {
              color: hotspot.color,
              maxAqi: hotspot.maxAqi,
              stationCount: hotspot.stationCount,
              pulseOpacity,
            },
          },
        ]
      : [],
  };
}

export function MapLibreGlobe({
  stations,
  region,
  selectedPollutant,
  panelOpen = false,
  hotspot: hotspotProp,
  focusHotspotRequest = 0,
  forceHotspotNavigation = false,
  onStationSelect,
  onUnavailable,
}: MapLibreGlobeProps) {
  const hotspot = useMemo(
    () => hotspotProp ?? findPollutantHotspot(stations, selectedPollutant),
    [hotspotProp, selectedPollutant, stations],
  );
  const heatGeoJson = useMemo(() => stationsToHeatGeoJSON(stations, selectedPollutant), [stations, selectedPollutant]);
  const stationGeoJson = useMemo(() => stationFeatureCollection(stations, selectedPollutant), [stations, selectedPollutant]);
  const groupGeoJson = useMemo(() => groupFeatureCollection(stations, selectedPollutant), [stations, selectedPollutant]);
  const hotspotGeoJson = useMemo(() => hotspotFeatureCollection(hotspot), [hotspot]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const stationsRef = useRef(stations);
  const heatGeoJsonRef = useRef(heatGeoJson);
  const stationGeoJsonRef = useRef(stationGeoJson);
  const groupGeoJsonRef = useRef(groupGeoJson);
  const hotspotGeoJsonRef = useRef(hotspotGeoJson);
  const regionRef = useRef(region);
  const onStationSelectRef = useRef(onStationSelect);
  const onUnavailableRef = useRef(onUnavailable);
  const userInteractedRef = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const pulseFrameRef = useRef<number | null>(null);
  const lastFocusedRequestRef = useRef(0);
  const [rotationPaused, setRotationPaused] = useState(() => isMobileViewport());
  const [userInteracted, setUserInteracted] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    stationsRef.current = stations;
    heatGeoJsonRef.current = heatGeoJson;
    stationGeoJsonRef.current = stationGeoJson;
    groupGeoJsonRef.current = groupGeoJson;
    hotspotGeoJsonRef.current = hotspotGeoJson;
    regionRef.current = region;
    onStationSelectRef.current = onStationSelect;
    onUnavailableRef.current = onUnavailable;
  }, [groupGeoJson, heatGeoJson, hotspotGeoJson, onStationSelect, onUnavailable, region, stationGeoJson, stations]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!isWebGLAvailable()) {
      onUnavailableRef.current();
      return;
    }

    let map: MapLibreMap | null = null;
    try {
      const initialCamera = cameraForRegion(regionRef.current);
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            cartoDark: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors © CARTO",
            },
          },
          layers: [{ id: "cartoDark", type: "raster", source: "cartoDark" }],
        },
        center: [initialCamera.longitude, initialCamera.latitude],
        zoom: initialCamera.zoom,
        bearing: initialCamera.bearing,
        pitch: initialCamera.pitch,
        attributionControl: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("error", () => setInitError("MapLibre no pudo renderizar el globo."));
      const pauseInteraction = () => {
        if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
        userInteractedRef.current = true;
        setUserInteracted(true);
        interactionTimeoutRef.current = window.setTimeout(() => {
          userInteractedRef.current = false;
          setUserInteracted(false);
        }, 16000);
      };
      map.on("dragstart", pauseInteraction);
      map.on("zoomstart", pauseInteraction);
      map.on("rotatestart", pauseInteraction);
      map.on("pitchstart", pauseInteraction);
      map.on("load", () => {
        map?.setProjection({ type: "globe" });
        (map as MapLibreMap & { setFog?: (fog: Record<string, unknown>) => void })?.setFog?.({
          color: "#07111f",
          "high-color": "#0f172a",
          "space-color": "#020617",
          "horizon-blend": 0.08,
        });
        map?.addSource(HEAT_SOURCE_ID, { type: "geojson", data: heatGeoJsonRef.current });
        map?.addLayer({
          id: "air-quality-heatmap",
          type: "heatmap",
          source: HEAT_SOURCE_ID,
          paint: {
            "heatmap-weight": mapLibreHeatExpressions.weight,
            "heatmap-radius": mapLibreHeatExpressions.radius,
            "heatmap-intensity": mapLibreHeatExpressions.intensity,
            "heatmap-opacity": mapLibreHeatExpressions.opacity,
            "heatmap-color": mapLibreHeatExpressions.color,
          } as Record<string, unknown>,
        });
        map?.addSource(GROUP_SOURCE_ID, { type: "geojson", data: groupGeoJsonRef.current });
        map?.addLayer({
          id: "air-quality-overview-outer",
          type: "circle",
          source: GROUP_SOURCE_ID,
          maxzoom: 8,
          paint: {
            "circle-radius": overviewLayerExpressions.outerRadius,
            "circle-color": ["get", "color"],
            "circle-opacity": overviewLayerExpressions.outerOpacity,
            "circle-blur": 0.82,
          } as Record<string, unknown>,
        });
        map?.addLayer({
          id: "air-quality-overview-middle",
          type: "circle",
          source: GROUP_SOURCE_ID,
          maxzoom: 8,
          paint: {
            "circle-radius": overviewLayerExpressions.middleRadius,
            "circle-color": ["get", "color"],
            "circle-opacity": overviewLayerExpressions.middleOpacity,
            "circle-blur": 0.48,
          } as Record<string, unknown>,
        });
        map?.addLayer({
          id: "air-quality-groups",
          type: "circle",
          source: GROUP_SOURCE_ID,
          maxzoom: 8,
          paint: {
            "circle-radius": overviewLayerExpressions.coreRadius,
            "circle-color": ["get", "color"],
            "circle-opacity": overviewLayerExpressions.coreOpacity,
            "circle-stroke-color": "rgba(255,255,255,0.62)",
            "circle-stroke-width": 0.8,
          } as Record<string, unknown>,
        });
        map?.addLayer({
          id: "air-quality-group-labels",
          type: "symbol",
          source: GROUP_SOURCE_ID,
          maxzoom: 8,
          layout: {
            "text-field": ["case", [">=", ["get", "oldPercent"], 0.5], "dato antiguo", ["to-string", ["get", "stationCount"]]],
            "text-size": 12,
          },
          paint: { "text-color": "#ffffff", "text-halo-color": "rgba(2,6,23,0.8)", "text-halo-width": 1.2 },
        });
        map?.addSource(HOTSPOT_SOURCE_ID, { type: "geojson", data: hotspotGeoJsonRef.current });
        map?.addLayer({
          id: "selected-hotspot-outer",
          type: "circle",
          source: HOTSPOT_SOURCE_ID,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 46, 5, 72, 8, 52, 11, 28],
            "circle-color": ["get", "color"],
            "circle-opacity": ["get", "pulseOpacity"],
            "circle-blur": 0.78,
          } as Record<string, unknown>,
        });
        map?.addLayer({
          id: "selected-hotspot-middle",
          type: "circle",
          source: HOTSPOT_SOURCE_ID,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 20, 5, 34, 8, 28, 11, 16],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.62,
            "circle-blur": 0.36,
          } as Record<string, unknown>,
        });
        map?.addLayer({
          id: "selected-hotspot-core",
          type: "circle",
          source: HOTSPOT_SOURCE_ID,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 6, 8, 10, 10],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.96,
            "circle-stroke-color": "rgba(255,255,255,0.85)",
            "circle-stroke-width": 1.2,
          } as Record<string, unknown>,
        });
        map?.addSource(STATION_SOURCE_ID, { type: "geojson", data: stationGeoJsonRef.current });
        map?.addLayer({
          id: "air-quality-stations",
          type: "circle",
          source: STATION_SOURCE_ID,
          minzoom: 7,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 4, 10, 7, 13, 9],
            "circle-color": ["get", "color"],
            "circle-opacity": ["case", ["get", "hasValue"], 0.9, 0.42],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        map?.moveLayer(AIR_QUALITY_LAYER_ORDER[AIR_QUALITY_LAYER_ORDER.length - 1]);
        map?.on("click", "air-quality-stations", (event) => {
          const uid = event.features?.[0]?.properties?.uid;
          const station = stationsRef.current.find((candidate) => candidate.uid === Number(uid));
          if (station) onStationSelectRef.current(station);
        });
        map?.on("mouseenter", "air-quality-stations", () => {
          if (map) map.getCanvas().style.cursor = "pointer";
        });
        map?.on("mouseleave", "air-quality-stations", () => {
          if (map) map.getCanvas().style.cursor = "";
        });
      });
    } catch {
      setInitError("MapLibre no pudo inicializarse.");
      onUnavailableRef.current();
    }

    return () => {
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
      if (pulseFrameRef.current) window.cancelAnimationFrame(pulseFrameRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(HEAT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(heatGeoJson);
    (map.getSource(STATION_SOURCE_ID) as GeoJSONSource | undefined)?.setData(stationGeoJson);
    (map.getSource(GROUP_SOURCE_ID) as GeoJSONSource | undefined)?.setData(groupGeoJson);
    (map.getSource(HOTSPOT_SOURCE_ID) as GeoJSONSource | undefined)?.setData(hotspotGeoJson);
  }, [heatGeoJson, stationGeoJson, groupGeoJson, hotspotGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    flyToCamera(map, cameraForRegion(region), reducedMotion);
  }, [reducedMotion, region]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hotspot || focusHotspotRequest === lastFocusedRequestRef.current || (!forceHotspotNavigation && userInteractedRef.current)) return;
    lastFocusedRequestRef.current = focusHotspotRequest;
    const targetCamera = cameraForHotspot(hotspot.lat, hotspot.lon);
    if (regionRef.current?.id === "amba") {
      targetCamera.zoom = AMBA_HOTSPOT_CAMERA_ZOOM;
      targetCamera.pitch = 10;
    }
    if (!forceHotspotNavigation && !shouldNavigateToHotspot(currentGlobeCamera(map), targetCamera)) {
      const source = map.getSource(HOTSPOT_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(hotspotFeatureCollection(hotspot, 0.42));
      return;
    }
    setUserInteracted(true);
    userInteractedRef.current = true;
    flyToCamera(map, targetCamera, reducedMotion);
    const resumeDelay = reducedMotion ? 300 : 14000;
    if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = window.setTimeout(() => {
      userInteractedRef.current = false;
      setUserInteracted(false);
    }, resumeDelay);

    if (!shouldPulseHotspot(reducedMotion)) return;
    if (pulseFrameRef.current) window.cancelAnimationFrame(pulseFrameRef.current);
    const source = map.getSource(HOTSPOT_SOURCE_ID) as GeoJSONSource | undefined;
    const start = performance.now();
    const duration = 2600;
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(1, elapsed / duration);
      const wave = (Math.sin(progress * Math.PI * 6) + 1) / 2;
      source?.setData(hotspotFeatureCollection(hotspot, 0.22 + wave * 0.42));
      if (progress < 1) {
        pulseFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        source?.setData(hotspotFeatureCollection(hotspot, 0.34));
        pulseFrameRef.current = null;
      }
    };
    pulseFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (pulseFrameRef.current) window.cancelAnimationFrame(pulseFrameRef.current);
      pulseFrameRef.current = null;
    };
  }, [focusHotspotRequest, forceHotspotNavigation, hotspot, reducedMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shouldAutoRotate(reducedMotion, rotationPaused || userInteracted, panelOpen)) return;
    const interval = window.setInterval(() => {
      if (!map.isMoving()) map.easeTo({ bearing: map.getBearing() + 0.035, pitch: 5, duration: 1000, easing: (t) => t });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [panelOpen, reducedMotion, rotationPaused, userInteracted]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#102033_0%,#06111f_46%,#020617_100%)]" aria-label="Globo 3D de calidad del aire">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(2,6,23,0.32)_78%,rgba(2,6,23,0.68)_100%)]" />
      <div className="absolute left-3 top-20 z-10 flex flex-wrap gap-2 md:left-auto md:right-14 md:top-3">
        <button type="button" onClick={() => mapRef.current && flyToCamera(mapRef.current, ARGENTINA_GLOBE_CAMERA, reducedMotion)} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Ver Argentina
        </button>
        <button type="button" onClick={() => mapRef.current && flyToCamera(mapRef.current, AMBA_GLOBE_CAMERA, reducedMotion)} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Ver AMBA
        </button>
        <button type="button" onClick={() => mapRef.current && flyToCamera(mapRef.current, cameraForRegion(region), reducedMotion)} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Restablecer vista
        </button>
        <button type="button" onClick={() => setRotationPaused((paused) => !paused)} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          {rotationPaused ? "Reanudar rotación" : "Pausar rotación"}
        </button>
      </div>
      {hotspot && (
        <div className="absolute right-3 top-36 z-10 max-w-[min(92vw,20rem)] rounded-3xl border border-white/10 bg-slate-950/58 p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl md:right-5 md:top-16">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">Foco destacado</div>
          <div className="mt-1 text-sm font-semibold">Mayor nivel informado de {pollutantLabel(selectedPollutant)}</div>
          <div className="mt-1 text-xs text-white/65">AQI {Math.round(hotspot.maxAqi)} · {hotspot.category} · {hotspot.stationCount} est.</div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/48">Resumen visual basado en estaciones disponibles; no representa toda la región.</p>
        </div>
      )}
      {initError && (
        <div className="absolute bottom-24 left-3 right-3 z-10 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50 backdrop-blur-xl md:left-5 md:right-auto md:max-w-md">
          {initError} Se conserva Leaflet como fallback.
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[min(92vw,34rem)] rounded-2xl border border-white/10 bg-slate-950/52 px-3 py-2 text-xs leading-relaxed text-white/58 backdrop-blur-xl">
        <div className="font-medium text-white/78">Focos según estaciones disponibles</div>
        <div>Color: nivel AQI · Intensidad: frescura y cantidad de estaciones</div>
        <div>Las zonas transparentes pueden no tener cobertura. Basemap: CARTO Dark Matter con datos © OpenStreetMap contributors © CARTO.</div>
      </div>
    </div>
  );
}
