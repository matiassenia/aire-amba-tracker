// AQI Utilities - Apple Weather inspired colors and contextual messages

import type { AQILevel } from '@/types/airQuality';

/**
 * Apple Weather-inspired soft color palette for AQI ranges
 */
export function getAqiColor(aqi: number): string {
  if (aqi <= 50) return '#4ADE80';      // soft green
  if (aqi <= 100) return '#FBBF24';     // warm amber
  if (aqi <= 150) return '#FB923C';     // soft orange
  if (aqi <= 200) return '#F87171';     // muted red
  if (aqi <= 300) return '#A78BFA';     // soft purple
  return '#7F1D1D';                      // dark maroon
}

/**
 * Returns AQI color with alpha for overlays
 */
export function getAqiColorWithAlpha(aqi: number, alpha: number = 0.6): string {
  const hex = getAqiColor(aqi);
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Spanish labels for AQI levels
 */
export function getAqiLabel(aqi: number): string {
  if (aqi <= 50) return 'Bueno';
  if (aqi <= 100) return 'Moderado';
  if (aqi <= 150) return 'Dañino para sensibles';
  if (aqi <= 200) return 'Dañino';
  if (aqi <= 300) return 'Muy dañino';
  return 'Peligroso';
}

/**
 * Get AQI level enum
 */
export function getAqiLevel(aqi: number): AQILevel {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy-sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

/**
 * Contextual health messages in Spanish - Apple Weather style
 */
export function getContextualMessage(aqi: number): { message: string; emoji: string } {
  if (aqi <= 50) {
    const messages = [
      { message: 'Excelente día para actividades al aire libre', emoji: '🌱' },
      { message: 'El aire está limpio, disfruta el exterior', emoji: '☀️' },
      { message: 'Perfecto para caminar o hacer ejercicio', emoji: '🚶' },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  if (aqi <= 100) {
    const messages = [
      { message: 'Buen día para salir, modera el ejercicio intenso', emoji: '👍' },
      { message: 'Calidad aceptable para la mayoría', emoji: '🌤️' },
      { message: 'Disfruta el día, evita esfuerzos prolongados', emoji: '🚴' },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  if (aqi <= 150) {
    const messages = [
      { message: 'Grupos sensibles deben limitar actividades', emoji: '⚠️' },
      { message: 'Considera reducir tiempo al aire libre', emoji: '🏃' },
      { message: 'Niños y adultos mayores: precaución', emoji: '👶' },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  if (aqi <= 200) {
    const messages = [
      { message: 'Evita actividades prolongadas afuera', emoji: '🏠' },
      { message: 'Mejor quedarse en interiores', emoji: '🚪' },
      { message: 'Limita la exposición al aire libre', emoji: '😷' },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  const messages = [
    { message: 'Permanece en interiores', emoji: '🚨' },
    { message: 'Calidad del aire peligrosa', emoji: '⛔' },
    { message: 'Evita cualquier actividad al aire libre', emoji: '🏥' },
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get confidence level based on distance to nearest stations
 */
export function getConfidenceLevel(
  nearestStationDistance: number
): 'high' | 'medium' | 'low' {
  if (nearestStationDistance < 3) return 'high';
  if (nearestStationDistance < 8) return 'medium';
  return 'low';
}

/**
 * Get confidence label in Spanish
 */
export function getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'Alta precisión';
    case 'medium': return 'Precisión media';
    case 'low': return 'Estimación aproximada';
  }
}

/**
 * Format pollutant name for display
 */
export function formatPollutant(pol: string): string {
  const names: Record<string, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    o3: 'Ozono',
    no2: 'NO₂',
    co: 'CO',
    so2: 'SO₂',
  };
  return names[pol] || pol.toUpperCase();
}

/**
 * AQI Legend data for the bottom bar
 */
export const AQI_LEGEND = [
  { range: '0-50', label: 'Bueno', color: '#4ADE80' },
  { range: '51-100', label: 'Moderado', color: '#FBBF24' },
  { range: '101-150', label: 'Sensibles', color: '#FB923C' },
  { range: '151-200', label: 'Dañino', color: '#F87171' },
  { range: '201-300', label: 'Muy dañino', color: '#A78BFA' },
  { range: '300+', label: 'Peligroso', color: '#7F1D1D' },
];
