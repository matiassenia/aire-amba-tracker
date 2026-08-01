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
    zoom: HOTSPOT_CAMERA_ZOOM,
    bearing: 0,
    pitch: 5,
  };
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
