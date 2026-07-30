import { useState, useEffect, useMemo } from 'react';
import type { Station, AirQualityData, Scope, Region, StationQueryMetadata } from '@/types/airQuality';
import { getZonesForRegion } from '@/data/zones';
import { fetchRegions, fetchStationMetadata, fetchStations } from '@/lib/apiClient';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
interface CacheEntry {
  data: Station[];
  metadata: StationQueryMetadata | null;
  timestamp: number;
}

const stationCache = new Map<string, CacheEntry>();

async function fetchStationsFromApi(region: string): Promise<CacheEntry> {
  const cached = stationCache.get(region);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  const stations = await fetchStations(region);
  const metadata = await fetchStationMetadata(region).catch(() => null);
  const entry = { data: stations, metadata, timestamp: Date.now() };
  stationCache.set(region, entry);

  return entry;
}

function hasAqi(station: Station): station is Station & { aqi: number } {
  return station.aqi !== null && Number.isFinite(station.aqi);
}

let regionsCache: { data: Region[]; timestamp: number } | null = null;

async function fetchRegionsFromApi(): Promise<Region[]> {
  if (regionsCache && Date.now() - regionsCache.timestamp < CACHE_TTL_MS) {
    return regionsCache.data;
  }
  const regions = await fetchRegions();
  regionsCache = { data: regions, timestamp: Date.now() };
  return regions;
}

/**
 * Main hook for air quality data
 */
export function useAirQualityData(scope: Scope): AirQualityData & { isLoading: boolean } {
  const [stations, setStations] = useState<Station[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [metadata, setMetadata] = useState<StationQueryMetadata | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      setStations([]);
      setMetadata(null);
      try {
        const [availableRegions, stationEntry] = await Promise.all([
          fetchRegionsFromApi(),
          fetchStationsFromApi(scope),
        ]);
        if (cancelled) return;
        setRegions(availableRegions);
        setStations(stationEntry.data);
        setMetadata(stationEntry.metadata);
        setIsUsingMockData(false);
        setErrorMessage(null);
        setLastUpdated(
          stationEntry.data.find((station) => station.measured_at)?.measured_at ?? new Date().toISOString()
        );
      } catch (error) {
        console.error('Backend stations request failed:', error);
        if (cancelled) return;
        setStations([]);
        setMetadata(null);
        setIsUsingMockData(false);
        setErrorMessage('No se pudieron obtener datos ambientales reales.');
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
  }, [scope]);

  // Filter and process data based on scope
  const processedData = useMemo(() => {
    const zones = getZonesForRegion(scope);
    const measuredStations = stations.filter(hasAqi);
    
    const averageAqi = measuredStations.length > 0
      ? Math.round(measuredStations.reduce((acc, s) => acc + s.aqi, 0) / measuredStations.length)
      : null;

    return {
      stations,
      zones,
      averageAqi,
    };
  }, [stations, scope]);

  return {
    ...processedData,
    regions,
    selectedRegion: regions.find((region) => region.id === scope) ?? null,
    metadata,
    lastUpdated,
    isUsingMockData,
    isLoading,
    errorMessage,
  };
}
