// Zone Polygons - Interactive zone boundaries on the map
import { Polygon, Tooltip } from 'react-leaflet';
import type { Zone } from '@/types/airQuality';
import { getAqiColorWithAlpha, getAqiLabel } from '@/lib/aqiUtils';

interface ZonePolygonsProps {
  zones: Zone[];
  onZoneClick: (zone: Zone) => void;
  selectedZoneId?: string | null;
}

export function ZonePolygons({ zones, onZoneClick, selectedZoneId }: ZonePolygonsProps) {
  return (
    <>
      {zones.map(zone => {
        const aqi = zone.estimatedAqi ?? 50;
        const fillColor = getAqiColorWithAlpha(aqi, 0.35);
        const strokeColor = getAqiColorWithAlpha(aqi, 0.7);
        const isSelected = zone.id === selectedZoneId;

        return (
          <Polygon
            key={zone.id}
            positions={zone.polygon.map(([lat, lon]) => [lat, lon] as [number, number])}
            pathOptions={{
              fillColor,
              fillOpacity: isSelected ? 0.5 : 0.35,
              color: isSelected ? '#fff' : strokeColor,
              weight: isSelected ? 2 : 1,
              opacity: isSelected ? 0.8 : 0.5,
            }}
            eventHandlers={{
              click: () => onZoneClick(zone),
              mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: 0.5,
                  weight: 2,
                });
              },
              mouseout: (e) => {
                if (!isSelected) {
                  const layer = e.target;
                  layer.setStyle({
                    fillOpacity: 0.35,
                    weight: 1,
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
                <div className="text-sm opacity-80">
                  AQI: {aqi} - {getAqiLabel(aqi)}
                </div>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
