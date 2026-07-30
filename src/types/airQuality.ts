// Environmental platform types.

export interface Station {
  uid: number;
  name: string;
  lat: number;
  lon: number;
  aqi: number | null;
  iaqi?: {
    pm25?: number | null;
    pm10?: number | null;
    o3?: number | null;
    no2?: number | null;
    co?: number | null;
    so2?: number | null;
  };
  dominant_variable?: string | null;
  time?: string; // last update (string from API)
  source?: string | null;
  measured_at?: string | null;
  data_available?: boolean;
  region_id?: string | null;
  region_name?: string | null;
}

export type ZoneType = "comuna" | "partido";
export type Scope = string;

export interface Region {
  id: string;
  name: string;
  bounds: [number, number, number, number];
  center: [number, number];
  default_zoom: number;
  description: string;
}

export interface StationQueryMetadata {
  region_id: string;
  region_name: string;
  source: string;
  cache_hit: boolean;
  cache_ttl_seconds: number;
  stations_discovered: number;
  stations_returned: number;
  stations_deduplicated: number;
  stations_with_data: number;
  pollutants_available: string[];
  timestamps_received: number;
  updated_at: string;
  coverage_partial: boolean;
  unavailable_regions: string[];
  regions: Record<string, unknown>[];
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  centroid: { lat: number; lon: number };
  polygon: [number, number][]; // [lat, lon][]

  // Optional, derived values (useful for quick coloring, but not a full explanation)
  estimatedAqi?: number;
  confidence?: ConfidenceLevel;
}

export type AQILevel =
  | "good"
  | "moderate"
  | "unhealthy-sensitive"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

/** Source transparency (crucial for trust) */
export type DataSourceType = "REAL" | "ESTIMATED";

/** Confidence for estimated values */
export type ConfidenceLevel = "high" | "medium" | "low";

/** Used in UI to explain estimation */
export type NearestStationInfo = {
  uid: number;
  name: string;
  lat: number;
  lon: number;
  aqi: number;
  distance_km: number;
};

/** Snapshot for the currently selected zone (and/or cached per zone) */
export type ZoneAqiSnapshot = {
  zone_id: string;
  zone_name: string;
  aqi: number | null;
  source: DataSourceType;
  confidence: ConfidenceLevel;
  nearest_stations: NearestStationInfo[];
  dominant_variable?: string | null;
  last_updated?: string | null;
};

export interface AirQualityData {
  stations: Station[];
  zones: Zone[];
  regions: Region[];
  selectedRegion?: Region | null;
  metadata?: StationQueryMetadata | null;
  averageAqi: number | null;
  lastUpdated: string;
  isUsingMockData: boolean;
  errorMessage?: string | null;
}
