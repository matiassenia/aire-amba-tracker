// Zone Polygons - Interactive zone boundaries on the map
import { Polygon, Tooltip } from 'react-leaflet';
import type { Zone } from '@/types/airQuality';

interface ZonePolygonsProps {
  zones: Zone[];
  onZoneClick: (zone: Zone) => void;
  selectedZoneId?: string | null;
}

export function ZonePolygons({ zones, onZoneClick, selectedZoneId }: ZonePolygonsProps) {
  return (
    <>
      {zones.map(zone => {
        const isSelected = zone.id === selectedZoneId;

        return (
          <Polygon
            key={zone.id}
            positions={zone.polygon.map(([lat, lon]) => [lat, lon] as [number, number])}
            pathOptions={{
              fillOpacity: 0,
              color: isSelected ? '#fff' : 'rgba(255,255,255,0.32)',
              weight: isSelected ? 2 : 1,
              opacity: isSelected ? 0.85 : 0.35,
            }}
            eventHandlers={{
              click: () => onZoneClick(zone),
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 0,
                  weight: 2,
                  opacity: 0.75,
                });
              },
              mouseout: (e) => {
                if (!isSelected) {
                  const layer = e.target;
                  layer.setStyle({
                    fillOpacity: 0,
                    weight: 1,
                    opacity: 0.35,
                  });
                }
              },
            }}
          >
            <Tooltip 
              direction="top" 
              offset={[0, -10]} 
              opacity={0.9}
              className="zone-tooltip"
            >
              <div className="text-center">
                <div className="font-medium">{zone.name}</div>
                <div className="text-sm opacity-80">Borde de referencia</div>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
