// Zone data for initial Argentina platform seeds.
import type { Zone } from "@/types/airQuality";

// CABA Comunas - Simplified polygons (approximate boundaries)
export const CABA_ZONES: Zone[] = [
  {
    id: "comuna-1",
    name: "Comuna 1",
    type: "comuna",
    centroid: { lat: -34.6083, lon: -58.3712 },
    polygon: [
      [-34.595, -58.385],
      [-34.595, -58.355],
      [-34.625, -58.355],
      [-34.625, -58.385],
    ],
  },
  {
    id: "comuna-2",
    name: "Comuna 2",
    type: "comuna",
    centroid: { lat: -34.5875, lon: -58.3935 },
    polygon: [
      [-34.575, -58.405],
      [-34.575, -58.38],
      [-34.6, -58.38],
      [-34.6, -58.405],
    ],
  },
  {
    id: "comuna-3",
    name: "Comuna 3",
    type: "comuna",
    centroid: { lat: -34.612, lon: -58.41 },
    polygon: [
      [-34.598, -58.42],
      [-34.598, -58.395],
      [-34.626, -58.395],
      [-34.626, -58.42],
    ],
  },
  {
    id: "comuna-4",
    name: "Comuna 4",
    type: "comuna",
    centroid: { lat: -34.64, lon: -58.38 },
    polygon: [
      [-34.62, -58.395],
      [-34.62, -58.355],
      [-34.66, -58.355],
      [-34.66, -58.395],
    ],
  },
  {
    id: "comuna-5",
    name: "Comuna 5",
    type: "comuna",
    centroid: { lat: -34.61, lon: -58.43 },
    polygon: [
      [-34.595, -58.445],
      [-34.595, -58.415],
      [-34.625, -58.415],
      [-34.625, -58.445],
    ],
  },
  {
    id: "comuna-6",
    name: "Comuna 6",
    type: "comuna",
    centroid: { lat: -34.6175, lon: -58.44 },
    polygon: [
      [-34.605, -58.455],
      [-34.605, -58.425],
      [-34.63, -58.425],
      [-34.63, -58.455],
    ],
  },
  {
    id: "comuna-7",
    name: "Comuna 7",
    type: "comuna",
    centroid: { lat: -34.635, lon: -58.455 },
    polygon: [
      [-34.62, -58.47],
      [-34.62, -58.44],
      [-34.65, -58.44],
      [-34.65, -58.47],
    ],
  },
  {
    id: "comuna-8",
    name: "Comuna 8",
    type: "comuna",
    centroid: { lat: -34.67, lon: -58.465 },
    polygon: [
      [-34.65, -58.485],
      [-34.65, -58.445],
      [-34.69, -58.445],
      [-34.69, -58.485],
    ],
  },
  {
    id: "comuna-9",
    name: "Comuna 9",
    type: "comuna",
    centroid: { lat: -34.655, lon: -58.495 },
    polygon: [
      [-34.635, -58.515],
      [-34.635, -58.475],
      [-34.675, -58.475],
      [-34.675, -58.515],
    ],
  },
  {
    id: "comuna-10",
    name: "Comuna 10",
    type: "comuna",
    centroid: { lat: -34.635, lon: -58.51 },
    polygon: [
      [-34.615, -58.53],
      [-34.615, -58.49],
      [-34.655, -58.49],
      [-34.655, -58.53],
    ],
  },
  {
    id: "comuna-11",
    name: "Comuna 11",
    type: "comuna",
    centroid: { lat: -34.61, lon: -58.505 },
    polygon: [
      [-34.59, -58.525],
      [-34.59, -58.485],
      [-34.63, -58.485],
      [-34.63, -58.525],
    ],
  },
  {
    id: "comuna-12",
    name: "Comuna 12",
    type: "comuna",
    centroid: { lat: -34.565, lon: -58.49 },
    polygon: [
      [-34.545, -58.51],
      [-34.545, -58.47],
      [-34.585, -58.47],
      [-34.585, -58.51],
    ],
  },
  {
    id: "comuna-13",
    name: "Comuna 13",
    type: "comuna",
    centroid: { lat: -34.555, lon: -58.455 },
    polygon: [
      [-34.535, -58.475],
      [-34.535, -58.435],
      [-34.575, -58.435],
      [-34.575, -58.475],
    ],
  },
  {
    id: "comuna-14",
    name: "Comuna 14",
    type: "comuna",
    centroid: { lat: -34.575, lon: -58.425 },
    polygon: [
      [-34.555, -58.445],
      [-34.555, -58.405],
      [-34.595, -58.405],
      [-34.595, -58.445],
    ],
  },
  {
    id: "comuna-15",
    name: "Comuna 15",
    type: "comuna",
    centroid: { lat: -34.59, lon: -58.465 },
    polygon: [
      [-34.57, -58.485],
      [-34.57, -58.445],
      [-34.61, -58.445],
      [-34.61, -58.485],
    ],
  },
];

// Buenos Aires Province - initial municipalities
export const CONURBANO_ZONES: Zone[] = [
  {
    id: "avellaneda",
    name: "Avellaneda",
    type: "partido",
    centroid: { lat: -34.6621, lon: -58.3656 },
    polygon: [
      [-34.64, -58.39],
      [-34.64, -58.34],
      [-34.685, -58.34],
      [-34.685, -58.39],
    ],
  },
  {
    id: "lanus",
    name: "Lanús",
    type: "partido",
    centroid: { lat: -34.7065, lon: -58.3926 },
    polygon: [
      [-34.685, -58.415],
      [-34.685, -58.37],
      [-34.728, -58.37],
      [-34.728, -58.415],
    ],
  },
  {
    id: "quilmes",
    name: "Quilmes",
    type: "partido",
    centroid: { lat: -34.7203, lon: -58.2545 },
    polygon: [
      [-34.69, -58.29],
      [-34.69, -58.22],
      [-34.75, -58.22],
      [-34.75, -58.29],
    ],
  },
  {
    id: "lomas-zamora",
    name: "Lomas de Zamora",
    type: "partido",
    centroid: { lat: -34.7592, lon: -58.4006 },
    polygon: [
      [-34.728, -58.43],
      [-34.728, -58.37],
      [-34.79, -58.37],
      [-34.79, -58.43],
    ],
  },
  {
    id: "san-isidro",
    name: "San Isidro",
    type: "partido",
    centroid: { lat: -34.4708, lon: -58.5278 },
    polygon: [
      [-34.44, -58.56],
      [-34.44, -58.495],
      [-34.5, -58.495],
      [-34.5, -58.56],
    ],
  },
  {
    id: "vicente-lopez",
    name: "Vicente López",
    type: "partido",
    centroid: { lat: -34.5252, lon: -58.4729 },
    polygon: [
      [-34.5, -58.5],
      [-34.5, -58.445],
      [-34.55, -58.445],
      [-34.55, -58.5],
    ],
  },
  {
    id: "tigre",
    name: "Tigre",
    type: "partido",
    centroid: { lat: -34.426, lon: -58.5797 },
    polygon: [
      [-34.38, -58.62],
      [-34.38, -58.54],
      [-34.47, -58.54],
      [-34.47, -58.62],
    ],
  },
  {
    id: "la-matanza",
    name: "La Matanza",
    type: "partido",
    centroid: { lat: -34.6854, lon: -58.5591 },
    polygon: [
      [-34.65, -58.62],
      [-34.65, -58.5],
      [-34.72, -58.5],
      [-34.72, -58.62],
    ],
  },
  {
    id: "moron",
    name: "Morón",
    type: "partido",
    centroid: { lat: -34.6506, lon: -58.6197 },
    polygon: [
      [-34.62, -58.65],
      [-34.62, -58.59],
      [-34.68, -58.59],
      [-34.68, -58.65],
    ],
  },
  {
    id: "tres-febrero",
    name: "Tres de Febrero",
    type: "partido",
    centroid: { lat: -34.6062, lon: -58.5644 },
    polygon: [
      [-34.58, -58.595],
      [-34.58, -58.535],
      [-34.632, -58.535],
      [-34.632, -58.595],
    ],
  },
  {
    id: "san-martin",
    name: "San Martín",
    type: "partido",
    centroid: { lat: -34.5761, lon: -58.5356 },
    polygon: [
      [-34.55, -58.565],
      [-34.55, -58.505],
      [-34.602, -58.505],
      [-34.602, -58.565],
    ],
  },

  // ✅ Added: San Miguel (approximate polygon, consistent with current simplified style)
  {
    id: "san-miguel",
    name: "San Miguel",
    type: "partido",
    centroid: { lat: -34.5435, lon: -58.7139 },
    polygon: [
      [-34.515, -58.745], // NW
      [-34.515, -58.675], // NE
      [-34.575, -58.675], // SE
      [-34.575, -58.745], // SW
    ],
  },

  {
    id: "almirante-brown",
    name: "Almirante Brown",
    type: "partido",
    centroid: { lat: -34.8167, lon: -58.3833 },
    polygon: [
      [-34.78, -58.42],
      [-34.78, -58.345],
      [-34.855, -58.345],
      [-34.855, -58.42],
    ],
  },
  {
    id: "jose-c-paz",
    name: "José C. Paz",
    type: "partido",
    centroid: { lat: -34.515, lon: -58.765 },
    polygon: [
      [-34.485, -58.80],
      [-34.485, -58.73],
      [-34.545, -58.73],
      [-34.545, -58.80],
    ],
  },
  {
    id: "malvinas-argentinas",
    name: "Malvinas Argentinas",
    type: "partido",
    centroid: { lat: -34.49, lon: -58.69 },
    polygon: [
      [-34.46, -58.73],
      [-34.46, -58.65],
      [-34.52, -58.65],
      [-34.52, -58.73],
    ],
  },
  {
    id: "pilar",
    name: "Pilar",
    type: "partido",
    centroid: { lat: -34.458, lon: -58.914 },
    polygon: [
      [-34.40, -58.98],
      [-34.40, -58.85],
      [-34.52, -58.85],
      [-34.52, -58.98],
    ],
  },
  {
    id: "hurlingham",
    name: "Hurlingham",
    type: "partido",
    centroid: { lat: -34.589, lon: -58.634 },
    polygon: [
      [-34.565, -58.665],
      [-34.565, -58.605],
      [-34.615, -58.605],
      [-34.615, -58.665],
    ],
  },
  {
    id: "ituzaingo",
    name: "Ituzaingó",
    type: "partido",
    centroid: { lat: -34.658, lon: -58.675 },
    polygon: [
      [-34.63, -58.705],
      [-34.63, -58.645],
      [-34.69, -58.645],
      [-34.69, -58.705],
    ],
  },
  {
    id: "merlo",
    name: "Merlo",
    type: "partido",
    centroid: { lat: -34.668, lon: -58.728 },
    polygon: [
      [-34.63, -58.78],
      [-34.63, -58.68],
      [-34.72, -58.68],
      [-34.72, -58.78],
    ],
  },
  {
    id: "florencio-varela",
    name: "Florencio Varela",
    type: "partido",
    centroid: { lat: -34.82, lon: -58.28 },
    polygon: [
      [-34.78, -58.33],
      [-34.78, -58.23],
      [-34.87, -58.23],
      [-34.87, -58.33],
    ],
  },
  {
    id: "berazategui",
    name: "Berazategui",
    type: "partido",
    centroid: { lat: -34.76, lon: -58.21 },
    polygon: [
      [-34.72, -58.26],
      [-34.72, -58.17],
      [-34.81, -58.17],
      [-34.81, -58.26],
    ],
  },
  
];

export function getZonesForRegion(regionId: string): Zone[] {
  if (regionId !== "amba") return [];
  return [...CABA_ZONES, ...CONURBANO_ZONES];
}

