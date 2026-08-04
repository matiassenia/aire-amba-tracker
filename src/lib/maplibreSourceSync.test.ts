import { describe, expect, it, vi } from "vitest";
import { MAPLIBRE_SOURCE_IDS, syncMapLibreSources } from "./maplibreSourceSync";

describe("syncMapLibreSources", () => {
  it("updates existing sources after map load", () => {
    const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>([
      [MAPLIBRE_SOURCE_IDS.heat, { setData: vi.fn() }],
      [MAPLIBRE_SOURCE_IDS.stations, { setData: vi.fn() }],
      [MAPLIBRE_SOURCE_IDS.groups, { setData: vi.fn() }],
      [MAPLIBRE_SOURCE_IDS.hotspot, { setData: vi.fn() }],
    ]);
    const data = {
      heat: { type: "FeatureCollection" as const, features: [] },
      stations: { type: "FeatureCollection" as const, features: [] },
      groups: { type: "FeatureCollection" as const, features: [] },
      hotspot: { type: "FeatureCollection" as const, features: [] },
    };
    syncMapLibreSources({ getSource: (id: keyof typeof MAPLIBRE_SOURCE_IDS | string) => sources.get(id) } as never, data);
    expect(sources.get(MAPLIBRE_SOURCE_IDS.heat)?.setData).toHaveBeenCalledWith(data.heat);
    expect(sources.get(MAPLIBRE_SOURCE_IDS.groups)?.setData).toHaveBeenCalledWith(data.groups);
  });

  it("passes the generated heat, group and hotspot feature counts to setData", () => {
    const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>([
      [MAPLIBRE_SOURCE_IDS.heat, { setData: vi.fn() }],
      [MAPLIBRE_SOURCE_IDS.stations, { setData: vi.fn() }],
      [MAPLIBRE_SOURCE_IDS.groups, { setData: vi.fn() }],
      [MAPLIBRE_SOURCE_IDS.hotspot, { setData: vi.fn() }],
    ]);
    const point = (id: number) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [-58 - id * 0.01, -34] as [number, number] }, properties: { id } });
    const data = {
      heat: { type: "FeatureCollection" as const, features: Array.from({ length: 10 }, (_, index) => point(index)) },
      stations: { type: "FeatureCollection" as const, features: Array.from({ length: 13 }, (_, index) => point(index)) },
      groups: { type: "FeatureCollection" as const, features: Array.from({ length: 5 }, (_, index) => point(index)) },
      hotspot: { type: "FeatureCollection" as const, features: [point(1)] },
    };

    syncMapLibreSources({ getSource: (id: keyof typeof MAPLIBRE_SOURCE_IDS | string) => sources.get(id) } as never, data as never);

    expect(sources.get(MAPLIBRE_SOURCE_IDS.heat)?.setData.mock.calls[0][0].features).toHaveLength(10);
    expect(sources.get(MAPLIBRE_SOURCE_IDS.groups)?.setData.mock.calls[0][0].features).toHaveLength(5);
    expect(sources.get(MAPLIBRE_SOURCE_IDS.hotspot)?.setData.mock.calls[0][0].features).toHaveLength(1);
  });
});
