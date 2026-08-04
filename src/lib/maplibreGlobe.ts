export type GlobeCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

export type GlobeCameraMap = {
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  getBearing: () => number;
  getPitch: () => number;
  getProjection?: () => unknown;
  jumpTo: (camera: { center?: [number, number]; zoom?: number; bearing?: number; pitch?: number }) => void;
  flyTo?: (camera: { center: [number, number]; zoom: number; bearing: number; pitch: number; duration: number; essential: boolean; easing: (t: number) => number }) => void;
};

export type CameraAnimation = { cancel: () => void };

export type CameraMoveOptions = {
  reducedMotion?: boolean;
  duration?: number;
  operation?: string;
  debug?: (payload: Record<string, unknown>) => void;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  now?: () => number;
};

export const ARGENTINA_GLOBE_CAMERA: GlobeCamera = {
  latitude: -37.2,
  longitude: -63.4,
  zoom: 3.35,
  bearing: 0,
  pitch: 5,
};

export const AMBA_GLOBE_CAMERA: GlobeCamera = {
  latitude: -34.62,
  longitude: -58.45,
  zoom: 8.7,
  bearing: 0,
  pitch: 14,
};

export const HOTSPOT_CAMERA_ZOOM = 5.2;
export const NATIONAL_HOTSPOT_CAMERA_ZOOM = 4.6;
export const AMBA_HOTSPOT_CAMERA_ZOOM = 7;

export const AIR_QUALITY_LAYER_ORDER = [
  "cartoDark",
  "air-quality-heatmap",
  "air-quality-overview-outer",
  "air-quality-overview-middle",
  "air-quality-groups",
  "selected-hotspot-outer",
  "selected-hotspot-middle",
  "selected-hotspot-core",
  "air-quality-stations",
  "air-quality-group-labels",
] as const;

export const MAPLIBRE_GLYPHS_URL = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
export const MAPLIBRE_OVERVIEW_MAX_ZOOM = 8;
export const MAPLIBRE_OVERVIEW_LAYER_IDS = ["air-quality-overview-outer", "air-quality-overview-middle", "air-quality-groups"] as const;
export const MAPLIBRE_HOTSPOT_LAYER_IDS = ["selected-hotspot-outer", "selected-hotspot-middle", "selected-hotspot-core"] as const;

export function isOverviewVisibleAtZoom(zoom: number): boolean {
  return zoom < MAPLIBRE_OVERVIEW_MAX_ZOOM;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function shouldAutoRotate(reducedMotion: boolean, userPaused: boolean, panelOpen: boolean): boolean {
  return !reducedMotion && !userPaused && !panelOpen;
}

export function isMobileViewport(): boolean {
  return window.matchMedia?.("(max-width: 767px)").matches ?? false;
}

export function shouldPulseHotspot(reducedMotion: boolean): boolean {
  return !reducedMotion;
}

export function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function currentGlobeCamera(map: GlobeCameraMap): GlobeCamera {
  const center = map.getCenter();
  return {
    latitude: center.lat,
    longitude: center.lng,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

export function shortestLongitudeDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export function mapProjectionName(map: Pick<GlobeCameraMap, "getProjection">): string | null {
  const projection = map.getProjection?.();
  if (!projection) return null;
  if (typeof projection === "string") return projection;
  if (typeof projection === "object" && "name" in projection) {
    const name = (projection as { name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

export function isGlobeProjection(map: Pick<GlobeCameraMap, "getProjection">): boolean {
  return mapProjectionName(map) === "globe";
}

export function cameraForHotspot(latitude: number, longitude: number): GlobeCamera {
  return {
    latitude,
    longitude,
    zoom: NATIONAL_HOTSPOT_CAMERA_ZOOM,
    bearing: 0,
    pitch: 4,
  };
}

export function cameraTransitionDuration(
  currentCamera: GlobeCamera,
  targetCamera: GlobeCamera,
  reducedMotion = false,
): number {
  if (reducedMotion) return 160;
  const latDiff = currentCamera.latitude - targetCamera.latitude;
  const lonDiff = currentCamera.longitude - targetCamera.longitude;
  const distanceDegrees = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
  const zoomDiff = Math.abs(currentCamera.zoom - targetCamera.zoom);
  const duration = 900 + distanceDegrees * 95 + zoomDiff * 420;
  return Math.max(800, Math.min(3200, Math.round(duration)));
}

function applyCamera(map: GlobeCameraMap, camera: GlobeCamera) {
  map.jumpTo({
    center: [camera.longitude, camera.latitude],
    zoom: camera.zoom,
    bearing: camera.bearing,
    pitch: camera.pitch,
  });
}

export function animateGlobeCamera(
  map: GlobeCameraMap,
  targetCamera: GlobeCamera,
  options: CameraMoveOptions = {},
): CameraAnimation {
  const startCamera = currentGlobeCamera(map);
  const duration = options.duration ?? cameraTransitionDuration(startCamera, targetCamera, options.reducedMotion);
  const raf = options.requestAnimationFrame ?? window.requestAnimationFrame.bind(window);
  const caf = options.cancelAnimationFrame ?? window.cancelAnimationFrame.bind(window);
  const now = options.now ?? performance.now.bind(performance);
  const operation = options.operation ?? "camera";

  options.debug?.({
    operation,
    projection: mapProjectionName(map),
    center: [targetCamera.longitude, targetCamera.latitude],
    zoom: targetCamera.zoom,
    bearing: targetCamera.bearing,
    pitch: targetCamera.pitch,
  });

  if (options.reducedMotion || duration <= 0) {
    applyCamera(map, targetCamera);
    return { cancel: () => {} };
  }

  let frame: number | null = null;
  let cancelled = false;
  const start = now();
  const lonDelta = shortestLongitudeDelta(startCamera.longitude, targetCamera.longitude);
  const tick = (time: number) => {
    if (cancelled) return;
    const progress = Math.min(1, (time - start) / duration);
    const eased = cubicEaseInOut(progress);
    applyCamera(map, {
      latitude: startCamera.latitude + (targetCamera.latitude - startCamera.latitude) * eased,
      longitude: startCamera.longitude + lonDelta * eased,
      zoom: startCamera.zoom + (targetCamera.zoom - startCamera.zoom) * eased,
      bearing: startCamera.bearing + (targetCamera.bearing - startCamera.bearing) * eased,
      pitch: startCamera.pitch + (targetCamera.pitch - startCamera.pitch) * eased,
    });
    if (progress < 1) {
      frame = raf(tick);
    } else {
      applyCamera(map, targetCamera);
      frame = null;
    }
  };
  frame = raf(tick);
  return {
    cancel: () => {
      cancelled = true;
      if (frame !== null) caf(frame);
      frame = null;
    },
  };
}

export function moveCamera(
  map: GlobeCameraMap,
  targetCamera: GlobeCamera,
  options: CameraMoveOptions = {},
): CameraAnimation {
  const projectionName = mapProjectionName(map);
  if (projectionName !== "mercator" || !map.flyTo) {
    return animateGlobeCamera(map, targetCamera, options);
  }
  const currentCamera = currentGlobeCamera(map);
  const duration = options.duration ?? cameraTransitionDuration(currentCamera, targetCamera, options.reducedMotion);
  options.debug?.({
    operation: options.operation ?? "camera",
    projection: mapProjectionName(map),
    center: [targetCamera.longitude, targetCamera.latitude],
    zoom: targetCamera.zoom,
    bearing: targetCamera.bearing,
    pitch: targetCamera.pitch,
  });
  map.flyTo({
    center: [targetCamera.longitude, targetCamera.latitude],
    zoom: targetCamera.zoom,
    bearing: targetCamera.bearing,
    pitch: targetCamera.pitch,
    duration,
    essential: false,
    easing: cubicEaseInOut,
  });
  return { cancel: () => {} };
}

export function shouldNavigateToHotspot(
  currentCamera: GlobeCamera,
  targetCamera: GlobeCamera,
): boolean {
  const latDiff = currentCamera.latitude - targetCamera.latitude;
  const lonDiff = currentCamera.longitude - targetCamera.longitude;
  const distanceDegrees = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
  const zoomDiff = Math.abs(currentCamera.zoom - targetCamera.zoom);
  return distanceDegrees > 1.2 || zoomDiff > 0.55;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
