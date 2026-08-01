import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EnvironmentalMap } from "./EnvironmentalMap";
import type { Station } from "@/types/airQuality";

vi.mock("@/components/map/LeafletMap", () => ({
  LeafletMap: () => <div data-testid="leaflet-mock" />,
}));

vi.mock("@/components/map/MapLibreGlobe", () => ({
  MapLibreGlobe: ({ selectedPollutant, focusHotspotRequest, forceHotspotNavigation, hotspot }: { selectedPollutant: string; focusHotspotRequest: number; forceHotspotNavigation?: boolean; hotspot?: { maxAqi: number } | null }) => (
    <div data-testid="maplibre-mock">
      {selectedPollutant} · focus {focusHotspotRequest} · force {String(Boolean(forceHotspotNavigation))} · max {hotspot?.maxAqi ?? "none"}
    </div>
  ),
}));

const DATA_STATIONS: Station[] = [
  { uid: 1, name: "BA", lat: -34.6, lon: -58.4, aqi: null, measured_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), iaqi: { pm25: 90, no2: 20 } },
  { uid: 2, name: "LP", lat: -34.92, lon: -57.95, aqi: null, measured_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), iaqi: { pm25: 120, no2: 30 } },
  { uid: 3, name: "Cordoba", lat: -31.4, lon: -64.18, aqi: null, measured_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), iaqi: { pm25: 30, no2: 140 } },
];

function renderMap(stations: Station[] = []) {
  render(
    <EnvironmentalMap
      scope="argentina"
      onScopeChange={() => {}}
      stations={stations}
      zones={[]}
      regions={[]}
      selectedRegion={null}
      metadata={null}
      isLoading={false}
      selectedZoneId={null}
      onZoneClick={() => {}}
    />,
  );
}

describe("selector de contaminantes", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_MAP_RENDERER", "leaflet");
  });

  it("usa Leaflet por defecto", async () => {
    renderMap();
    expect(await screen.findByTestId("leaflet-mock")).toBeInTheDocument();
  });

  it("usa MapLibre cuando el feature flag lo pide", async () => {
    vi.stubEnv("VITE_MAP_RENDERER", "maplibre");
    renderMap();
    expect(await screen.findByTestId("maplibre-mock")).toHaveTextContent("pm10");
    vi.unstubAllEnvs();
  });

  it("vuelve a Leaflet con un feature flag inválido", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VITE_MAP_RENDERER", "cesium");
    renderMap();
    expect(await screen.findByTestId("leaflet-mock")).toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
    vi.unstubAllEnvs();
    warn.mockRestore();
  });

  it("la selección de contaminante actualiza el renderer MapLibre", async () => {
    vi.stubEnv("VITE_MAP_RENDERER", "maplibre");
    renderMap();
    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    expect(await screen.findByTestId("maplibre-mock")).toHaveTextContent("pm25");
    vi.unstubAllEnvs();
  });

  it("click en sigla provoca navegación al foco en MapLibre", async () => {
    vi.stubEnv("VITE_MAP_RENDERER", "maplibre");
    renderMap(DATA_STATIONS);
    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    expect(await screen.findByTestId("maplibre-mock")).toHaveTextContent("focus 1");
    expect(screen.getByTestId("maplibre-mock")).toHaveTextContent("max 120");
    vi.unstubAllEnvs();
  });

  it("sin datos no navega al foco", async () => {
    vi.stubEnv("VITE_MAP_RENDERER", "maplibre");
    renderMap();
    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    expect(await screen.findByTestId("maplibre-mock")).toHaveTextContent("focus 0");
    expect(screen.getByTestId("maplibre-mock")).toHaveTextContent("max none");
    vi.unstubAllEnvs();
  });

  it("tocar el mismo contaminante no repite la navegación", async () => {
    vi.stubEnv("VITE_MAP_RENDERER", "maplibre");
    renderMap(DATA_STATIONS);
    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    expect(await screen.findByTestId("maplibre-mock")).toHaveTextContent("focus 1");
    fireEvent.click(screen.getByRole("button", { name: "PM2.5" }));
    expect(screen.getByTestId("maplibre-mock")).toHaveTextContent("focus 1");
    vi.unstubAllEnvs();
  });

  it("el botón Ver foco en el mapa repite la navegación y la fuerza", async () => {
    vi.stubEnv("VITE_MAP_RENDERER", "maplibre");
    renderMap(DATA_STATIONS);
    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver foco en el mapa" }));
    expect(screen.getByTestId("maplibre-mock")).toHaveTextContent("focus 2");
    expect(screen.getByTestId("maplibre-mock")).toHaveTextContent("force true");
    vi.unstubAllEnvs();
  });

  it("ya no existe el botón 'i' independiente", async () => {
    renderMap();
    await screen.findByRole("button", { name: "PM2.5" });
    expect(screen.queryByRole("button", { name: /Información sobre/i })).not.toBeInTheDocument();
  });

  it("las siglas siguen seleccionando contaminantes", async () => {
    renderMap();
    const pm25 = await screen.findByRole("button", { name: "PM2.5" });
    const pm10 = screen.getByRole("button", { name: "PM10" });
    expect(pm10).toHaveAttribute("aria-pressed", "true");
    expect(pm25).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(pm25);
    expect(pm25).toHaveAttribute("aria-pressed", "true");
    expect(pm10).toHaveAttribute("aria-pressed", "false");
  });

  it("tocar PM2.5 muestra información específica de PM2.5", async () => {
    renderMap(DATA_STATIONS);
    const pm25 = await screen.findByRole("button", { name: "PM2.5" });
    fireEvent.click(pm25);
    expect(screen.getByRole("region", { name: "Información de PM2.5" })).toBeInTheDocument();
    expect(screen.getByText("Material particulado fino")).toBeInTheDocument();
    expect(screen.getByText("Polvo invisible extremadamente pequeño.")).toBeInTheDocument();
    expect(screen.getByText("Mayor nivel disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver foco en el mapa" })).toBeInTheDocument();
  });

  it("tocar NO₂ reemplaza la información específica sin abrir guía general", async () => {
    renderMap();
    const pm25 = await screen.findByRole("button", { name: "PM2.5" });
    fireEvent.click(pm25);
    const no2 = screen.getByRole("button", { name: "NO₂" });
    fireEvent.click(no2);
    expect(no2).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Información de NO₂" })).toBeInTheDocument();
    expect(screen.getByText("Dioxido de nitrogeno")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Guía para leer el mapa" })).not.toBeInTheDocument();
  });

  it("cerrar el panel específico no cambia la selección", async () => {
    renderMap();
    const pm25 = await screen.findByRole("button", { name: "PM2.5" });
    fireEvent.click(pm25);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar información del contaminante" }));
    expect(screen.queryByRole("region", { name: "Información de PM2.5" })).not.toBeInTheDocument();
    expect(pm25).toHaveAttribute("aria-pressed", "true");
  });

  it("el panel específico no contiene guía general", async () => {
    renderMap();
    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    const panel = screen.getByRole("region", { name: "Información de PM2.5" });
    expect(panel).not.toHaveTextContent(/WAQI/i);
    expect(panel).not.toHaveTextContent(/metodología/i);
    expect(panel).not.toHaveTextContent(/comparación de fuentes/i);
  });
});
