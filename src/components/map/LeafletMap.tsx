// LeafletMap - Core map component with dark theme basemap
import { MapContainer, TileLayer } from 'react-leaflet';
import { HeatLayer } from '@/components/HeatLayer';
import { ZonePolygons } from '@/components/map/ZonePolygons';
import { ParticleLayer } from '@/components/map/ParticleLayer';
import type { Station, Zone, Scope } from '@/types/airQuality';
import { SCOPE_BOUNDS } from '@/data/zones';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Apple Weather inspired gradient for heat layer
const HEAT_GRADIENT = {
  0.0: '#4ADE80',  // soft green
  0.3: '#FBBF24',  // warm amber
  0.5: '#FB923C',  // soft orange
  0.7: '#F87171',  // muted red
  0.9: '#A78BFA',  // soft purple
  1.0: '#7F1D1D',  // dark maroon
};

interface LeafletMapProps {
  stations: Station[];
  zones: Zone[];
  scope: Scope;
  averageAqi: number;
  selectedZoneId?: string | null;
  onZoneClick: (zone: Zone) => void;
}

export function LeafletMap({
  stations,
  zones,
  scope,
  averageAqi,
  selectedZoneId,
  onZoneClick,
}: LeafletMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const bounds = SCOPE_BOUNDS[scope];

  // Update map view when scope changes
  useEffect(() => {
    if (map) {
      map.flyTo([bounds.center.lat, bounds.center.lon], bounds.zoom, {
        duration: 0.8,
      });
    }
  }, [map, scope, bounds]);

  // Convert stations to heat points
  const heatPoints = stations.map(s => ({
    lat: s.lat,
    lon: s.lon,
    aqi: s.aqi,
  }));

  return (
    <MapContainer
      center={[bounds.center.lat, bounds.center.lon]}
      zoom={bounds.zoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
      ref={setMap}
    >
      {/* CARTO Dark basemap - Apple Maps style */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />

      {/* Zone polygons */}
      <ZonePolygons
        zones={zones}
        onZoneClick={onZoneClick}
        selectedZoneId={selectedZoneId}
      />

      {/* Heat layer */}
      <HeatLayer
        points={heatPoints}
        radius={45}
        blur={35}
        maxZoom={14}
        minOpacity={0.15}
        gradient={HEAT_GRADIENT}
      />

      {/* Particle animation overlay */}
      <ParticleLayer averageAqi={averageAqi} particleCount={50} />
    </MapContainer>
  );
}
