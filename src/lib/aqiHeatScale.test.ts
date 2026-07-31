import { describe, expect, it } from "vitest";
import {
  AQI_BREAKPOINTS,
  AQI_CATEGORIES,
  AQI_HEAT_GRADIENT,
  AQI_HEAT_LEGEND,
  AQI_HEAT_MAX,
  AQI_HEAT_STOPS,
  aqiCategory,
  aqiColor,
  aqiHeatGradientCss,
  aqiLabel,
  aqiToVisualHeatWeight,
} from "./aqiHeatScale";

describe("AQI categories (absolute)", () => {
  it("defines six absolute categories with fixed ranges", () => {
    expect(AQI_CATEGORIES).toHaveLength(6);
    expect(AQI_CATEGORIES.map((c) => [c.min, c.max])).toEqual([
      [0, 50],
      [51, 100],
      [101, 150],
      [151, 200],
      [201, 300],
      [301, Infinity],
    ]);
  });

  it("classifies by absolute AQI, never by visible set", () => {
    expect(aqiCategory(0).label).toBe("Bueno");
    expect(aqiCategory(50).label).toBe("Bueno");
    expect(aqiCategory(51).label).toBe("Moderado");
    expect(aqiCategory(100).label).toBe("Moderado");
    expect(aqiCategory(101).label).toBe("Dañino para grupos sensibles");
    expect(aqiCategory(150).label).toBe("Dañino para grupos sensibles");
    expect(aqiCategory(151).label).toBe("Dañino");
    expect(aqiCategory(200).label).toBe("Dañino");
    expect(aqiCategory(201).label).toBe("Muy dañino");
    expect(aqiCategory(300).label).toBe("Muy dañino");
    expect(aqiCategory(301).label).toBe("Peligroso");
    expect(aqiCategory(999).label).toBe("Peligroso");
  });

  it("does not escalate low absolute values to dangerous categories", () => {
    expect(aqiCategory(6.2).label).toBe("Bueno");
    expect(aqiCategory(22).label).toBe("Bueno");
    expect(aqiCategory(49).label).toBe("Bueno");
  });

  it("exposes consistent labels and colors per category", () => {
    expect(AQI_CATEGORIES[0].color).toBe("#22c55e");
    expect(AQI_CATEGORIES[5].color).toBe("#ec4899");
    for (const category of AQI_CATEGORIES) {
      expect(category.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(aqiLabel(category.min)).toBe(category.label);
      expect(aqiColor(category.min)).toBe(category.color);
    }
    expect(aqiColor(51)).toBe(AQI_CATEGORIES[1].color);
  });
});

describe("aqiToVisualHeatWeight", () => {
  it("returns zero for non-finite input so invalid values never draw a kernel", () => {
    expect(aqiToVisualHeatWeight(NaN)).toBe(0);
    expect(aqiToVisualHeatWeight(Infinity)).toBe(0);
  });

  it("gives low absolute values a visible, non-zero weight", () => {
    expect(aqiToVisualHeatWeight(0)).toBeGreaterThan(0);
    expect(aqiToVisualHeatWeight(6.2)).toBeGreaterThan(0);
    expect(aqiToVisualHeatWeight(22)).toBeGreaterThan(0);
    expect(aqiToVisualHeatWeight(50)).toBeGreaterThan(0);
  });

  it("maps reference AQI values to expected perceptual weights", () => {
    const weight = (v: number) => 0.22 + 0.78 * Math.pow(Math.min(Math.max(v, 0), 300) / 300, 0.45);
    expect(aqiToVisualHeatWeight(0)).toBeCloseTo(weight(0), 10);
    expect(aqiToVisualHeatWeight(6.2)).toBeCloseTo(weight(6.2), 10);
    expect(aqiToVisualHeatWeight(22)).toBeCloseTo(weight(22), 10);
    expect(aqiToVisualHeatWeight(50)).toBeCloseTo(weight(50), 10);
    expect(aqiToVisualHeatWeight(51)).toBeCloseTo(weight(51), 10);
    expect(aqiToVisualHeatWeight(100)).toBeCloseTo(weight(100), 10);
    expect(aqiToVisualHeatWeight(150)).toBeCloseTo(weight(150), 10);
    expect(aqiToVisualHeatWeight(200)).toBeCloseTo(weight(200), 10);
    expect(aqiToVisualHeatWeight(300)).toBe(1);
    expect(aqiToVisualHeatWeight(301)).toBe(1);
    expect(aqiToVisualHeatWeight(9999)).toBe(1);
  });

  it("never exceeds 1", () => {
    for (const value of [0, 6.2, 22, 50, 100, 150, 200, 250, 300, 301, 500]) {
      expect(aqiToVisualHeatWeight(value)).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonic in AQI", () => {
    let previous = aqiToVisualHeatWeight(0);
    for (let value = 1; value <= 320; value += 1) {
      const next = aqiToVisualHeatWeight(value);
      expect(next).toBeGreaterThanOrEqual(previous);
      previous = next;
    }
  });

  it("keeps values just above breakpoints below the next category", () => {
    expect(aqiToVisualHeatWeight(51)).toBeGreaterThan(aqiToVisualHeatWeight(50));
    expect(aqiToVisualHeatWeight(51)).toBeLessThan(aqiToVisualHeatWeight(100));
    expect(aqiToVisualHeatWeight(101)).toBeGreaterThan(aqiToVisualHeatWeight(100));
    expect(aqiToVisualHeatWeight(101)).toBeLessThan(aqiToVisualHeatWeight(150));
    expect(aqiToVisualHeatWeight(151)).toBeGreaterThan(aqiToVisualHeatWeight(150));
    expect(aqiToVisualHeatWeight(151)).toBeLessThan(aqiToVisualHeatWeight(200));
    expect(aqiToVisualHeatWeight(201)).toBeGreaterThan(aqiToVisualHeatWeight(200));
    expect(aqiToVisualHeatWeight(201)).toBeLessThan(aqiToVisualHeatWeight(300));
  });

  it("is deterministic and independent of any visible set", () => {
    expect(aqiToVisualHeatWeight(45)).toBe(aqiToVisualHeatWeight(45));
    expect(aqiToVisualHeatWeight(310)).toBe(aqiToVisualHeatWeight(310));
  });
});

describe("heat gradient stops", () => {
  it("positions stops at the visual weight of each AQI breakpoint", () => {
    expect(AQI_HEAT_STOPS).toHaveLength(AQI_BREAKPOINTS.length);
    AQI_HEAT_STOPS.forEach((stop, index) => {
      expect(stop.at).toBeCloseTo(aqiToVisualHeatWeight(AQI_BREAKPOINTS[index]), 10);
      expect(stop.color).toBe(AQI_CATEGORIES[index].color);
    });
    expect(AQI_HEAT_MAX).toBe(300);
  });

  it("keeps stops ordered and inside [0, 1]", () => {
    const ats = AQI_HEAT_STOPS.map((stop) => stop.at);
    const ordered = [...ats].sort((a, b) => a - b);
    expect(ats).toEqual(ordered);
    for (const at of ats) {
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(1);
    }
  });

  it("exposes the same colors through the heat gradient map", () => {
    expect(Object.keys(AQI_HEAT_GRADIENT).sort((a, b) => Number(a) - Number(b))).toEqual(
      AQI_HEAT_STOPS.map((stop) => String(stop.at)),
    );
    expect(AQI_HEAT_GRADIENT[AQI_HEAT_STOPS[0].at]).toBe(AQI_HEAT_STOPS[0].color);
    expect(AQI_HEAT_GRADIENT[AQI_HEAT_STOPS[5].at]).toBe(AQI_HEAT_STOPS[5].color);
  });

  it("exposes six legend categories using AQI colors", () => {
    expect(AQI_HEAT_LEGEND.map((item) => item.label)).toEqual(
      AQI_CATEGORIES.map((category) => category.label),
    );
    expect(AQI_HEAT_LEGEND.map((item) => item.color)).toEqual(
      AQI_CATEGORIES.map((category) => category.color),
    );
  });

  it("builds a CSS gradient using every stop color at its visual position", () => {
    const css = aqiHeatGradientCss();
    expect(css.startsWith("linear-gradient(to right, ")).toBe(true);
    for (const stop of AQI_HEAT_STOPS) {
      expect(css).toContain(stop.color);
      expect(css).toContain(`${Math.round(stop.at * 100)}%`);
    }
  });
});
