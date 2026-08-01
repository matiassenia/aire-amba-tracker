import { describe, expect, it, vi } from "vitest";
import { resolveMapRenderer } from "./mapRenderer";

describe("resolveMapRenderer", () => {
  it("defaults to Leaflet", () => {
    expect(resolveMapRenderer(undefined)).toBe("leaflet");
  });

  it("accepts MapLibre flag", () => {
    expect(resolveMapRenderer("maplibre")).toBe("maplibre");
  });

  it("falls back to Leaflet for invalid flags", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveMapRenderer("cesium", true)).toBe("leaflet");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
