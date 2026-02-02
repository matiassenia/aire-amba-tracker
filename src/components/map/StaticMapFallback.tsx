// StaticMapFallback - CSS/SVG fallback when Leaflet fails to load
import { getAqiColorWithAlpha, getAqiLabel } from '@/lib/aqiUtils';
import type { Zone } from '@/types/airQuality';
import { cn } from '@/lib/utils';

interface StaticMapFallbackProps {
  zones: Zone[];
  onZoneClick: (zone: Zone) => void;
  selectedZoneId?: string | null;
}

export function StaticMapFallback({ zones, onZoneClick, selectedZoneId }: StaticMapFallbackProps) {
  // Normalize coordinates to fit in viewport
  const allLats = zones.flatMap(z => z.polygon.map(p => p[0]));
  const allLons = zones.flatMap(z => z.polygon.map(p => p[1]));
  
  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const minLon = Math.min(...allLons);
  const maxLon = Math.max(...allLons);

  const latRange = maxLat - minLat || 1;
  const lonRange = maxLon - minLon || 1;

  // Convert lat/lon to SVG coordinates (inverted Y for SVG)
  const toSvg = (lat: number, lon: number): [number, number] => {
    const x = ((lon - minLon) / lonRange) * 100;
    const y = ((maxLat - lat) / latRange) * 100;
    return [x, y];
  };

  return (
    <div className="h-full w-full bg-[#1a1a2e] relative flex items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
      
      {/* SVG Map */}
      <svg
        viewBox="-5 -5 110 110"
        className="w-full h-full max-w-3xl max-h-3xl p-8"
        preserveAspectRatio="xMidYMid meet"
      >
        {zones.map(zone => {
          const aqi = zone.estimatedAqi ?? 50;
          const fillColor = getAqiColorWithAlpha(aqi, 0.4);
          const strokeColor = getAqiColorWithAlpha(aqi, 0.8);
          const isSelected = zone.id === selectedZoneId;

          const points = zone.polygon
            .map(([lat, lon]) => toSvg(lat, lon))
            .map(([x, y]) => `${x},${y}`)
            .join(' ');

          const centroid = toSvg(zone.centroid.lat, zone.centroid.lon);

          return (
            <g key={zone.id} onClick={() => onZoneClick(zone)} className="cursor-pointer">
              <polygon
                points={points}
                fill={fillColor}
                stroke={isSelected ? '#fff' : strokeColor}
                strokeWidth={isSelected ? 1 : 0.5}
                className="transition-all duration-200 hover:opacity-80"
              />
              <text
                x={centroid[0]}
                y={centroid[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white/70 text-[3px] font-medium pointer-events-none"
              >
                {aqi}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Fallback message */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
        <div className={cn(
          'px-4 py-2 rounded-full',
          'bg-black/40 backdrop-blur-sm',
          'text-white/60 text-sm'
        )}>
          Mapa interactivo no disponible
        </div>
      </div>
    </div>
  );
}
