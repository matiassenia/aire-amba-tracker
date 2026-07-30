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
});
