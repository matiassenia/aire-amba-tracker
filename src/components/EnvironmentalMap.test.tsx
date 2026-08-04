import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EnvironmentalMap } from "./EnvironmentalMap";
import type { Region, Station, StationQueryMetadata } from "@/types/airQuality";

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

const AMBA_REGION: Region = {
  id: "amba",
  name: "AMBA",
  bounds: [-35, -59, -34, -57],
  center: [-34.62, -58.45],
  default_zoom: 9,
  description: "Área Metropolitana de Buenos Aires",
};

const METADATA: StationQueryMetadata = {
  region_id: "amba",
  region_name: "AMBA",
  source: "waqi",
  cache_hit: false,
  cache_ttl_seconds: 300,
  stations_discovered: 3,
  stations_returned: 3,
  stations_deduplicated: 0,
  foreign_stations_filtered: 0,
  stations_with_data: 3,
  pollutants_available: ["pm10"],
  timestamps_received: 3,
  updated_at: new Date().toISOString(),
  coverage_partial: false,
  unavailable_regions: [],
  regions: [],
};

const EXPIRED_AMBA_PM10: Station[] = [
  { uid: 8398, name: "La Boca", lat: -34.6344961, lon: -58.3631337, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", source: "waqi", region_name: "AMBA", iaqi: { pm10: 14 } },
  { uid: 8399, name: "Centenario", lat: -34.635582, lon: -58.5518647, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", source: "waqi", region_name: "AMBA", iaqi: { pm10: 16 } },
  { uid: 8400, name: "Cordoba", lat: -34.5995674, lon: -58.3915767, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", source: "waqi", region_name: "AMBA", iaqi: { pm10: 15 } },
];

function renderMap(stations: Station[] = [], options: { metadata?: StationQueryMetadata | null; selectedRegion?: Region | null; errorMessage?: string | null } = {}) {
  render(
    <EnvironmentalMap
      scope={options.selectedRegion?.id ?? "argentina"}
      onScopeChange={() => {}}
      stations={stations}
      zones={[]}
      regions={[]}
      selectedRegion={options.selectedRegion ?? null}
      metadata={options.metadata ?? null}
      isLoading={false}
      errorMessage={options.errorMessage ?? null}
      selectedZoneId={null}
      onZoneClick={() => {}}
    />,
  );
}

async function openAirQualitySheet() {
  fireEvent.click(await screen.findByRole("button", { name: "Abrir detalle de calidad del aire" }));
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

  it("muestra estado informativo cuando hay PM10 pero todas las mediciones están vencidas", async () => {
    renderMap(EXPIRED_AMBA_PM10, { selectedRegion: AMBA_REGION, metadata: METADATA });
    await openAirQualitySheet();
    expect(await screen.findByText("Sin mediciones recientes para PM10 en AMBA")).toBeInTheDocument();
    expect(screen.getByText(/últimas 72 horas/i)).toBeInTheDocument();
    expect(screen.getByText(/Esto no indica una falla del mapa/i)).toBeInTheDocument();
    expect(screen.getByText(/Última medición disponible:/i)).toBeInTheDocument();
    expect(screen.getByText(/Datos consultados por la aplicación:/i)).toBeInTheDocument();
    expect(screen.queryByText(/web rota/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver foco en el mapa" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver últimas mediciones" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leyenda" }));
    expect(screen.getByText("Sin estaciones recientes para interpolar")).toBeInTheDocument();
  });

  it("activa el modo Últimas mediciones desde el selector y cambia la leyenda", async () => {
    renderMap(EXPIRED_AMBA_PM10, { selectedRegion: AMBA_REGION, metadata: METADATA });
    await openAirQualitySheet();
    fireEvent.click(await screen.findByRole("button", { name: "Histórico" }));
    fireEvent.click(screen.getByRole("button", { name: "Leyenda" }));
    expect(screen.getByText("Visualización de últimas mediciones")).toBeInTheDocument();
    expect(screen.getAllByText("Últimas mediciones disponibles").length).toBeGreaterThan(0);
    expect(screen.getByText(/No representa la calidad del aire actual/)).toBeInTheDocument();
  });

  it("Ver últimas mediciones activa el modo histórico y abre mediciones", async () => {
    renderMap(EXPIRED_AMBA_PM10, { selectedRegion: AMBA_REGION, metadata: METADATA });
    await openAirQualitySheet();
    fireEvent.click(await screen.findByRole("button", { name: "Ver últimas mediciones" }));
    expect(screen.getByText("Visualización de últimas mediciones")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Últimas mediciones disponibles" })).toBeInTheDocument();
  });

  it("Escape cierra el panel contextual abierto", async () => {
    renderMap(DATA_STATIONS);
    await openAirQualitySheet();
    expect(await screen.findByRole("region", { name: "Información de PM10" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Información de PM10" })).not.toBeInTheDocument();
  });

  it("muestra últimas mediciones expiradas sin convertirlas en hotspots", async () => {
    renderMap(EXPIRED_AMBA_PM10, { selectedRegion: AMBA_REGION, metadata: METADATA });
    await openAirQualitySheet();
    fireEvent.click(await screen.findByRole("button", { name: "Ver últimas mediciones" }));
    expect(screen.getByRole("region", { name: "Últimas mediciones disponibles" })).toBeInTheDocument();
    expect(screen.getAllByText("La Boca").length).toBeGreaterThan(0);
    expect(screen.getByText(/PM10: 14 · Bueno/)).toBeInTheDocument();
    expect(screen.getAllByText("Dato antiguo").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hace \d+ días/).length).toBeGreaterThan(0);
  });

  it("diferencia contaminante sin datos de mediciones vencidas", async () => {
    renderMap(EXPIRED_AMBA_PM10, { selectedRegion: AMBA_REGION });
    fireEvent.click(await screen.findByRole("button", { name: "O₃" }));
    expect(screen.getByText("No hay mediciones de O₃ disponibles en las estaciones de esta región.")).toBeInTheDocument();
    expect(screen.queryByText(/Sin mediciones recientes para O₃/)).not.toBeInTheDocument();
  });

  it("mantiene backend offline como mensaje distinto", async () => {
    renderMap([], { errorMessage: "No se pudo conectar al servicio de datos." });
    await openAirQualitySheet();
    expect(await screen.findByText("No se pudo conectar al servicio de datos.")).toBeInTheDocument();
    expect(screen.queryByText(/Sin mediciones recientes/)).not.toBeInTheDocument();
  });
});
