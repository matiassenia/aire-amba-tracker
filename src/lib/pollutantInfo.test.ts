import { describe, expect, it } from "vitest";
import { POLLUTANT_INFO } from "./pollutantInfo";

describe("POLLUTANT_INFO", () => {
  it("defines simple public explanations for all supported pollutants", () => {
    expect(Object.keys(POLLUTANT_INFO).sort()).toEqual(["co", "no2", "o3", "pm10", "pm25", "so2"]);
    for (const info of Object.values(POLLUTANT_INFO)) {
      expect(info.shortName).toBeTruthy();
      expect(info.fullName).toBeTruthy();
      expect(info.description).toContain(".");
      expect(info.waqiNote).toContain("WAQI");
      expect(info.ariaLabel).toBeTruthy();
    }
  });

  it("provides heatmap and station explanation copy for every pollutant", () => {
    for (const info of Object.values(POLLUTANT_INFO)) {
      expect(info.whatYouSee).toContain(info.shortName);
      expect(info.whatYouSee).toContain("índice de calidad del aire informado para");
      expect(info.whatYouSee).toContain("interpolado visualmente entre las estaciones disponibles");
      expect(info.whatYouSee).not.toContain("concentración");
      expect(info.causes.length).toBeGreaterThanOrEqual(4);
      for (const cause of info.causes) {
        expect(cause.trim()).toBeTruthy();
      }
      expect(info.healthNote).toBeTruthy();
      expect(info.stationExplanation).toContain(info.shortName);
      expect(info.stationExplanation).toContain("suele asociarse");
    }
  });
});
