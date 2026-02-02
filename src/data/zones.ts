// Zone data for CABA Comunas and Conurbano Partidos
import type { Zone } from '@/types/airQuality';

// CABA Comunas - Simplified polygons (approximate boundaries)
export const CABA_ZONES: Zone[] = [
  {
    id: 'comuna-1',
    name: 'Comuna 1',
    type: 'comuna',
    centroid: { lat: -34.6083, lon: -58.3712 },
    polygon: [
      [-34.5950, -58.3850],
      [-34.5950, -58.3550],
      [-34.6250, -58.3550],
      [-34.6250, -58.3850],
    ],
  },
  {
    id: 'comuna-2',
    name: 'Comuna 2',
    type: 'comuna',
    centroid: { lat: -34.5875, lon: -58.3935 },
    polygon: [
      [-34.5750, -58.4050],
      [-34.5750, -58.3800],
      [-34.6000, -58.3800],
      [-34.6000, -58.4050],
    ],
  },
  {
    id: 'comuna-3',
    name: 'Comuna 3',
    type: 'comuna',
    centroid: { lat: -34.6120, lon: -58.4100 },
    polygon: [
      [-34.5980, -58.4200],
      [-34.5980, -58.3950],
      [-34.6260, -58.3950],
      [-34.6260, -58.4200],
    ],
  },
  {
    id: 'comuna-4',
    name: 'Comuna 4',
    type: 'comuna',
    centroid: { lat: -34.6400, lon: -58.3800 },
    polygon: [
      [-34.6200, -58.3950],
      [-34.6200, -58.3550],
      [-34.6600, -58.3550],
      [-34.6600, -58.3950],
    ],
  },
  {
    id: 'comuna-5',
    name: 'Comuna 5',
    type: 'comuna',
    centroid: { lat: -34.6100, lon: -58.4300 },
    polygon: [
      [-34.5950, -58.4450],
      [-34.5950, -58.4150],
      [-34.6250, -58.4150],
      [-34.6250, -58.4450],
    ],
  },
  {
    id: 'comuna-6',
    name: 'Comuna 6',
    type: 'comuna',
    centroid: { lat: -34.6175, lon: -58.4400 },
    polygon: [
      [-34.6050, -58.4550],
      [-34.6050, -58.4250],
      [-34.6300, -58.4250],
      [-34.6300, -58.4550],
    ],
  },
  {
    id: 'comuna-7',
    name: 'Comuna 7',
    type: 'comuna',
    centroid: { lat: -34.6350, lon: -58.4550 },
    polygon: [
      [-34.6200, -58.4700],
      [-34.6200, -58.4400],
      [-34.6500, -58.4400],
      [-34.6500, -58.4700],
    ],
  },
  {
    id: 'comuna-8',
    name: 'Comuna 8',
    type: 'comuna',
    centroid: { lat: -34.6700, lon: -58.4650 },
    polygon: [
      [-34.6500, -58.4850],
      [-34.6500, -58.4450],
      [-34.6900, -58.4450],
      [-34.6900, -58.4850],
    ],
  },
  {
    id: 'comuna-9',
    name: 'Comuna 9',
    type: 'comuna',
    centroid: { lat: -34.6550, lon: -58.4950 },
    polygon: [
      [-34.6350, -58.5150],
      [-34.6350, -58.4750],
      [-34.6750, -58.4750],
      [-34.6750, -58.5150],
    ],
  },
  {
    id: 'comuna-10',
    name: 'Comuna 10',
    type: 'comuna',
    centroid: { lat: -34.6350, lon: -58.5100 },
    polygon: [
      [-34.6150, -58.5300],
      [-34.6150, -58.4900],
      [-34.6550, -58.4900],
      [-34.6550, -58.5300],
    ],
  },
  {
    id: 'comuna-11',
    name: 'Comuna 11',
    type: 'comuna',
    centroid: { lat: -34.6100, lon: -58.5050 },
    polygon: [
      [-34.5900, -58.5250],
      [-34.5900, -58.4850],
      [-34.6300, -58.4850],
      [-34.6300, -58.5250],
    ],
  },
  {
    id: 'comuna-12',
    name: 'Comuna 12',
    type: 'comuna',
    centroid: { lat: -34.5650, lon: -58.4900 },
    polygon: [
      [-34.5450, -58.5100],
      [-34.5450, -58.4700],
      [-34.5850, -58.4700],
      [-34.5850, -58.5100],
    ],
  },
  {
    id: 'comuna-13',
    name: 'Comuna 13',
    type: 'comuna',
    centroid: { lat: -34.5550, lon: -58.4550 },
    polygon: [
      [-34.5350, -58.4750],
      [-34.5350, -58.4350],
      [-34.5750, -58.4350],
      [-34.5750, -58.4750],
    ],
  },
  {
    id: 'comuna-14',
    name: 'Comuna 14',
    type: 'comuna',
    centroid: { lat: -34.5750, lon: -58.4250 },
    polygon: [
      [-34.5550, -58.4450],
      [-34.5550, -58.4050],
      [-34.5950, -58.4050],
      [-34.5950, -58.4450],
    ],
  },
  {
    id: 'comuna-15',
    name: 'Comuna 15',
    type: 'comuna',
    centroid: { lat: -34.5900, lon: -58.4650 },
    polygon: [
      [-34.5700, -58.4850],
      [-34.5700, -58.4450],
      [-34.6100, -58.4450],
      [-34.6100, -58.4850],
    ],
  },
];

// Conurbano Partidos - Key municipalities
export const CONURBANO_ZONES: Zone[] = [
  {
    id: 'avellaneda',
    name: 'Avellaneda',
    type: 'partido',
    centroid: { lat: -34.6621, lon: -58.3656 },
    polygon: [
      [-34.6400, -58.3900],
      [-34.6400, -58.3400],
      [-34.6850, -58.3400],
      [-34.6850, -58.3900],
    ],
  },
  {
    id: 'lanus',
    name: 'Lanús',
    type: 'partido',
    centroid: { lat: -34.7065, lon: -58.3926 },
    polygon: [
      [-34.6850, -58.4150],
      [-34.6850, -58.3700],
      [-34.7280, -58.3700],
      [-34.7280, -58.4150],
    ],
  },
  {
    id: 'quilmes',
    name: 'Quilmes',
    type: 'partido',
    centroid: { lat: -34.7203, lon: -58.2545 },
    polygon: [
      [-34.6900, -58.2900],
      [-34.6900, -58.2200],
      [-34.7500, -58.2200],
      [-34.7500, -58.2900],
    ],
  },
  {
    id: 'lomas-zamora',
    name: 'Lomas de Zamora',
    type: 'partido',
    centroid: { lat: -34.7592, lon: -58.4006 },
    polygon: [
      [-34.7280, -58.4300],
      [-34.7280, -58.3700],
      [-34.7900, -58.3700],
      [-34.7900, -58.4300],
    ],
  },
  {
    id: 'san-isidro',
    name: 'San Isidro',
    type: 'partido',
    centroid: { lat: -34.4708, lon: -58.5278 },
    polygon: [
      [-34.4400, -58.5600],
      [-34.4400, -58.4950],
      [-34.5000, -58.4950],
      [-34.5000, -58.5600],
    ],
  },
  {
    id: 'vicente-lopez',
    name: 'Vicente López',
    type: 'partido',
    centroid: { lat: -34.5252, lon: -58.4729 },
    polygon: [
      [-34.5000, -58.5000],
      [-34.5000, -58.4450],
      [-34.5500, -58.4450],
      [-34.5500, -58.5000],
    ],
  },
  {
    id: 'tigre',
    name: 'Tigre',
    type: 'partido',
    centroid: { lat: -34.4260, lon: -58.5797 },
    polygon: [
      [-34.3800, -58.6200],
      [-34.3800, -58.5400],
      [-34.4700, -58.5400],
      [-34.4700, -58.6200],
    ],
  },
  {
    id: 'la-matanza',
    name: 'La Matanza',
    type: 'partido',
    centroid: { lat: -34.6854, lon: -58.5591 },
    polygon: [
      [-34.6500, -58.6200],
      [-34.6500, -58.5000],
      [-34.7200, -58.5000],
      [-34.7200, -58.6200],
    ],
  },
  {
    id: 'moron',
    name: 'Morón',
    type: 'partido',
    centroid: { lat: -34.6506, lon: -58.6197 },
    polygon: [
      [-34.6200, -58.6500],
      [-34.6200, -58.5900],
      [-34.6800, -58.5900],
      [-34.6800, -58.6500],
    ],
  },
  {
    id: 'tres-febrero',
    name: 'Tres de Febrero',
    type: 'partido',
    centroid: { lat: -34.6062, lon: -58.5644 },
    polygon: [
      [-34.5800, -58.5950],
      [-34.5800, -58.5350],
      [-34.6320, -58.5350],
      [-34.6320, -58.5950],
    ],
  },
  {
    id: 'san-martin',
    name: 'San Martín',
    type: 'partido',
    centroid: { lat: -34.5761, lon: -58.5356 },
    polygon: [
      [-34.5500, -58.5650],
      [-34.5500, -58.5050],
      [-34.6020, -58.5050],
      [-34.6020, -58.5650],
    ],
  },
  {
    id: 'almirante-brown',
    name: 'Almirante Brown',
    type: 'partido',
    centroid: { lat: -34.8167, lon: -58.3833 },
    polygon: [
      [-34.7800, -58.4200],
      [-34.7800, -58.3450],
      [-34.8550, -58.3450],
      [-34.8550, -58.4200],
    ],
  },
];

/**
 * Get all zones for a given scope
 */
export function getZonesForScope(scope: 'caba' | 'conurbano' | 'amba'): Zone[] {
  switch (scope) {
    case 'caba':
      return CABA_ZONES;
    case 'conurbano':
      return CONURBANO_ZONES;
    case 'amba':
      return [...CABA_ZONES, ...CONURBANO_ZONES];
  }
}

/**
 * Map bounds for each scope
 */
export const SCOPE_BOUNDS = {
  caba: {
    center: { lat: -34.6037, lon: -58.3816 } as const,
    zoom: 12,
  },
  conurbano: {
    center: { lat: -34.65, lon: -58.45 } as const,
    zoom: 11,
  },
  amba: {
    center: { lat: -34.62, lon: -58.44 } as const,
    zoom: 10,
  },
};
