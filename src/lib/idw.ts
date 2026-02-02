// src/lib/idw.ts
export type LatLon = { lat: number; lon: number };
export type Sample = LatLon & { value: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Distancia aproximada en km (rápida) usando equirectangular.
 * Suficiente para AMBA (área chica).
 */
function distKm(a: LatLon, b: LatLon) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const x = toRad(b.lon - a.lon) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return Math.sqrt(x * x + y * y) * R;
}

export type IDWOptions = {
  power?: number;        // p, típico 2
  k?: number;            // vecinos más cercanos
  maxDistKm?: number;    // corta influencia
  minPoints?: number;    // mínimo para estimar
};

/**
 * Estima value en target usando IDW.
 */
export function idwEstimate(
  target: LatLon,
  samples: Sample[],
  opts: IDWOptions = {}
): number | null {
  const power = opts.power ?? 2;
  const k = opts.k ?? 8;
  const maxDistKm = opts.maxDistKm ?? 40; // AMBA
  const minPoints = opts.minPoints ?? 3;

  // Calcula distancias y filtra por maxDistKm
  const ds = samples
    .map((s) => ({ s, d: distKm(target, s) }))
    .filter((x) => x.d <= maxDistKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, k);

  if (ds.length < minPoints) return null;

  // Si hay un punto prácticamente encima, devolvemos directo
  if (ds[0].d < 0.05) return ds[0].s.value; // ~50m

  let num = 0;
  let den = 0;

  for (const { s, d } of ds) {
    const w = 1 / Math.pow(d, power);
    num += w * s.value;
    den += w;
  }

  if (den === 0) return null;
  return num / den;
}

export type GridOptions = {
  stepLat: number;
  stepLon: number;
};

/**
 * Crea una grilla regular de puntos dentro de bbox.
 */
export function buildDenseGrid(
  bbox: { south: number; west: number; north: number; east: number },
  grid: GridOptions
): LatLon[] {
  const out: LatLon[] = [];
  for (let lat = bbox.south; lat <= bbox.north + 1e-9; lat += grid.stepLat) {
    for (let lon = bbox.west; lon <= bbox.east + 1e-9; lon += grid.stepLon) {
      out.push({ lat, lon });
    }
  }
  return out;
}

/**
 * Normaliza a [0..1] con curva suave estilo “Apple”.
 * Cap suave en 200 para que extremos no quemen todo.
 */
export function aqiToIntensity(aqi: number) {
  const capped = clamp(aqi, 0, 200);
  const t = capped / 200;         // 0..1
  const boosted = Math.pow(t, 0.70); // levanta medios
  return clamp(boosted, 0, 1);
}
