// Environmental platform types.

export interface Station {
  uid: number;
  name: string;
  lat: number;
  lon: number;
  aqi: number;
  iaqi?: {
    pm25?: number;
    pm10?: number;
    o3?: number;
    no2?: number;
    co?: number;
    so2?: number;
  };
  dominant_variable?: string | null;
  time?: string; // last update (string from API)
}

export type ZoneType = "comuna" | "partido";
export type Scope = "caba" | "buenos_aires" | "argentina";

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
  averageAqi: number | null;
  lastUpdated: string;
  isUsingMockData: boolean;
}
