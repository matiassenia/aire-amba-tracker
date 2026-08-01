export type GlobeCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
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
