import { describe, expect, it } from "vitest";
import { parseAqi, parseWaqiMapBoundsResponse } from "./waqi";

describe("parseAqi", () => {
  it("parses numeric AQI values and rejects invalid placeholders", () => {
    expect(parseAqi(42)).toBe(42);
    expect(parseAqi("57")).toBe(57);
    expect(parseAqi("-")).toBeNull();
    expect(parseAqi("not-a-number")).toBeNull();
    expect(parseAqi(null)).toBeNull();
  });
});

describe("parseWaqiMapBoundsResponse", () => {
  it("returns stations for a valid WAQI map bounds response", () => {
    const stations = parseWaqiMapBoundsResponse({
      status: "ok",
      data: [
        {
          uid: 123,
          lat: "-34.6",
          lon: "-58.4",
          aqi: "45",
          pol: "pm25",
          utime: "2026-07-29 10:00:00",
          station: { name: "Buenos Aires" },
        },
      ],
    });

    expect(stations).toEqual([
      {
        uid: 123,
        name: "Buenos Aires",
        lat: -34.6,
        lon: -58.4,
        aqi: 45,
        dominentpol: "pm25",
        time: "2026-07-29 10:00:00",
      },
    ]);
  });

  it("drops invalid station rows instead of fabricating AQI values", () => {
    const stations = parseWaqiMapBoundsResponse({
      status: "ok",
      data: [
        { uid: 1, lat: -34.6, lon: -58.4, aqi: "-" },
        { uid: 2, lat: -34.7, lon: -58.5, aqi: 70 },
      ],
    });

    expect(stations).toHaveLength(1);
    expect(stations?.[0].uid).toBe(2);
  });

  it("returns null for non-ok or malformed responses", () => {
    expect(parseWaqiMapBoundsResponse({ status: "error", data: [] })).toBeNull();
    expect(parseWaqiMapBoundsResponse({ status: "ok", data: {} })).toBeNull();
  });
});
