import { describe, expect, it, vi } from "vitest";
import {
  AMBA_GLOBE_CAMERA,
  ARGENTINA_GLOBE_CAMERA,
  HOTSPOT_CAMERA_ZOOM,
  cameraForHotspot,
  isWebGLAvailable,
  prefersReducedMotion,
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
      zoom: HOTSPOT_CAMERA_ZOOM,
      bearing: 0,
    });
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
