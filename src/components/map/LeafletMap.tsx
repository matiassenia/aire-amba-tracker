// LeafletMap - Core map component with dark theme basemap
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { HeatLayer } from "@/components/HeatLayer";
import { ZonePolygons } from "@/components/map/ZonePolygons";
import { ParticleLayer } from "@/components/map/ParticleLayer";
import type { Station, Zone, Scope } from "@/types/airQuality";
import { SCOPE_BOUNDS } from "@/data/zones";
import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";

// Apple Weather inspired gradient for heat layer
const HEAT_GRADIENT = {
  0: "#4ADE80",   // soft green
  0.3: "#FBBF24", // warm amber
  0.5: "#FB923C", // soft orange
  0.7: "#F87171", // muted red
  0.9: "#A78BFA", // soft purple
  1: "#7F1D1D",   // dark maroon
} satisfies Record<number, string>;

interface LeafletMapProps {
  stations: Station[];
  zones: Zone[];
  scope: Scope;
  averageAqi: number;
  selectedZoneId?: string | null;
  onZoneClick: (zone: Zone) => void;
}

/**
 * Componente interno para controlar la cámara del mapa
 * usando la API oficial `useMap()`.
 */
function MapCameraController({ scope }: { scope: Scope }) {
  const map = useMap();
  const bounds = SCOPE_BOUNDS[scope];

  useEffect(() => {
    map.flyTo([bounds.center.lat, bounds.center.lon], bounds.zoom, {
      duration: 0.8,
    });
  }, [map, scope, bounds]);

  return null;
}

export function LeafletMap({
  stations,
  zones,
  scope,
  averageAqi,
  selectedZoneId,
  onZoneClick,
}: LeafletMapProps) {
  const bounds = SCOPE_BOUNDS[scope];

  const heatPoints = useMemo(
    () =>
      stations.map((s) => ({
        lat: s.lat,
        lon: s.lon,
        aqi: s.aqi,
      })),
    [stations]
  );

  return (
    <MapContainer
      center={[bounds.center.lat, bounds.center.lon]}
      zoom={bounds.zoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
      preferCanvas
    >
      <MapCameraController scope={scope} />

      {/* CARTO Dark basemap */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />

      <ZonePolygons
        zones={zones}
        onZoneClick={onZoneClick}
        selectedZoneId={selectedZoneId}
      />

      <HeatLayer
        points={heatPoints}
        radius={45}
        blur={35}
        maxZoom={14}
        minOpacity={0.15}
        gradient={HEAT_GRADIENT}
      />

      <ParticleLayer averageAqi={averageAqi} particleCount={50} />
    </MapContainer>
  );
}
