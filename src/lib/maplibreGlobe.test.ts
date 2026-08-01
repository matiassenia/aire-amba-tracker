import { describe, expect, it, vi } from "vitest";
import {
  AIR_QUALITY_LAYER_ORDER,
  AMBA_GLOBE_CAMERA,
  ARGENTINA_GLOBE_CAMERA,
  NATIONAL_HOTSPOT_CAMERA_ZOOM,
  cameraTransitionDuration,
  cameraForHotspot,
  isWebGLAvailable,
  prefersReducedMotion,
  shouldNavigateToHotspot,
  shouldAutoRotate,
  shouldPulseHotspot,
} from "./maplibreGlobe";

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
    expect(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-heatmap")).toBeLessThan(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-overview-outer"));
    expect(AIR_QUALITY_LAYER_ORDER.indexOf("selected-hotspot-outer")).toBeGreaterThan(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-groups"));
    expect(AIR_QUALITY_LAYER_ORDER.indexOf("selected-hotspot-core")).toBeLessThan(AIR_QUALITY_LAYER_ORDER.indexOf("air-quality-stations"));
    expect(AIR_QUALITY_LAYER_ORDER.at(-1)).toBe("air-quality-group-labels");
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
