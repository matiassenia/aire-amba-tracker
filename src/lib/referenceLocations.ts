import type { CoverageConfidence } from "@/lib/coverage";

// Ubicaciones de referencia para auditar la politica de cobertura.
//
// Las distancias vienen de la auditoria real combinada WAQI+OpenAQ del
// 2026-08-01 (estacion mas cercana, ignorando frescura). Son un contrato de
// producto: la banda esperada debe mantenerse mientras no cambie la politica
// de distancia (5/20/50 km). No son mediciones en vivo.
export type ReferenceLocation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  expectedNearestDistanceKm: number;
  expectedBand: CoverageConfidence;
};

export const REFERENCE_LOCATIONS: ReferenceLocation[] = [
  {
    id: "caba-centro",
    name: "CABA (centro)",
    lat: -34.6037,
    lon: -58.3816,
    expectedNearestDistanceKm: 1.0,
    expectedBand: "high",
  },
  {
    id: "amba-centro",
    name: "AMBA (centro de bounds)",
    lat: -34.65,
    lon: -58.5,
    expectedNearestDistanceKm: 5.0,
    expectedBand: "medium",
  },
  {
    id: "san-miguel",
    name: "San Miguel",
    lat: -34.537,
    lon: -58.715,
    expectedNearestDistanceKm: 18.5,
    expectedBand: "medium",
  },
  {
    id: "bella-vista",
    name: "Bella Vista",
    lat: -34.56,
    lon: -58.69,
    expectedNearestDistanceKm: 15.2,
    expectedBand: "medium",
  },
  {
    id: "jose-c-paz",
    name: "José C. Paz",
    lat: -34.52,
    lon: -58.77,
    expectedNearestDistanceKm: 23.7,
    expectedBand: "low",
  },
  {
    id: "moreno",
    name: "Moreno",
    lat: -34.65,
    lon: -58.79,
    expectedNearestDistanceKm: 21.8,
    expectedBand: "low",
  },
  {
    id: "tigre",
    name: "Tigre",
    lat: -34.426,
    lon: -58.58,
    expectedNearestDistanceKm: 16.4,
    expectedBand: "medium",
  },
  {
    id: "la-plata",
    name: "La Plata",
    lat: -34.921,
    lon: -57.954,
    expectedNearestDistanceKm: 44.4,
    expectedBand: "low",
  },
  {
    id: "pba-centroide",
    name: "PBA (centroide)",
    lat: -37.0,
    lon: -61.0,
    expectedNearestDistanceKm: 220.9,
    expectedBand: "none",
  },
];

export function referenceLocationById(id: string): ReferenceLocation | undefined {
  return REFERENCE_LOCATIONS.find((location) => location.id === id);
}
