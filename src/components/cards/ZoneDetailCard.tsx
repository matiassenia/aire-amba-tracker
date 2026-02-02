// Zone Detail Card - Slide-in panel when zone is clicked
import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  getAqiColor, 
  getAqiLabel, 
  getContextualMessage,
  getConfidenceLabel,
  formatPollutant 
} from '@/lib/aqiUtils';
import type { Zone, Station } from '@/types/airQuality';
import { cn } from '@/lib/utils';
import { X, MapPin, Activity } from 'lucide-react';

interface ZoneDetailCardProps {
  zone: Zone | null;
  stations: Station[];
  onClose: () => void;
}

export function ZoneDetailCard({ zone, stations, onClose }: ZoneDetailCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (zone) {
      // Small delay to trigger animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [zone]);

  if (!zone) return null;

  const aqi = zone.estimatedAqi ?? 50;
  const aqiColor = getAqiColor(aqi);
  const aqiLabel = getAqiLabel(aqi);
  const contextual = getContextualMessage(aqi);

  // Find nearest stations
  const stationsWithDistance = stations.map(s => {
    const dLat = (zone.centroid.lat - s.lat) * 111;
    const dLon = (zone.centroid.lon - s.lon) * 111 * Math.cos(zone.centroid.lat * Math.PI / 180);
    const distance = Math.sqrt(dLat * dLat + dLon * dLon);
    return { ...s, distance };
  }).sort((a, b) => a.distance - b.distance).slice(0, 3);

  // Get dominant pollutant from nearest station
  const dominantPol = stationsWithDistance[0]?.dominentpol;

  return (
    <div 
      className={cn(
        'fixed top-0 right-0 h-full w-80 z-50',
        'transition-transform duration-300 ease-out',
        isVisible ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <GlassCard className="h-full rounded-none rounded-l-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-white text-lg font-semibold">{zone.name}</h2>
            <span className="text-white/50 text-xs uppercase tracking-wide">
              {zone.type === 'comuna' ? 'CABA' : 'Conurbano'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* AQI Display */}
        <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-white/5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ 
              background: `radial-gradient(circle, ${aqiColor}40 0%, transparent 70%)`,
              boxShadow: `0 0 30px ${aqiColor}30`
            }}
          >
            <span 
              className="text-3xl font-light tabular-nums"
              style={{ color: aqiColor }}
            >
              {aqi}
            </span>
          </div>
          <div className="flex-1">
            <span 
              className="text-lg font-medium block"
              style={{ color: aqiColor }}
            >
              {aqiLabel}
            </span>
            <span className="text-white/40 text-sm">
              Índice de Calidad del Aire
            </span>
          </div>
        </div>

        {/* Contextual Message */}
        <div className="mb-6 p-3 rounded-xl bg-white/5">
          <p className="text-white/80 text-sm leading-relaxed">
            <span className="text-lg mr-2">{contextual.emoji}</span>
            {contextual.message}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Confidence */}
          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-white/40 text-xs block mb-1">Precisión</span>
            <span className="text-white text-sm font-medium">
              {getConfidenceLabel(zone.confidence || 'medium')}
            </span>
          </div>
          {/* Dominant Pollutant */}
          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-white/40 text-xs block mb-1">
              Contaminante
            </span>
            <span className="text-white text-sm font-medium">
              {dominantPol ? formatPollutant(dominantPol) : 'PM2.5'}
            </span>
          </div>
        </div>

        {/* Nearest Stations */}
        <div>
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            Estaciones cercanas
          </h3>
          <div className="space-y-2">
            {stationsWithDistance.map(station => (
              <div 
                key={station.uid}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm block truncate">
                    {station.name.replace(', Buenos Aires', '')}
                  </span>
                  <span className="text-white/40 text-xs">
                    {station.distance.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity 
                    className="w-3 h-3" 
                    style={{ color: getAqiColor(station.aqi) }}
                  />
                  <span 
                    className="text-sm font-medium tabular-nums"
                    style={{ color: getAqiColor(station.aqi) }}
                  >
                    {station.aqi}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
