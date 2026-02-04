// Air Quality Types for Aire AMBA

export interface Station {
  uid: number; // WAQI station UID
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
  dominentpol?: string;
  time?: string; // last update (string from API)
}

export type ZoneType = "comuna" | "partido";
export type Scope = "caba" | "conurbano" | "amba";

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
  distanceKm: number;
};

/** Snapshot for the currently selected zone (and/or cached per zone) */
export type ZoneAqiSnapshot = {
  zoneId: string;
  zoneName: string;
  aqi: number;
  source: DataSourceType;
  confidence: ConfidenceLevel;
  nearestStations: NearestStationInfo[];
  dominentpol?: string;
  lastUpdated?: string | null;
};

export interface AirQualityData {
  stations: Station[];
  zones: Zone[];
  averageAqi: number;
  lastUpdated: string;
  isUsingMockData: boolean;
}
