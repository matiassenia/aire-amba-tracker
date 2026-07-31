// Escala de color e intensidad para el heatmap, fuente única para:
//   - categorías AQI (absolutas);
//   - color de categoría;
//   - peso visual perceptual;
//   - leyenda y gradiente.
//
// Dos ejes separados a propósito:
//
//   1. CATEGORÍA AQI (absoluta). Clasifica riesgo por cortes fijos que no
//      dependen del conjunto de estaciones visible:
//        0–50 Bueno · 51–100 Moderado · 101–150 Dañino para grupos sensibles
//        151–200 Dañino · 201–300 Muy dañino · 301+ Peligroso
//
//   2. PESO VISUAL PERCEPTUAL. Decide qué tan visible es el kernel térmico.
//      No clasifica riesgo: solo visibilidad. Es determinista, depende
//      únicamente del AQI absoluto y nunca supera 1.
//
// Los stops del gradiente se posicionan con la MISMA transformación usada
// para el peso visual, de modo que un punto con AQI exactamente en un corte
// renderice exactamente el color de su categoría.

export type AqiCategory = {
  min: number;
  max: number;
  label: string;
  color: string;
};

export type AqiHeatStop = {
  at: number;
  color: string;
};

export const AQI_HEAT_MAX = 300;

// Cortes AQI que definen las categorías sanitarias.
export const AQI_BREAKPOINTS: readonly number[] = [0, 50, 100, 150, 200, 300] as const;

const AQI_CATEGORY_COLORS = [
  "#22c55e", // Bueno
  "#eab308", // Moderado
  "#f97316", // Sensibles
  "#ef4444", // Dañino
  "#a855f7", // Muy dañino
  "#ec4899", // Peligroso
] as const;

// Categorías absolutas: la clasificación no depende del conjunto visible.
export const AQI_CATEGORIES: readonly AqiCategory[] = [
  { min: 0, max: 50, label: "Bueno", color: AQI_CATEGORY_COLORS[0] },
  { min: 51, max: 100, label: "Moderado", color: AQI_CATEGORY_COLORS[1] },
  { min: 101, max: 150, label: "Dañino para grupos sensibles", color: AQI_CATEGORY_COLORS[2] },
  { min: 151, max: 200, label: "Dañino", color: AQI_CATEGORY_COLORS[3] },
  { min: 201, max: 300, label: "Muy dañino", color: AQI_CATEGORY_COLORS[4] },
  { min: 301, max: Infinity, label: "Peligroso", color: AQI_CATEGORY_COLORS[5] },
] as const;

export function aqiCategory(value: number): AqiCategory {
  if (!Number.isFinite(value) || value < AQI_CATEGORIES[0].min) return AQI_CATEGORIES[0];
  for (const category of AQI_CATEGORIES) {
    if (value <= category.max) return category;
  }
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

export function aqiLabel(value: number): string {
  return aqiCategory(value).label;
}

export function aqiColor(value: number): string {
  return aqiCategory(value).color;
}

// Curva perceptual de visibilidad.
//
// Justificación frente a la antigua `value / 300`:
// - Con valores reales bajos (CO 6.2, PM10 22) la antigua fórmula daba
//   intensidades de 0.02–0.07, imperceptibles para leaflet.heat con
//   minOpacity 0.06: la superficie térmica no aparecía.
// - base 0.22: garantiza que un valor bajo dibuje un kernel visible pero
//   tenue sobre el basemap oscuro.
// - exponente 0.45 < 1: comprime el rango alto y expande el bajo, de modo
//   que los valores bajos/medios se distinguen entre sí y 300+ satura en 1.
// - span 0.78 + base 0.22 = 1 para normalized = 1: nunca supera 1.
// - Es monotónica y determinista: el mismo AQI produce el mismo peso en
//   cualquier conjunto de estaciones.
export function aqiToVisualHeatWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.min(Math.max(value, 0), AQI_HEAT_MAX) / AQI_HEAT_MAX;
  return 0.22 + 0.78 * Math.pow(normalized, 0.45);
}

// Los stops del gradiente se alinean con el peso visual de cada corte AQI:
// cada región de color corresponde a una categoría sanitaria y la posición
// usa la misma curva que aqiToVisualHeatWeight.
export const AQI_HEAT_STOPS: readonly AqiHeatStop[] = AQI_BREAKPOINTS.map((at, index) => ({
  at: aqiToVisualHeatWeight(at),
  color: AQI_CATEGORY_COLORS[index],
}));

export const AQI_HEAT_GRADIENT: Record<number, string> = Object.fromEntries(
  AQI_HEAT_STOPS.map((stop) => [stop.at, stop.color]),
);

export const AQI_HEAT_LEGEND: readonly { label: string; color: string }[] = AQI_CATEGORIES.map(
  (category) => ({ label: category.label, color: category.color }),
);

export function aqiHeatGradientCss(direction = "to right"): string {
  const stops = AQI_HEAT_STOPS.map(
    (stop) => `${stop.color} ${Math.round(stop.at * 100)}%`,
  ).join(", ");
  return `linear-gradient(${direction}, ${AQI_HEAT_STOPS[0].color} 0%, ${stops})`;
}
