import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Region, Station, Zone } from "@/types/airQuality";
import { aqiColor } from "@/lib/aqiHeatScale";
import { freshnessMultiplierForStation, pollutantLabel, pollutantValue, type PollutantKey } from "@/lib/pollutantHeat";
import {
  findPollutantHotspot,
  mapLibreHeatExpressions,
  overviewLayerExpressions,
  type PollutantHotspot,
  stationsToHeatGeoJSON,
  visualGroupsForStations,
} from "@/lib/maplibreHeat";
import { isStationInsideArgentina } from "@/lib/argentinaBoundary";
import { MAPLIBRE_SOURCE_IDS, syncMapLibreSources } from "@/lib/maplibreSourceSync";
import {
  AMBA_GLOBE_CAMERA,
  AMBA_HOTSPOT_CAMERA_ZOOM,
  ARGENTINA_GLOBE_CAMERA,
  AIR_QUALITY_LAYER_ORDER,
  MAPLIBRE_GLYPHS_URL,
  MAPLIBRE_OVERVIEW_MAX_ZOOM,
  cameraForHotspot,
  isWebGLAvailable,
  isMobileViewport,
  moveCamera,
  shouldNavigateToHotspot,
  prefersReducedMotion,
  shouldPulseHotspot,
  shouldAutoRotate,
  type CameraAnimation,
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

type MapLibreErrorEvent = {
  error?: Error;
  sourceId?: string;
  layerId?: string;
  tile?: unknown;
};

const HEAT_SOURCE_ID = MAPLIBRE_SOURCE_IDS.heat;
const STATION_SOURCE_ID = MAPLIBRE_SOURCE_IDS.stations;
const GROUP_SOURCE_ID = MAPLIBRE_SOURCE_IDS.groups;
const HOTSPOT_SOURCE_ID = MAPLIBRE_SOURCE_IDS.hotspot;

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

function stationFeatureCollection(stations: Station[], pollutant: PollutantKey) {
  return {
    type: "FeatureCollection" as const,
    features: stations.map((station) => {
      const value = pollutantValue(station, pollutant);
      const isExpired = value !== null && freshnessMultiplierForStation(station) <= 0;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [station.lon, station.lat] as [number, number] },
        properties: {
          uid: station.uid,
          name: station.name,
          aqi: value ?? -1,
          hasValue: value !== null,
          isExpired,
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
  const cameraAnimationRef = useRef<CameraAnimation | null>(null);
  const lastFocusedRequestRef = useRef(0);
  const [rotationPaused, setRotationPaused] = useState(() => isMobileViewport());
  const [userInteracted, setUserInteracted] = useState(false);
  const [fatalError, setFatalError] = useState(false);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  const moveMapCamera = useCallback((map: MapLibreMap, camera: GlobeCamera, operation: string) => {
    cameraAnimationRef.current?.cancel();
    cameraAnimationRef.current = moveCamera(map, camera, {
      reducedMotion,
      operation,
    });
  }, [reducedMotion]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    moveMapCamera(
      map,
      {
        latitude: center.lat,
        longitude: center.lng,
        zoom: Math.max(2, Math.min(12, map.getZoom() + delta)),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      },
      delta > 0 ? "zoom-in" : "zoom-out",
    );
  }, [moveMapCamera]);

  const resetOrientation = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    moveMapCamera(
      map,
      { latitude: center.lat, longitude: center.lng, zoom: map.getZoom(), bearing: 0, pitch: 5 },
      "reset-orientation",
    );
  }, [moveMapCamera]);

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
      setFatalError(true);
      onUnavailableRef.current();
      return;
    }

    let map: MapLibreMap | null = null;
    let fatalFallbackTriggered = false;
    const triggerFatalFallback = (error: unknown) => {
      if (fatalFallbackTriggered) return;
      fatalFallbackTriggered = true;
      if (import.meta.env.DEV) {
        console.error("[MapLibre:fatal]", error);
      }
      setFatalError(true);
      map?.remove();
      mapRef.current = null;
      onUnavailableRef.current();
    };

    try {
      const initialCamera = cameraForRegion(regionRef.current);
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          glyphs: MAPLIBRE_GLYPHS_URL,
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
      map.setProjection({ type: "globe" });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("error", (event: MapLibreErrorEvent) => {
        if (!import.meta.env.DEV) return;
        console.error("[MapLibre]", {
          message: event.error?.message,
          sourceId: event.sourceId,
          layerId: event.layerId,
          tile: event.tile,
        });
      });
      const pauseInteraction = () => {
        cameraAnimationRef.current?.cancel();
        cameraAnimationRef.current = null;
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
        try {
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
            maxzoom: MAPLIBRE_OVERVIEW_MAX_ZOOM,
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
            maxzoom: MAPLIBRE_OVERVIEW_MAX_ZOOM,
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
            maxzoom: MAPLIBRE_OVERVIEW_MAX_ZOOM,
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
            maxzoom: MAPLIBRE_OVERVIEW_MAX_ZOOM,
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
            "circle-opacity": ["case", ["get", "isExpired"], 0.34, ["get", "hasValue"], 0.9, 0.42],
            "circle-stroke-color": ["case", ["get", "isExpired"], "rgba(226,232,240,0.78)", "#ffffff"],
            "circle-stroke-width": ["case", ["get", "isExpired"], 1.8, 1],
          },
          });
          map?.moveLayer(AIR_QUALITY_LAYER_ORDER[AIR_QUALITY_LAYER_ORDER.length - 1]);
          if (map) {
            syncMapLibreSources(map, {
              heat: heatGeoJsonRef.current,
              stations: stationGeoJsonRef.current,
              groups: groupGeoJsonRef.current,
              hotspot: hotspotGeoJsonRef.current,
            });
          }
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
        } catch (error) {
          triggerFatalFallback(error);
        }
      });
    } catch (error) {
      triggerFatalFallback(error);
    }

    return () => {
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
      if (pulseFrameRef.current) window.cancelAnimationFrame(pulseFrameRef.current);
      cameraAnimationRef.current?.cancel();
      cameraAnimationRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncMapLibreSources(map, { heat: heatGeoJson, stations: stationGeoJson, groups: groupGeoJson, hotspot: hotspotGeoJson });
  }, [heatGeoJson, stationGeoJson, groupGeoJson, hotspotGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    moveMapCamera(map, cameraForRegion(region), "region");
  }, [moveMapCamera, region, reducedMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hotspot || focusHotspotRequest === lastFocusedRequestRef.current || (!forceHotspotNavigation && userInteractedRef.current)) return;
    lastFocusedRequestRef.current = focusHotspotRequest;
    const targetCamera = cameraForHotspot(hotspot.lat, hotspot.lon);
    if (regionRef.current?.id === "amba") {
      targetCamera.zoom = AMBA_HOTSPOT_CAMERA_ZOOM;
      targetCamera.pitch = 10;
    }
    const center = map.getCenter();
    const currentCamera = {
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
    if (!forceHotspotNavigation && !shouldNavigateToHotspot(currentCamera, targetCamera)) {
      const source = map.getSource(HOTSPOT_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(hotspotFeatureCollection(hotspot, 0.42));
      return;
    }
    setUserInteracted(true);
    userInteractedRef.current = true;
    moveMapCamera(map, targetCamera, "hotspot");
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
  }, [focusHotspotRequest, forceHotspotNavigation, hotspot, moveMapCamera, reducedMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shouldAutoRotate(reducedMotion, rotationPaused || userInteracted, panelOpen)) return;
    let frame: number | null = null;
    const rotate = () => {
      if (!map.isMoving()) {
        map.jumpTo({ bearing: map.getBearing() + 0.002, pitch: 5 });
      }
      frame = window.requestAnimationFrame(rotate);
    };
    frame = window.requestAnimationFrame(rotate);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [panelOpen, reducedMotion, rotationPaused, userInteracted]);

  const emptyThermalMessage = useMemo(() => {
    if (heatGeoJson.features.length > 0 || groupGeoJson.features.length > 0) return null;
    const stationsWithPollutant = stations.filter((station) => {
      const value = pollutantValue(station, selectedPollutant);
      return value !== null && Number.isFinite(value);
    });
    if (stationsWithPollutant.length === 0) {
      return "No hay valores recientes disponibles para representar térmicamente este contaminante.";
    }
    if (stationsWithPollutant.every((station) => !station.measured_at && !station.time)) {
      return "Hay estaciones disponibles, pero no se puede confirmar la actualidad de sus mediciones.";
    }
    return "No hay valores recientes disponibles para representar térmicamente este contaminante.";
  }, [groupGeoJson.features.length, heatGeoJson.features.length, selectedPollutant, stations]);

  return fatalError ? null : (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#102033_0%,#06111f_46%,#020617_100%)]" aria-label="Globo 3D de calidad del aire">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(2,6,23,0.32)_78%,rgba(2,6,23,0.68)_100%)]" />
      <div className="absolute left-3 top-20 z-10 flex flex-wrap gap-2 md:left-auto md:right-14 md:top-3">
        <button type="button" onClick={() => mapRef.current && moveMapCamera(mapRef.current, ARGENTINA_GLOBE_CAMERA, "view-argentina")} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Ver Argentina
        </button>
        <button type="button" onClick={() => mapRef.current && moveMapCamera(mapRef.current, AMBA_GLOBE_CAMERA, "view-amba")} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Ver AMBA
        </button>
        <button type="button" onClick={() => mapRef.current && moveMapCamera(mapRef.current, cameraForRegion(region), "reset-view")} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Restablecer vista
        </button>
        <button type="button" onClick={() => zoomBy(0.7)} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Acercar
        </button>
        <button type="button" onClick={() => zoomBy(-0.7)} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Alejar
        </button>
        <button type="button" onClick={resetOrientation} className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs text-white/78 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/70">
          Orientar norte
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
      {emptyThermalMessage && (
        <div className="absolute left-3 right-3 top-36 z-10 rounded-2xl border border-amber-200/20 bg-slate-950/64 px-3 py-2 text-sm text-amber-50/90 shadow-xl backdrop-blur-xl md:left-5 md:right-auto md:max-w-md">
          {emptyThermalMessage}
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
