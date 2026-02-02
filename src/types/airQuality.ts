// Air Quality Types for Aire AMBA

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
  dominentpol?: string;
  time?: string;
}

export interface Zone {
  id: string;
  name: string;
  type: 'comuna' | 'partido';
  centroid: { lat: number; lon: number };
  polygon: [number, number][]; // [lat, lon][]
  estimatedAqi?: number;
  confidence?: 'high' | 'medium' | 'low';
}

export type AQILevel = 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export type Scope = 'caba' | 'conurbano' | 'amba';

export interface AirQualityData {
  stations: Station[];
  zones: Zone[];
  averageAqi: number;
  lastUpdated: string;
  isUsingMockData: boolean;
}
