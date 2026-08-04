import { describe, expect, it } from "vitest";
import { pointInArgentina } from "./argentinaBoundary";

describe("pointInArgentina", () => {
  it.each([
    ["Buenos Aires", -34.6037, -58.3816],
    ["La Plata", -34.9205, -57.9536],
    ["Mar del Plata", -38.0055, -57.5426],
    ["Posadas", -27.3621, -55.9009],
    ["Concordia", -31.3927, -58.0209],
    ["Ushuaia", -54.8019, -68.303],
    ["Cordoba", -31.4201, -64.1888],
    ["Mendoza", -32.8895, -68.8458],
    ["Jujuy", -24.1858, -65.2995],
  ])("keeps Argentine station %s", (_name, lat, lon) => {
    expect(pointInArgentina(lat, lon)).toBe(true);
  });

  it.each([
    ["Montevideo", -34.9011, -56.1645],
    ["Santiago de Chile", -33.4489, -70.6693],
    ["Asuncion", -25.2637, -57.5759],
    ["Porto Alegre", -30.0346, -51.2177],
  ])("excludes foreign station %s", (_name, lat, lon) => {
    expect(pointInArgentina(lat, lon)).toBe(false);
  });
});
