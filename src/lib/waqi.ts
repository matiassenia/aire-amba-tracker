export type WaqiGeoPoint = {
    lat: number;
    lon: number;
    aqi: number | null;
    name?: string;
  };
  
  function parseAqi(v: any): number | null {
    if (v === "-" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  
  export async function fetchAqiByGeo(params: {
    lat: number;
    lon: number;
    token: string;
  }): Promise<WaqiGeoPoint> {
    const { lat, lon, token } = params;
  
    // Usamos el proxy de Vite: /waqi -> https://api.waqi.info
    const url = `/waqi/feed/geo:${lat};${lon}/?token=${encodeURIComponent(token)}`;
  
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WAQI HTTP ${res.status}`);
  
    const json = await res.json();
    if (json.status !== "ok") throw new Error(`WAQI status: ${json.status}`);
  
    const aqi = parseAqi(json?.data?.aqi);
    const name = json?.data?.city?.name ? String(json.data.city.name) : undefined;
  
    return { lat, lon, aqi, name };
  }
  
  export function buildGrid(params: {
    south: number;
    west: number;
    north: number;
    east: number;
    stepLat: number;
    stepLon: number;
  }): Array<{ lat: number; lon: number }> {
    const { south, west, north, east, stepLat, stepLon } = params;
    const pts: Array<{ lat: number; lon: number }> = [];
  
    for (let lat = south; lat <= north; lat += stepLat) {
      for (let lon = west; lon <= east; lon += stepLon) {
        pts.push({
          lat: Number(lat.toFixed(5)),
          lon: Number(lon.toFixed(5)),
        });
      }
    }
    return pts;
  }
  