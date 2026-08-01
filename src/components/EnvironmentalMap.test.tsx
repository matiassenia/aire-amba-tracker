import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EnvironmentalMap } from "./EnvironmentalMap";

vi.mock("@/components/map/LeafletMap", () => ({
  LeafletMap: () => <div data-testid="leaflet-mock" />,
}));

function renderMap() {
  render(
    <EnvironmentalMap
      scope="argentina"
      onScopeChange={() => {}}
      stations={[]}
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
    renderMap();
    const pm25 = await screen.findByRole("button", { name: "PM2.5" });
    fireEvent.click(pm25);
    expect(screen.getByRole("region", { name: "Información de PM2.5" })).toBeInTheDocument();
    expect(screen.getByText("Material particulado fino")).toBeInTheDocument();
    expect(screen.getByText("Polvo invisible extremadamente pequeño.")).toBeInTheDocument();
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
