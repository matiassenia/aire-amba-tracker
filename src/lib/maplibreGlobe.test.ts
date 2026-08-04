import { describe, expect, it, vi } from "vitest";
import {
  AIR_QUALITY_LAYER_ORDER,
  AMBA_GLOBE_CAMERA,
  ARGENTINA_GLOBE_CAMERA,
  MAPLIBRE_GLYPHS_URL,
  MAPLIBRE_HOTSPOT_LAYER_IDS,
  MAPLIBRE_OVERVIEW_LAYER_IDS,
  MAPLIBRE_OVERVIEW_MAX_ZOOM,
  NATIONAL_HOTSPOT_CAMERA_ZOOM,
  animateGlobeCamera,
  cameraTransitionDuration,
  cameraForHotspot,
  cubicEaseInOut,
  isOverviewVisibleAtZoom,
  isWebGLAvailable,
  moveCamera,
  prefersReducedMotion,
  shouldNavigateToHotspot,
  shouldAutoRotate,
  shouldPulseHotspot,
  type GlobeCameraMap,
} from "./maplibreGlobe";

function createMapMock(projection = "globe") {
  const state = { lat: -37, lng: -63, zoom: 3.35, bearing: 0, pitch: 5 };
  const map: GlobeCameraMap & { flyTo: ReturnType<typeof vi.fn>; jumpTo: ReturnType<typeof vi.fn>; state: typeof state } = {
    state,
    getCenter: () => ({ lat: state.lat, lng: state.lng }),
    getZoom: () => state.zoom,
    getBearing: () => state.bearing,
    getPitch: () => state.pitch,
    getProjection: () => ({ name: projection }),
    jumpTo: vi.fn((camera) => {
      if (camera.center) {
        state.lng = camera.center[0];
        state.lat = camera.center[1];
      }
      if (camera.zoom !== undefined) state.zoom = camera.zoom;
      if (camera.bearing !== undefined) state.bearing = camera.bearing;
      if (camera.pitch !== undefined) state.pitch = camera.pitch;
    }),
    flyTo: vi.fn(),
  };
  return map;
}

describe("maplibre globe helpers", () => {
  it("uses a nearly frontal national camera", () => {
    expect(Math.abs(ARGENTINA_GLOBE_CAMERA.bearing)).toBeLessThanOrEqual(3);
    expect(ARGENTINA_GLOBE_CAMERA.pitch).toBeLessThanOrEqual(8);
    expect(ARGENTINA_GLOBE_CAMERA.zoom).toBeGreaterThanOrEqual(3.1);
    expect(ARGENTINA_GLOBE_CAMERA.zoom).toBeLessThanOrEqual(3.6);
  });

  it("keeps local AMBA detail", () => {
    expect(AMBA_GLOBE_CAMERA.zoom).toBeGreaterThan(8);
    expect(AMBA_GLOBE_CAMERA.pitch).toBeGreaterThanOrEqual(10);
    expect(AMBA_GLOBE_CAMERA.pitch).toBeLessThanOrEqual(18);
  });

  it("builds a regional-context hotspot camera", () => {
    expect(cameraForHotspot(-34.6, -58.4)).toMatchObject({
      latitude: -34.6,
      longitude: -58.4,
      zoom: NATIONAL_HOTSPOT_CAMERA_ZOOM,
      bearing: 0,
    });
    expect(cameraForHotspot(-34.6, -58.4).zoom).toBeLessThan(5);
  });

  it("keeps selected hotspots above overview and below stations and labels", () => {
    expect(AIR_QUALITY_LAYER_ORDER[0]).toBe("cartoDark");
    expect(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-heatmap")).toBeLessThan(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-overview-outer"));
    expect(AIR_QUALITY_LAYER_ORDER.indexOf("selected-hotspot-outer")).toBeGreaterThan(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-groups"));
    expect(AIR_QUALITY_LAYER_ORDER.indexOf("selected-hotspot-core")).toBeLessThan(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-stations"));
    expect(AIR_QUALITY_LAYER_ORDER.at(-1)).toBe("air-quality-group-labels");
    expect(AIR_QUALITY_LAYER_ORDER.some((layerId) => layerId.startsWith("debug-"))).toBe(false);
  });

  it("keeps overview circles visible at the initial national globe zoom", () => {
    expect(MAPLIBRE_OVERVIEW_MAX_ZOOM).toBe(8);
    expect(isOverviewVisibleAtZoom(ARGENTINA_GLOBE_CAMERA.zoom)).toBe(true);
    expect(isOverviewVisibleAtZoom(MAPLIBRE_OVERVIEW_MAX_ZOOM)).toBe(false);
    expect(MAPLIBRE_OVERVIEW_LAYER_IDS).toEqual(["air-quality-overview-outer", "air-quality-overview-middle", "air-quality-groups"]);
    expect(MAPLIBRE_HOTSPOT_LAYER_IDS).toEqual(["selected-hotspot-outer", "selected-hotspot-middle", "selected-hotspot-core"]);
  });

  it("declares glyphs because group labels use a symbol text layer", () => {
    expect(MAPLIBRE_GLYPHS_URL).toContain("{fontstack}");
    expect(MAPLIBRE_GLYPHS_URL).toContain("{range}");
  });

  it("increases camera transition duration with distance and caps it", () => {
    const current = ARGENTINA_GLOBE_CAMERA;
    const nearby = { ...current, latitude: current.latitude + 0.2, longitude: current.longitude + 0.2, zoom: current.zoom + 0.2 };
    const far = { ...current, latitude: -24, longitude: -54, zoom: 4.6 };
    expect(cameraTransitionDuration(current, far)).toBeGreaterThan(cameraTransitionDuration(current, nearby));
    expect(cameraTransitionDuration(current, { ...far, latitude: 10, longitude: -100, zoom: 12 })).toBeLessThanOrEqual(3200);
  });

  it("short movements do not require hotspot navigation", () => {
    const current = { latitude: -34.6, longitude: -58.4, zoom: 4.5, bearing: 0, pitch: 4 };
    const target = { latitude: -34.7, longitude: -58.5, zoom: 4.6, bearing: 0, pitch: 4 };
    expect(shouldNavigateToHotspot(current, target)).toBe(false);
    expect(shouldNavigateToHotspot(ARGENTINA_GLOBE_CAMERA, target)).toBe(true);
  });

  it("uses a reduced duration for reduced motion", () => {
    expect(cameraTransitionDuration(ARGENTINA_GLOBE_CAMERA, cameraForHotspot(-24, -54), true)).toBeLessThan(800);
  });

  it("animates globe cameras with jumpTo, not flyTo or around", () => {
    const map = createMapMock("globe");
    const frames: FrameRequestCallback[] = [];
    animateGlobeCamera(map, cameraForHotspot(-34.6, -58.4), {
      duration: 1000,
      now: () => 0,
      requestAnimationFrame: (callback) => {
        frames.push(callback);
        return frames.length;
      },
      cancelAnimationFrame: vi.fn(),
    });
    frames[0](500);
    frames[1](1000);
    expect(map.jumpTo).toHaveBeenCalled();
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(JSON.stringify(map.jumpTo.mock.calls)).not.toContain("around");
    expect(map.state.lat).toBeCloseTo(-34.6);
    expect(map.state.lng).toBeCloseTo(-58.4);
  });

  it("cancels a globe camera animation", () => {
    const map = createMapMock("globe");
    const cancelAnimationFrame = vi.fn();
    const animation = animateGlobeCamera(map, cameraForHotspot(-34.6, -58.4), {
      duration: 1000,
      now: () => 0,
      requestAnimationFrame: () => 7,
      cancelAnimationFrame,
    });
    animation.cancel();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
  });

  it("jumps directly for reduced motion", () => {
    const map = createMapMock("globe");
    const requestAnimationFrame = vi.fn();
    moveCamera(map, cameraForHotspot(-34.6, -58.4), { reducedMotion: true, requestAnimationFrame });
    expect(map.jumpTo).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("uses flyTo only outside globe projection", () => {
    const map = createMapMock("mercator");
    moveCamera(map, cameraForHotspot(-34.6, -58.4), { duration: 1000 });
    expect(map.flyTo).toHaveBeenCalledTimes(1);
    expect(map.jumpTo).not.toHaveBeenCalled();
    expect(JSON.stringify(map.flyTo.mock.calls[0][0])).not.toContain("around");
  });

  it("does not use flyTo before MapLibre reports an explicit mercator projection", () => {
    const map = createMapMock(null as unknown as string);
    map.getProjection = () => null;
    moveCamera(map, cameraForHotspot(-34.6, -58.4), { reducedMotion: true });
    expect(map.jumpTo).toHaveBeenCalledTimes(1);
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it("keeps easing deterministic", () => {
    expect(cubicEaseInOut(0)).toBe(0);
    expect(cubicEaseInOut(0.5)).toBe(0.5);
    expect(cubicEaseInOut(1)).toBe(1);
  });

  it("disables rotation with reduced motion, manual pause or open panels", () => {
    expect(shouldAutoRotate(false, false, false)).toBe(true);
    expect(shouldAutoRotate(true, false, false)).toBe(false);
    expect(shouldAutoRotate(false, true, false)).toBe(false);
    expect(shouldAutoRotate(false, false, true)).toBe(false);
  });

  it("reads prefers-reduced-motion", () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(prefersReducedMotion()).toBe(true);
    window.matchMedia = original;
  });

  it("disables hotspot pulse with reduced motion", () => {
    expect(shouldPulseHotspot(false)).toBe(true);
    expect(shouldPulseHotspot(true)).toBe(false);
  });

  it("returns false when WebGL context is unavailable", () => {
    const createElement = vi.spyOn(document, "createElement");
    createElement.mockReturnValue({ getContext: () => null } as unknown as HTMLCanvasElement);
    expect(isWebGLAvailable()).toBe(false);
    createElement.mockRestore();
  });
});
