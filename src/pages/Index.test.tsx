import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";

vi.mock("@/components/map/LeafletMap", () => ({
  LeafletMap: () => <div data-testid="leaflet-mock" />,
}));

vi.mock("@/hooks/useAirQualityData", () => ({
  useAirQualityData: () => ({
    stations: [],
    zones: [],
    regions: [],
    selectedRegion: null,
    metadata: null,
    lastUpdated: null,
    isLoading: false,
    errorMessage: null,
  }),
}));

describe("guía educativa desde el mapa", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_MAP_RENDERER", "leaflet");
  });

  it("el header contiene el acceso a la guía", async () => {
    render(<Index />);

    expect(screen.getByRole("button", { name: "Abrir guía para leer el mapa" })).toBeInTheDocument();
    await screen.findByTestId("leaflet-mock");
  });

  it("tocar el botón del header abre EducationGuide", async () => {
    render(<Index />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir guía para leer el mapa" }));

    expect(await screen.findByRole("dialog", { name: "Guía para leer el mapa" })).toBeInTheDocument();
    expect(screen.getByText("Sobre WAQI y los datos")).toBeInTheDocument();
  });

  it("Escape cierra la guía general", async () => {
    render(<Index />);

    fireEvent.click(screen.getByRole("button", { name: "Abrir guía para leer el mapa" }));
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Guía para leer el mapa" })).not.toBeInTheDocument());
  });

  it("cerrar la guía devuelve el foco al botón del header", async () => {
    render(<Index />);

    const guideButton = screen.getByRole("button", { name: "Abrir guía para leer el mapa" });
    fireEvent.click(guideButton);
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Guía para leer el mapa" })).not.toBeInTheDocument());
    await waitFor(() => expect(guideButton).toHaveFocus());
  });

  it("tocar una sigla no abre EducationGuide", async () => {
    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalles" }));

    expect(screen.queryByRole("dialog", { name: "Guía para leer el mapa" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Información de PM2.5" })).toBeInTheDocument();
  });

  it("no existe botón 'i'", async () => {
    render(<Index />);

    await screen.findByRole("button", { name: "PM2.5" });
    expect(screen.queryByRole("button", { name: /Información sobre/i })).not.toBeInTheDocument();
  });

  it("WAQI solo aparece en la guía general", async () => {
    render(<Index />);

    fireEvent.click(await screen.findByRole("button", { name: "PM2.5" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalles" }));
    expect(screen.getByRole("region", { name: "Información de PM2.5" })).not.toHaveTextContent(/WAQI/i);

    fireEvent.click(screen.getByRole("button", { name: "Abrir guía para leer el mapa" }));
    expect(await screen.findByRole("dialog", { name: "Guía para leer el mapa" })).toHaveTextContent(/WAQI/i);
  });
});
