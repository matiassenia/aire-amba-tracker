// AireAmbaMap - Main orchestrator component for the map visualization
import React, { Suspense, useState, useCallback } from 'react';
import { AQISummaryCard } from '@/components/cards/AQISummaryCard';
import { ZoneDetailCard } from '@/components/cards/ZoneDetailCard';
import { BottomBar } from '@/components/layout/BottomBar';
import { StaticMapFallback } from '@/components/map/StaticMapFallback';
import { useAirQualityData } from '@/hooks/useAirQualityData';
import type { Zone, Scope } from '@/types/airQuality';
import { cn } from '@/lib/utils';

// Lazy load Leaflet map to avoid SSR issues
const LeafletMap = React.lazy(() => 
  import('@/components/map/LeafletMap').then(mod => ({ default: mod.LeafletMap }))
);

// Error boundary for map
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Map Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Loading state for map
function MapLoadingState() {
  return (
    <div className="h-full w-full bg-[#1a1a2e] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Cargando mapa...</span>
      </div>
    </div>
  );
}

export function AireAmbaMap() {
  const [scope, setScope] = useState<Scope>('amba');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const { 
    stations, 
    zones, 
    averageAqi, 
    lastUpdated, 
    isUsingMockData, 
    isLoading 
  } = useAirQualityData(scope);

  const handleZoneClick = useCallback((zone: Zone) => {
    setSelectedZone(prev => prev?.id === zone.id ? null : zone);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedZone(null);
  }, []);

  const handleScopeChange = useCallback((newScope: Scope) => {
    setScope(newScope);
    setSelectedZone(null);
  }, []);

  const fallbackMap = (
    <StaticMapFallback
      zones={zones}
      onZoneClick={handleZoneClick}
      selectedZoneId={selectedZone?.id}
    />
  );

  return (
    <div className="relative h-full w-full bg-background overflow-hidden">
      {/* Map Layer */}
      <div className="absolute inset-0">
        <MapErrorBoundary fallback={fallbackMap}>
          <Suspense fallback={<MapLoadingState />}>
            <LeafletMap
              stations={stations}
              zones={zones}
              scope={scope}
              averageAqi={averageAqi}
              selectedZoneId={selectedZone?.id}
              onZoneClick={handleZoneClick}
            />
          </Suspense>
        </MapErrorBoundary>
      </div>

      {/* UI Overlay - AQI Summary (top-left) */}
      <div className={cn(
        'absolute top-4 left-4 z-30',
        'transition-opacity duration-300',
        selectedZone && 'opacity-70'
      )}>
        <AQISummaryCard
          averageAqi={averageAqi}
          lastUpdated={lastUpdated}
          isUsingMockData={isUsingMockData}
          isLoading={isLoading}
        />
      </div>

      {/* Zone Detail Panel (slide from right) */}
      <ZoneDetailCard
        zone={selectedZone}
        stations={stations}
        onClose={handleCloseDetail}
      />

      {/* Bottom Bar */}
      <BottomBar
        scope={scope}
        onScopeChange={handleScopeChange}
      />
    </div>
  );
}
