import type { PollutantKey } from "@/lib/pollutantHeat";

export type PollutantInfo = {
  key: PollutantKey;
  shortName: string;
  fullName: string;
  description: string;
  commonSources: string;
  whyMonitored: string;
  waqiNote: string;
  visualColor: string;
  ariaLabel: string;
};

export const POLLUTANT_INFO: Record<PollutantKey, PollutantInfo> = {
  pm25: {
    key: "pm25",
    shortName: "PM2.5",
    fullName: "Material particulado fino",
    description:
      "Particulas muy pequenas suspendidas en el aire. Por su tamano pueden permanecer flotando durante mucho tiempo.",
    commonSources: "Combustion, transito, actividad industrial, humo e incendios.",
    whyMonitored: "Se monitorea porque ayuda a entender episodios de humo y contaminacion por particulas finas.",
    waqiNote: "El valor mostrado proviene de la estacion consultada a traves de WAQI.",
    visualColor: "#38bdf8",
    ariaLabel: "Informacion sobre PM2.5, material particulado fino",
  },
  pm10: {
    key: "pm10",
    shortName: "PM10",
    fullName: "Material particulado grueso",
    description:
      "Particulas de mayor tamano que PM2.5, asociadas a polvo y material levantado del suelo o de actividades urbanas.",
    commonSources: "Polvo, obras, calles, transito, actividades industriales y viento sobre suelo seco.",
    whyMonitored: "Se monitorea para observar la presencia de particulas en suspension disponibles en cada estacion.",
    waqiNote: "El valor mostrado proviene de la estacion consultada a traves de WAQI.",
    visualColor: "#f59e0b",
    ariaLabel: "Informacion sobre PM10, material particulado grueso",
  },
  no2: {
    key: "no2",
    shortName: "NO2",
    fullName: "Dioxido de nitrogeno",
    description:
      "Gas vinculado a procesos de combustion. Suele variar cerca de avenidas, zonas con mucho transito o actividad industrial.",
    commonSources: "Motores, transporte pesado, centrales termicas, calderas y algunas industrias.",
    whyMonitored: "Se monitorea como indicador de contaminacion asociada a combustion y movilidad urbana.",
    waqiNote: "El valor mostrado proviene de la estacion consultada a traves de WAQI.",
    visualColor: "#fb7185",
    ariaLabel: "Informacion sobre NO2, dioxido de nitrogeno",
  },
  o3: {
    key: "o3",
    shortName: "O3",
    fullName: "Ozono troposferico",
    description:
      "Ozono a nivel del suelo. No se emite principalmente de forma directa: se forma por reacciones entre contaminantes y luz solar.",
    commonSources: "Reacciones fotoquimicas con oxidos de nitrogeno y compuestos organicos volatiles.",
    whyMonitored: "Se monitorea porque puede aumentar en condiciones de sol y presencia de precursores quimicos.",
    waqiNote: "El valor mostrado proviene de la estacion consultada a traves de WAQI.",
    visualColor: "#a78bfa",
    ariaLabel: "Informacion sobre O3, ozono troposferico",
  },
  so2: {
    key: "so2",
    shortName: "SO2",
    fullName: "Dioxido de azufre",
    description:
      "Gas asociado a la combustion de combustibles con azufre y a ciertas actividades industriales.",
    commonSources: "Industria, generacion de energia, combustibles con azufre y algunos procesos productivos.",
    whyMonitored: "Se monitorea para detectar aportes de combustion e industria cuando hay estaciones disponibles.",
    waqiNote: "El valor mostrado proviene de la estacion consultada a traves de WAQI.",
    visualColor: "#22c55e",
    ariaLabel: "Informacion sobre SO2, dioxido de azufre",
  },
  co: {
    key: "co",
    shortName: "CO",
    fullName: "Monoxido de carbono",
    description:
      "Gas producido por combustion incompleta. Puede aparecer asociado a fuentes de combustion en espacios urbanos o regionales.",
    commonSources: "Transito, calefaccion, incendios, motores y otras combustiones incompletas.",
    whyMonitored: "Se monitorea para observar emisiones de combustion disponibles en las estaciones.",
    waqiNote: "El valor mostrado proviene de la estacion consultada a traves de WAQI.",
    visualColor: "#f97316",
    ariaLabel: "Informacion sobre CO, monoxido de carbono",
  },
};

export function pollutantInfo(key: PollutantKey): PollutantInfo {
  return POLLUTANT_INFO[key];
}
