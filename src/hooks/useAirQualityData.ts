import { useState, useEffect, useMemo } from 'react';
import type { Station, Zone, AirQualityData, Scope } from '@/types/airQuality';
import { MOCK_STATIONS, getMockAverageAqi } from '@/data/mockStations';
import { getZonesForScope } from '@/data/zones';
import { idwEstimate, type Sample } from '@/lib/idw';
import { getConfidenceLevel } from '@/lib/aqiUtils';
import { fetchStations } from '@/lib/apiClient';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
interface CacheEntry {
  data: Station[];
  timestamp: number;
}

let stationCache: CacheEntry | null = null;

async function fetchStationsFromApi(): Promise<Station[] | null> {
  if (stationCache && Date.now() - stationCache.timestamp < CACHE_TTL_MS) {
    return stationCache.data;
  }

  const stations = await fetchStations();
  if (stations) {
    stationCache = { data: stations, timestamp: Date.now() };
  }

  return stations;
}

/**
 * Estimate AQI for zones using IDW interpolation
 */
function estimateZoneAqi(zones: Zone[], stations: Station[]): Zone[] {
  const samples: Sample[] = stations.map(s => ({
    lat: s.lat,
    lon: s.lon,
    value: s.aqi,
  }));

  return zones.map(zone => {
    const estimate = idwEstimate(zone.centroid, samples, {
      power: 2,
      k: 5,
      maxDistKm: 20,
      minPoints: 2,
    });

    // Calculate distance to nearest station
    let nearestDist = Infinity;
    for (const s of stations) {
      const dLat = (zone.centroid.lat - s.lat) * 111;
      const dLon = (zone.centroid.lon - s.lon) * 111 * Math.cos(zone.centroid.lat * Math.PI / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist < nearestDist) nearestDist = dist;
    }

    return {
      ...zone,
      estimatedAqi: estimate !== null ? Math.round(estimate) : undefined,
      confidence: getConfidenceLevel(nearestDist),
    };
  });
}

/**
 * Filter stations by scope
 */
function filterStationsByScope(stations: Station[], scope: Scope): Station[] {
  const cabaBounds = {
    north: -34.53,
    south: -34.71,
    west: -58.53,
    east: -58.33,
  };

  return stations.filter(s => {
    const inCaba = 
      s.lat >= cabaBounds.south && s.lat <= cabaBounds.north &&
      s.lon >= cabaBounds.west && s.lon <= cabaBounds.east;

    switch (scope) {
      case 'caba':
        return inCaba;
      case 'buenos_aires':
        return !inCaba;
      case 'argentina':
        return true;
    }
  });
}

/**
 * Main hook for air quality data
 */
export function useAirQualityData(scope: Scope): AirQualityData & { isLoading: boolean } {
  const [stations, setStations] = useState<Station[]>(MOCK_STATIONS);
  const [isUsingMockData, setIsUsingMockData] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());

  // Fetch real data on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const realStations = await fetchStationsFromApi();
      
      if (cancelled) return;

      if (realStations && realStations.length > 0) {
        setStations(realStations);
        setIsUsingMockData(false);
        setLastUpdated(new Date().toISOString());
      } else {
        setStations(MOCK_STATIONS);
        setIsUsingMockData(true);
      }
      
      setIsLoading(false);
    }

    load();

    // Refresh every 10 minutes
    const interval = setInterval(load, CACHE_TTL_MS);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Filter and process data based on scope
  const processedData = useMemo(() => {
    const filteredStations = filterStationsByScope(stations, scope);
    const zones = getZonesForScope(scope);
    const estimatedZones = estimateZoneAqi(zones, filteredStations);
    
    const averageAqi = filteredStations.length > 0
      ? Math.round(filteredStations.reduce((acc, s) => acc + s.aqi, 0) / filteredStations.length)
      : getMockAverageAqi();

    return {
      stations: filteredStations,
      zones: estimatedZones,
      averageAqi,
    };
  }, [stations, scope]);

  return {
    ...processedData,
    lastUpdated,
    isUsingMockData,
    isLoading,
  };
}
