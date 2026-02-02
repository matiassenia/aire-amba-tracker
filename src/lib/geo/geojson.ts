// src/lib/geo/geojson.ts
import type { LatLngExpression } from "leaflet";

export type ZoneProps = {
  id?: string | number;
  name?: string;
  type?: string;
  [k: string]: any;
};

export type ZoneFeature = {
  type: "Feature";
  properties: ZoneProps;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
};

export type ZoneFC = {
  type: "FeatureCollection";
  features: ZoneFeature[];
};

// Convierte Polygon/MultiPolygon GeoJSON -> array de "positions" compatibles con react-leaflet Polygon
// - Polygon => LatLngExpression[][]
// - MultiPolygon => LatLngExpression[][][]
export function toLeafletPositions(
  geom: ZoneFeature["geometry"]
): LatLngExpression[][] | LatLngExpression[][][] {
  if (geom.type === "Polygon") {
    // coordinates: [ outerRing, hole1, hole2... ], ring = [ [lon,lat], ... ]
    return geom.coordinates.map((ring: [number, number][]) =>
      ring.map(([lon, lat]) => [lat, lon] as LatLngExpression)
    );
  }

  // MultiPolygon: [ polygon1, polygon2, ... ], each polygon = [ outer, holes... ]
  return geom.coordinates.map((polygon: [number, number][][]) =>
    polygon.map((ring: [number, number][]) =>
      ring.map(([lon, lat]) => [lat, lon] as LatLngExpression)
    )
  );
}

// Id estable para React keys / selección
export function getZoneId(f: ZoneFeature, idx: number) {
  return String(f.properties?.id ?? f.properties?.ID ?? f.properties?.codigo ?? f.properties?.code ?? idx);
}

export function getZoneName(f: ZoneFeature, idx: number) {
  return String(f.properties?.name ?? f.properties?.nombre ?? f.properties?.NOMBRE ?? `Zona ${idx + 1}`);
}
