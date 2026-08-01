// Contenido editorial de la guía "¿Qué muestra este mapa?".
//
// Estructura por niveles (UX de contenido):
//   1. resumen de una o dos líneas (summary);
//   2. accordion por tema (cada sección);
//   3. cuadros comparativos y metodología (dentro de los temas).
//
// Tono editorial: público general, sin alarmismo, diferenciando hechos
// medidos, posibles causas, efectos posibles, estimaciones y limitaciones
// del sistema. El contenido nunca afirma causas concretas ni diagnósticos.

import type { PollutantKey } from "@/lib/pollutantHeat";
import { AQI_CATEGORIES } from "@/lib/aqiHeatScale";

// ---------------------------------------------------------------------------
// Categorías editoriales usadas como etiquetas en la guía.
// ---------------------------------------------------------------------------

export type GuideCategory = "fact" | "cause" | "effect" | "estimation" | "limit";

export const GUIDE_CATEGORIES: { key: GuideCategory; label: string; dot: string }[] = [
  { key: "fact", label: "Hecho medido", dot: "#38bdf8" },
  { key: "cause", label: "Posible causa", dot: "#fbbf24" },
  { key: "effect", label: "Efecto posible", dot: "#fb923c" },
  { key: "estimation", label: "Estimación visual", dot: "#c084fc" },
  { key: "limit", label: "Limitación del sistema", dot: "#94a3b8" },
];

export const GUIDE_CATEGORY_LABEL: Record<GuideCategory, string> = Object.fromEntries(
  GUIDE_CATEGORIES.map((category) => [category.key, category.label]),
) as Record<GuideCategory, string>;

// ---------------------------------------------------------------------------
// Sección general: ¿qué muestra este mapa?
// ---------------------------------------------------------------------------

export type GuideSubsection = { title: string; body: string };

export const MAP_GUIDE = {
  title: "¿Qué muestra este mapa?",
  summary:
    "Puntos de estaciones reales y manchas de color estimadas entre ellas. Las zonas sin color no significan aire limpio.",
  intro:
    "Esta plataforma reúne datos de estaciones de monitoreo de calidad del aire. Cada estación informa valores para uno o más contaminantes.\n\nLos puntos representan estaciones reales. Las manchas térmicas son una interpolación visual construida a partir de las estaciones disponibles.\n\nEl mapa no mide directamente cada calle, barrio o municipio. Una zona sin color no significa necesariamente aire limpio: puede significar que no existen estaciones cercanas o que los datos están desactualizados.",
  subsections: [
    {
      title: "Qué es una estación de monitoreo",
      body: "Una estación de monitoreo es un punto fijo donde un instrumento mide la concentración de uno o más contaminantes en el aire. En este mapa cada estación aparece como un punto. Lo que muestra corresponde al lugar donde está instalado el sensor, y no representa automáticamente a todo el barrio, la ciudad o la provincia.",
    },
    {
      title: "Qué es un índice AQI",
      body: "AQI significa índice de calidad del aire: un número que resume el nivel de un contaminante en una escala única, de «Bueno» a «Peligroso». Cada contaminante tiene su propia escala de índice. Este mapa muestra el índice del contaminante seleccionado en cada estación.",
    },
    {
      title: "Qué es una interpolación",
      body: "La interpolación es una estimación visual: entre dos o más estaciones se dibuja una transición de color que supone que el valor cambia de forma gradual. Es una herramienta para leer el mapa, no una medición real en cada punto del camino.",
    },
    {
      title: "Qué significa cobertura",
      body: "La cobertura describe qué tan cerca está la estación más útil a una ubicación consultada. Cobertura alta: hay una estación cercana con datos frescos. Cobertura baja o nula: la estación más cercana está lejos o no tiene datos útiles, y el dato pierde representatividad.",
    },
    {
      title: "Qué significa frescura del dato",
      body: "La frescura indica la antigüedad de la medición. Un dato reciente (menos de unas horas) puede representar el aire actual. Un dato antiguo (más de 24 horas) probablemente no. Las estaciones con datos desactualizados se marcan con un aviso y no dibujan color.",
    },
    {
      title: "Qué no puede concluirse a partir del mapa",
      body: "El mapa no muestra la calidad del aire de cada calle, no identifica la fuente de un contaminante, no define en términos absolutos si el aire es «seguro» o «peligroso» y no reemplaza un informe oficial, un diagnóstico médico ni un estudio ambiental. Una zona sin color no es prueba de aire limpio.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Sección: ¿de qué consta la plataforma?
// ---------------------------------------------------------------------------

export const PLATFORM_COMPONENTS = {
  title: "¿De qué consta la plataforma?",
  summary: "Cinco elementos: estaciones reales, valores, fecha, distancia y la visualización térmica.",
  intro: "La representación se construye con cinco elementos principales:",
  items: [
    {
      title: "Estaciones reales",
      body: "Los puntos del mapa. Cada uno representa un sensor instalado en un lugar concreto y reporta los valores que mide en ese punto.",
    },
    {
      title: "Valores informados por contaminante",
      body: "Para cada estación, los niveles de PM2.5, PM10, NO₂, O₃, SO₂ o CO que esa estación informa. No todas las estaciones miden todos los contaminantes.",
    },
    {
      title: "Fecha y hora de medición",
      body: "El momento en que se registró el valor. Se usa para avisar cuándo un dato es reciente, está envejeciendo o está desactualizado.",
    },
    {
      title: "Distancia entre estaciones y la ubicación consultada",
      body: "La cercanía entre una estación y el lugar que se quiere conocer. Determina qué tan representativo puede ser un dato para esa zona.",
    },
    {
      title: "Visualización térmica interpolada",
      body: "Las manchas de color que estiman cómo podría variar el valor entre estaciones. Es una estimación visual, no una medición directa.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Cuadro comparativo: medición directa vs. interpolación vs. sin cobertura.
// ---------------------------------------------------------------------------

export type GuideTableColumn = { key: string; label: string };
export type GuideTableRow = Record<string, string>;

export const DIRECT_VS_INTERPOLATION: {
  title: string;
  summary: string;
  columns: GuideTableColumn[];
  rows: GuideTableRow[];
} = {
  title: "Medición directa vs. interpolación vs. sin cobertura",
  summary: "Cómo se relaciona cada tipo de información con la realidad y cómo se muestra en el mapa.",
  columns: [
    { key: "type", label: "Tipo de información" },
    { key: "meaning", label: "Qué significa" },
    { key: "precision", label: "Nivel de precisión" },
    { key: "shown", label: "Cómo se muestra" },
    { key: "limit", label: "Limitación principal" },
  ],
  rows: [
    {
      type: "Medición directa",
      meaning: "Existe una estación cercana y el valor corresponde al punto donde está instalado el sensor.",
      precision: "Precisión local relativamente alta.",
      shown: "Se muestra con un marcador (punto).",
      limit: "No representa automáticamente a todo el barrio.",
    },
    {
      type: "Interpolación",
      meaning: "Se estima una superficie de valores entre estaciones.",
      precision: "La precisión disminuye con la distancia a la estación más cercana.",
      shown: "Se muestra como mancha térmica (heatmap).",
      limit: "No es una medición directa: es una estimación visual.",
    },
    {
      type: "Baja cobertura",
      meaning: "La estación más cercana está lejos del lugar consultado.",
      precision: "El dato puede no representar las condiciones locales.",
      shown: "Se muestra con un aviso de cobertura baja.",
      limit: "No debe interpretarse como medición local.",
    },
    {
      type: "Sin cobertura",
      meaning: "No hay estaciones recientes o útiles dentro del radio definido.",
      precision: "No hay estimación confiable.",
      shown: "La zona queda transparente en el mapa.",
      limit: "Transparencia no significa aire limpio.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Qué puede salir bien.
// ---------------------------------------------------------------------------

export const GOOD_THINGS = {
  title: "¿Qué aporta una plataforma como esta?",
  summary: "Ayuda a ver mediciones dispersas, patrones y zonas sin datos. No reemplaza informes oficiales.",
  items: [
    "Facilita visualizar mediciones dispersas en un solo mapa.",
    "Permite identificar qué estaciones y qué contaminantes están disponibles en cada zona.",
    "Ayuda a detectar patrones espaciales, como zonas con más tránsito o actividad industrial.",
    "Muestra la antigüedad y la cobertura de cada dato.",
    "Evita interpretar datos viejos como actuales.",
    "Permite comunicar zonas sin medición, en lugar de ocultarlas.",
    "Puede servir como apoyo educativo y exploratorio.",
  ],
  disclaimer:
    "No reemplaza informes oficiales, diagnósticos médicos ni estudios ambientales especializados.",
};

// ---------------------------------------------------------------------------
// Qué puede salir mal: errores de interpretación.
// ---------------------------------------------------------------------------

export type Misconception = { title: string; body: string };

export const MISCONCEPTIONS = {
  title: "¿Qué limitaciones o errores de interpretación deben evitarse?",
  summary: "Diez errores comunes al leer el mapa, con una aclaración breve para cada uno.",
  items: [
    {
      title: "Confundir interpolación con medición directa",
      body: "La mancha de color entre estaciones es una estimación visual, no un valor medido en cada punto.",
    },
    {
      title: "Interpretar una zona transparente como aire limpio",
      body: "La transparencia indica falta de estaciones cercanas con datos, no ausencia de contaminación.",
    },
    {
      title: "Usar una estación lejana como representación exacta de un municipio",
      body: "Una estación mide el aire en su punto; cuanto más lejos, menos representativa es.",
    },
    {
      title: "Ignorar la antigüedad del dato",
      body: "Un valor de hace más de un día no describe el aire actual.",
    },
    {
      title: "Comparar índices y concentraciones como si fueran iguales",
      body: "El índice AQI es una escala resumida; la concentración es la medida original. No son lo mismo.",
    },
    {
      title: "Mezclar fuentes con unidades incompatibles",
      body: "Distintas fuentes pueden usar unidades o criterios distintos; los valores no deben sumarse ni compararse directamente.",
    },
    {
      title: "Atribuir una causa concreta sin datos de emisiones, viento o actividad industrial",
      body: "El mapa muestra valores, no causas: no tiene esa información adicional.",
    },
    {
      title: "Exagerar la precisión del heatmap",
      body: "El color entre estaciones se amplifica visualmente para la lectura; no mide cada calle.",
    },
    {
      title: "Interpretar un color como diagnóstico sanitario individual",
      body: "El mapa informa tendencias del aire, no diagnósticos ni recomendaciones médicas.",
    },
    {
      title: "Suponer que toda Argentina tiene cobertura equivalente",
      body: "La densidad de estaciones varía: hay zonas con varias estaciones y zonas sin ninguna.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Cuadro comparativo de contaminantes.
// ---------------------------------------------------------------------------

export const POLLUTANT_COMPARISON: {
  title: string;
  summary: string;
  columns: GuideTableColumn[];
  rows: GuideTableRow[];
} = {
  title: "Comparación de contaminantes",
  summary: "Los seis contaminantes del mapa, resumidos para compararlos de un vistazo.",
  columns: [
    { key: "sigla", label: "Sigla" },
    { key: "nombre", label: "Nombre" },
    { key: "tipo", label: "Tipo" },
    { key: "fuentes", label: "Fuentes habituales" },
    { key: "efecto", label: "Efecto principal" },
    { key: "particularidad", label: "Particularidad" },
  ],
  rows: [
    {
      sigla: "PM2.5",
      nombre: "Partículas finas",
      tipo: "Material particulado",
      fuentes: "Combustión, tránsito, incendios",
      efecto: "Penetración profunda en los pulmones",
      particularidad: "Tamaño muy pequeño",
    },
    {
      sigla: "PM10",
      nombre: "Partículas gruesas",
      tipo: "Material particulado",
      fuentes: "Polvo, construcción, tránsito",
      efecto: "Irritación respiratoria",
      particularidad: "Mayor tamaño que PM2.5",
    },
    {
      sigla: "NO₂",
      nombre: "Dióxido de nitrógeno",
      tipo: "Gas",
      fuentes: "Motores y combustión",
      efecto: "Irritación respiratoria",
      particularidad: "Asociado al tránsito",
    },
    {
      sigla: "O₃",
      nombre: "Ozono troposférico",
      tipo: "Gas secundario",
      fuentes: "Reacciones fotoquímicas",
      efecto: "Irritación pulmonar",
      particularidad: "No suele emitirse directamente",
    },
    {
      sigla: "SO₂",
      nombre: "Dióxido de azufre",
      tipo: "Gas",
      fuentes: "Combustibles con azufre e industria",
      efecto: "Irritación respiratoria",
      particularidad: "Puede formar partículas secundarias",
    },
    {
      sigla: "CO",
      nombre: "Monóxido de carbono",
      tipo: "Gas",
      fuentes: "Combustión incompleta",
      efecto: "Reduce el transporte de oxígeno",
      particularidad: "Puede ser peligroso en espacios cerrados",
    },
  ],
};

// ---------------------------------------------------------------------------
// Cobertura y frescura.
// ---------------------------------------------------------------------------

export const COVERAGE_FRESHNESS = {
  title: "Cobertura y frescura del dato",
  summary: "Qué significan los puntos, los halos y los avisos de datos antiguos.",
  items: [
    {
      title: "Cobertura",
      body: "Es la cercanía de la estación más útil a la ubicación consultada. El mapa usa tres niveles: alta (menos de 5 km con dato fresco), media (entre 5 y 20 km) y baja o nula (más de 20 km o sin dato útil).",
    },
    {
      title: "Confianza según distancia",
      body: "Cuanto más cerca esté la estación, más confiable es el dato para ese lugar. A más de 20 km, el valor puede no representar las condiciones locales.",
    },
    {
      title: "Frescura",
      body: "Un dato se considera reciente si tiene menos de 6 horas, envejecido entre 6 y 24 horas, y desactualizado a partir de 24 horas. Solo los datos recientes cuentan para las manchas de color.",
    },
    {
      title: "Cómo se ve en el mapa",
      body: "Las estaciones con dato fresco dibujan su halo. Las estaciones con datos viejos se marcan con un aviso de antigüedad y no dibujan color. Las zonas sin estaciones cercanas quedan transparentes.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Metodología: cómo se construyen los colores.
// ---------------------------------------------------------------------------

export const METHODOLOGY = {
  title: "¿Cómo se construyen los colores del mapa?",
  summary: "Ocho pasos: del valor informado por las estaciones a la mancha de color.",
  steps: [
    "Se toma el contaminante seleccionado.",
    "Se descartan las estaciones sin un valor válido para ese contaminante.",
    "Se evalúa la frescura de cada dato.",
    "Se excluyen del color los datos demasiado antiguos (más de 24 horas).",
    "Se transforma el índice AQI en una intensidad visual.",
    "Se dibujan halos alrededor de las estaciones.",
    "La intensidad disminuye con la distancia a la estación.",
    "Las zonas sin cobertura quedan transparentes.",
  ],
  note: "La intensidad visual se amplifica para facilitar la lectura, pero la categoría AQI continúa correspondiendo al valor informado.",
};

// ---------------------------------------------------------------------------
// Glosario.
// ---------------------------------------------------------------------------

export const GLOSSARY = {
  title: "Glosario",
  summary: "Términos usados en la plataforma, explicados sin tecnicismos.",
  entries: [
    {
      term: "AQI (índice de calidad del aire)",
      definition:
        "Número que resume el nivel de un contaminante en una escala de «Bueno» a «Peligroso». Cada contaminante tiene su propia escala.",
    },
    {
      term: "Estación de monitoreo",
      definition:
        "Punto fijo donde un sensor mide la concentración de uno o más contaminantes. Se muestra como punto en el mapa.",
    },
    {
      term: "Contaminante",
      definition:
        "Sustancia presente en el aire en concentraciones que pueden afectar la salud o el ambiente. En esta plataforma: PM2.5, PM10, NO₂, O₃, SO₂ y CO.",
    },
    {
      term: "Concentración",
      definition:
        "Cantidad de contaminante por unidad de aire. Es la medida original que produce un sensor.",
    },
    {
      term: "Índice (AQI)",
      definition:
        "Escala que convierte la concentración en una categoría legible. No es lo mismo que la concentración.",
    },
    {
      term: "Interpolación",
      definition:
        "Estimación visual del valor entre dos o más estaciones. Es una herramienta de lectura, no una medición directa.",
    },
    {
      term: "Heatmap (mancha térmica)",
      definition:
        "Representación en color de una interpolación. En este mapa, las manchas de color entre estaciones.",
    },
    {
      term: "Cobertura",
      definition:
        "Qué tan cerca está la estación más útil a una ubicación. Determina qué tan representativo puede ser un dato.",
    },
    {
      term: "Frescura del dato",
      definition:
        "Antigüedad de la medición. Los datos viejos se marcan con un aviso y no dibujan color.",
    },
    {
      term: "WAQI",
      definition:
        "Fuente de datos de esta plataforma. Reúne y publica mediciones de estaciones oficiales y de monitoreo colaborativo.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Sección WAQI: qué es, cómo se interpretan sus índices y de dónde vienen
// los datos de esta plataforma.
// ---------------------------------------------------------------------------

export const WAQI_GUIDE = {
  title: "¿Qué es WAQI y cómo se interpretan sus índices?",
  summary:
    "WAQI reúne mediciones publicadas por redes de monitoreo y las presenta con índices y colores. AQI es el índice de calidad del aire.",
  execSummary:
    "WAQI es una plataforma global que reúne datos publicados por redes de monitoreo de calidad del aire y los presenta mediante índices y colores fáciles de interpretar.",
  clarification:
    "WAQI no necesariamente opera cada estación. Recopila y publica datos provenientes de organismos, redes y proveedores externos.",
};

export const AQI_SCALE_GUIDE = {
  title: "¿Cómo funciona el índice de calidad del aire?",
  paragraphs: [
    "El índice de calidad del aire transforma valores técnicos de contaminación en una escala numérica y visual más fácil de entender.",
    "En términos generales:",
  ],
  bullets: [
    "un número más bajo representa menor contaminación",
    "un número más alto representa mayor contaminación",
    "cada rango se asocia a un color y a una categoría",
    "la categoría informa un nivel general de calidad del aire y posibles precauciones",
  ],
};

// Nombres de color descriptivos por categoría. El color real proviene de
// AQI_CATEGORIES (aqiHeatScale.ts): aquí solo se traduce a palabras.
const AQI_COLOR_NAMES: Record<string, string> = {
  Bueno: "Verde",
  Moderado: "Amarillo",
  "Dañino para grupos sensibles": "Naranja",
  Dañino: "Rojo",
  "Muy dañino": "Púrpura",
  Peligroso: "Magenta o color configurado por la plataforma",
};

const AQI_SCALE_INTERPRETATIONS: Record<string, string> = {
  Bueno: "Calidad del aire satisfactoria.",
  Moderado: "Aceptable para la mayoría.",
  "Dañino para grupos sensibles": "Mayor precaución para personas sensibles.",
  Dañino: "Puede afectar a la población general.",
  "Muy dañino": "Condiciones de alerta sanitaria.",
  Peligroso: "Condiciones de emergencia.",
};

export type AqiScaleRow = {
  rango: string;
  color: string;
  colorName: string;
  categoria: string;
  interpretacion: string;
};

export const AQI_SCALE_COLUMNS: GuideTableColumn[] = [
  { key: "rango", label: "Rango" },
  { key: "color", label: "Color" },
  { key: "categoria", label: "Categoría" },
  { key: "interpretacion", label: "Interpretación breve" },
];

// La tabla de escala AQI se deriva de AQI_CATEGORIES: rango, categoría y
// color salen de la fuente única de categorías, sin duplicar la paleta.
export const AQI_SCALE_ROWS: AqiScaleRow[] = AQI_CATEGORIES.map((category) => ({
  rango: category.max === Infinity ? `${category.min}+` : `${category.min}–${category.max}`,
  color: category.color,
  colorName: AQI_COLOR_NAMES[category.label] ?? category.label,
  categoria: category.label,
  interpretacion: AQI_SCALE_INTERPRETATIONS[category.label] ?? "",
}));

export const DOMINANT_POLLUTANT = {
  title: "¿Qué significa contaminante dominante?",
  summary:
    "El índice general puede estar determinado por el contaminante con la situación más desfavorable dentro de la escala aplicada.",
  body: "Una estación puede informar varios contaminantes al mismo tiempo. El índice general puede estar determinado por el contaminante que presenta la situación más desfavorable dentro de la escala aplicada.\n\nEse contaminante suele denominarse contaminante dominante.\n\nEn este mapa también se puede seleccionar cada contaminante por separado para observar su índice individual.",
  disclaimer: "La metodología exacta puede variar entre fuentes y organismos.",
};

export const INDEX_VS_CONCENTRATION = {
  title: "AQI no es lo mismo que concentración",
  summary:
    "El índice es una escala interpretativa construida a partir de una medición física; la concentración es la medida original.",
  body: [
    "Una concentración es una cantidad física medida por un sensor, por ejemplo microgramos por metro cúbico.",
    "El AQI es una escala interpretativa construida a partir de esa medición.",
    "Dos valores con el mismo número no necesariamente significan lo mismo si provienen de contaminantes, unidades o metodologías diferentes.",
  ],
  disclaimer: "Esta plataforma no mezcla automáticamente concentraciones OpenAQ con índices WAQI.",
};

export const MEASUREMENT_METHODS = {
  title: "¿Cómo se mide la contaminación del aire?",
  summary:
    "Estaciones terrestres con instrumentos especializados; satélites y modelos como complementos con distinta precisión.",
  groundStations: {
    title: "A. Estaciones terrestres",
    text: "Las estaciones de monitoreo son equipos instalados en ubicaciones concretas. Capturan aire y utilizan instrumentos especializados para analizar partículas y gases.",
    techniques: [
      {
        pollutants: "PM2.5 y PM10",
        detail:
          "sensores ópticos, filtros, equipos gravimétricos, atenuación beta y otras tecnologías equivalentes según la red.",
      },
      {
        pollutants: "NO₂",
        detail: "analizadores de óxidos de nitrógeno, frecuentemente basados en quimioluminiscencia.",
      },
      {
        pollutants: "SO₂",
        detail: "frecuentemente fluorescencia ultravioleta.",
      },
      {
        pollutants: "CO",
        detail: "frecuentemente absorción infrarroja.",
      },
      {
        pollutants: "O₃",
        detail: "frecuentemente fotometría ultravioleta.",
      },
    ],
    note: "No todas las estaciones utilizan exactamente los mismos equipos. La tecnología depende del operador y de la red de monitoreo.",
  },
  satellites: {
    title: "B. Satélites y modelos",
    text: "Los satélites observan grandes áreas y detectan gases o aerosoles en la atmósfera. No miden directamente el aire de una calle o de una vivienda.\n\nLos modelos combinan observaciones, meteorología y estimaciones de emisiones para representar o predecir el comportamiento de la contaminación.",
    aclaraciones: [
      "un satélite no equivale a una estación",
      "la columna atmosférica no equivale a la concentración de superficie",
      "todavía no se implementa una capa satelital en producción",
      "Sentinel-5P está documentado como una futura capa independiente",
    ],
  },
};

export const DATA_PROVIDERS_GUIDE = {
  title: "¿Quién mide y publica estos datos?",
  summary:
    "Estaciones y redes de distintos niveles, plataformas agregadoras y organismos internacionales.",
  levels: [
    {
      name: "Nivel local",
      actors: [
        "municipios",
        "ciudades",
        "organismos ambientales",
        "universidades",
        "redes de monitoreo",
      ],
    },
    {
      name: "Nivel provincial o regional",
      actors: [
        "organismos ambientales provinciales",
        "redes industriales o interjurisdiccionales",
        "autoridades metropolitanas",
      ],
    },
    {
      name: "Nivel nacional",
      actors: [
        "organismos públicos",
        "servicios meteorológicos",
        "áreas ambientales nacionales",
        "redes técnicas",
      ],
    },
    {
      name: "Plataformas agregadoras",
      actors: ["WAQI", "OpenAQ"],
    },
    {
      name: "Organismos internacionales",
      actors: [
        "OMS como referencia sanitaria y de guías",
        "agencias científicas y espaciales para observaciones atmosféricas",
      ],
    },
  ],
  important:
    "WAQI actúa principalmente como agregador y visualizador. La medición original suele pertenecer a una estación operada por otra institución.",
  disclaimer:
    "Esta plataforma no presenta como «oficiales» los datos de fuentes que no lo confirman.",
};

export const DATA_SOURCES_COMPARISON: {
  title: string;
  summary: string;
  columns: GuideTableColumn[];
  rows: GuideTableRow[];
} = {
  title: "Comparación de fuentes",
  summary:
    "Estación, WAQI, OpenAQ, satélite y modelo: qué aporta cada una y sus limitaciones.",
  columns: [
    { key: "fuente", label: "Fuente" },
    { key: "aporta", label: "Qué aporta" },
    { key: "cobertura", label: "Cobertura" },
    { key: "precision", label: "Precisión espacial" },
    { key: "limitacion", label: "Limitación" },
  ],
  rows: [
    {
      fuente: "Estación terrestre",
      aporta: "Medición puntual",
      cobertura: "Local",
      precision: "Alta en el punto",
      limitacion: "No representa automáticamente toda la zona",
    },
    {
      fuente: "WAQI",
      aporta: "Índices agregados de estaciones",
      cobertura: "Variable",
      precision: "Depende de las estaciones",
      limitacion: "Puede haber zonas sin sensores o datos viejos",
    },
    {
      fuente: "OpenAQ",
      aporta: "Ubicaciones y concentraciones",
      cobertura: "Variable",
      precision: "Puntual",
      limitacion: "No siempre entrega AQI",
    },
    {
      fuente: "Satélite",
      aporta: "Observación regional",
      cobertura: "Amplia",
      precision: "Menor que una estación",
      limitacion: "No mide directamente a nivel de calle",
    },
    {
      fuente: "Modelo",
      aporta: "Estimación y predicción",
      cobertura: "Amplia",
      precision: "Depende del modelo",
      limitacion: "No es medición directa",
    },
  ],
};

export const PLATFORM_SOURCES = {
  title: "Fuentes utilizadas por esta plataforma",
  summary:
    "WAQI como fuente productiva actual; OpenAQ preparada y desactivada; satélite planificado como capa separada.",
  sources: [
    {
      name: "WAQI",
      items: [
        "fuente productiva actual",
        "entrega estaciones e índices",
        "puede tener cobertura desigual",
        "algunas mediciones pueden estar desactualizadas",
        "la plataforma filtra estaciones extranjeras en la vista Argentina",
        "los datos viejos no participan del heatmap",
      ],
    },
    {
      name: "OpenAQ",
      items: [
        "integración preparada pero desactivada por defecto",
        "aporta ubicaciones y concentraciones",
        "no se mezcla automáticamente con AQI",
        "requiere validación de unidades, frescura y deduplicación",
      ],
    },
    {
      name: "Satélite",
      items: [
        "no implementado todavía",
        "planificado como capa separada",
        "no reemplazará estaciones terrestres",
      ],
    },
  ],
};

export const WAQI_LIMITATIONS = {
  title: "¿Qué limitaciones tiene WAQI?",
  summary:
    "La cobertura, la frescura y la metodología dependen de cada estación y de cada red.",
  items: [
    "La cobertura depende de las estaciones disponibles.",
    "Algunas ciudades tienen pocas estaciones.",
    "Los datos pueden actualizarse con demora.",
    "No todas las estaciones miden todos los contaminantes.",
    "Las metodologías pueden variar.",
    "Un marcador representa un punto, no toda la ciudad.",
    "Una zona sin estación no implica aire limpio.",
    "El heatmap es una interpolación visual.",
    "El índice no identifica la fuente de la contaminación.",
  ],
};

// ---------------------------------------------------------------------------
// Guía por contaminante: estructura de diez puntos.
// ---------------------------------------------------------------------------

export type PollutantQuickCards = {
  /** Fuentes frecuentes, en una frase corta. */
  sources: string;
  /** Qué significa un nivel bajo, en una frase corta. */
  whenLow: string;
  /** Qué significa un nivel alto, en una frase corta. */
  whenHigh: string;
  /** Lo que el mapa NO significa, en una frase corta. */
  notMeaning: string;
};

export type PollutantGuide = {
  key: PollutantKey;
  /** Resumen ejecutivo: qué entender en menos de 30 segundos. */
  execSummary: string;
  /** Analogía simple para público general. */
  analogy: string;
  /** Tarjetas ultra resumidas (una frase cada una). */
  quickCards: PollutantQuickCards;
  /** 1. ¿Qué significa la sigla? */
  meaning: string;
  /** 2. ¿Qué es? */
  whatIs: string;
  /** 3. ¿Cómo se genera / de dónde proviene? */
  sources: string[];
  /** 4. ¿Dónde suele aparecer? */
  where: string;
  /** 5. ¿Qué puede indicar un nivel alto? */
  highIndicates: string;
  /** 6. ¿Qué efectos puede producir? */
  effects: string[];
  /** 7. ¿Qué puede salir bien si el nivel es bajo? */
  goodWhenLow: string[];
  /** 8. ¿Qué puede salir mal si el nivel es alto? */
  badWhenHigh: string[];
  /** 9. ¿Qué no puede afirmar el mapa? */
  cannotAssert: string[];
  /** 10. ¿Cómo se representa en esta plataforma? */
  howRepresented: string;
  /** Advertencia opcional específica del contaminante. */
  warning?: string;
};

export const POLLUTANT_GUIDES: Record<PollutantKey, PollutantGuide> = {
  pm25: {
    key: "pm25",
    execSummary:
      "El PM2.5 es polvo muy fino que se genera por combustión (tránsito, motores, incendios). Un valor alto significa más partículas en el aire.",
    analogy: "Polvo invisible extremadamente pequeño.",
    quickCards: {
      sources: "Motores, tránsito, incendios, industrias.",
      whenLow: "Días más cómodos para respirar y salir.",
      whenHigh: "Mucho humo o polvo fino en el aire.",
      notMeaning: "No dice de dónde viene ni cómo te afecta en particular.",
    },
    meaning:
      "PM significa material particulado. El número 2.5 indica que estas partículas tienen un diámetro igual o inferior a 2,5 micrómetros.",
    whatIs:
      "Son partículas microscópicas suspendidas en el aire. Por su pequeño tamaño pueden penetrar profundamente en los pulmones.",
    sources: [
      "Emisiones vehiculares",
      "Motores diésel",
      "Combustión residencial",
      "Industrias",
      "Incendios",
      "Quema de biomasa",
      "Polvo fino transformado por procesos atmosféricos",
    ],
    where:
      "Suelen estar presentes en zonas urbanas con tránsito, cerca de industrias y en regiones afectadas por humo de incendios o quemas. También pueden acumularse durante días con poco viento.",
    highIndicates:
      "Puede indicar una mayor presencia de partículas finas en el aire registrado por una estación. No identifica por sí solo la fuente concreta.",
    effects: [
      "Penetración profunda en las vías respiratorias por su tamaño reducido",
      "Posible ingreso al organismo a través de la respiración",
      "Disminución de la visibilidad atmosférica",
      "Posible aporte a la formación de depósitos sobre superficies",
    ],
    goodWhenLow: [
      "Menor exposición respiratoria",
      "Mejores condiciones para actividades al aire libre",
      "Menor probabilidad de irritación asociada a partículas",
      "Mejor visibilidad atmosférica",
    ],
    badWhenHigh: [
      "Irritación de vías respiratorias",
      "Agravamiento de problemas respiratorios",
      "Mayor riesgo para niños, adultos mayores y personas sensibles",
      "Acumulación durante condiciones meteorológicas adversas",
    ],
    cannotAssert: [
      "El mapa no puede determinar si el PM2.5 proviene específicamente del tránsito, de una industria o de un incendio sin información adicional.",
      "Un valor alto en una estación no implica que toda la ciudad o el país esté en esa condición.",
      "El color entre estaciones es una estimación visual, no una medición en cada punto.",
    ],
    howRepresented:
      "El color representa el índice informado por las estaciones. Las manchas entre puntos son una interpolación visual.",
  },
  pm10: {
    key: "pm10",
    execSummary:
      "El PM10 es polvo visible y partículas más grandes, común cerca de obras, calles sin pavimentar y zonas secas.",
    analogy: "Polvo visible y partículas más grandes.",
    quickCards: {
      sources: "Polvo, obras, calles sin pavimentar, viento.",
      whenLow: "Poco polvo en el aire.",
      whenHigh: "Aire con polvo o tierra en suspensión.",
      notMeaning: "No identifica si es de obra, calle o campo.",
    },
    meaning:
      "PM significa material particulado. El número 10 indica que estas partículas tienen un diámetro igual o inferior a 10 micrómetros.",
    whatIs:
      "Son partículas un poco más grandes que las de PM2.5. Entran por la nariz y la boca y pueden llegar a las vías respiratorias, aunque menos profundamente que las finas.",
    sources: [
      "Polvo levantado del suelo",
      "Obras y construcción",
      "Calles sin pavimentar",
      "Tránsito (polvo y desgaste de frenos y neumáticos)",
      "Actividad agrícola",
      "Viento sobre suelo seco",
    ],
    where:
      "Suele aparecer cerca de obras, zonas sin pavimentar, áreas rurales con tierra removida y calles con mucho tránsito.",
    highIndicates:
      "Puede indicar una mayor presencia de partículas en suspensión registrada por una estación. No identifica por sí solo la fuente (obra, polvo o tránsito).",
    effects: [
      "Irritación de la nariz, la garganta y las vías respiratorias",
      "Reducción de la visibilidad en episodios de polvo",
      "Posible incomodidad al respirar en días muy secos y con viento",
    ],
    goodWhenLow: [
      "Menor presencia de polvo en el aire",
      "Mejores condiciones para respirar en zonas urbanas o de obra",
      "Menos irritación en nariz y garganta",
    ],
    badWhenHigh: [
      "Irritación respiratoria",
      "Agravamiento de síntomas en personas sensibles",
      "Incomodidad en zonas con mucho polvo suspendido",
    ],
    cannotAssert: [
      "El mapa no puede determinar si el PM10 proviene de una obra, del tránsito o del polvo natural.",
      "Un valor alto en un punto no significa que el polvo cubra toda la región.",
    ],
    howRepresented:
      "Se muestra como índice AQI por estación y como mancha térmica estimada entre estaciones.",
  },
  no2: {
    key: "no2",
    execSummary:
      "El NO₂ es un gas de la combustión, más alto cerca de avenidas y zonas industriales.",
    analogy: "Gas de la combustión, sobre todo de motores.",
    quickCards: {
      sources: "Autos, camiones, calderas, industrias.",
      whenLow: "Menos gases irritantes cerca.",
      whenHigh: "Tránsito o combustión intensos cerca.",
      notMeaning: "No dice cuál fuente (auto, fábrica, caldera) lo produce.",
    },
    meaning:
      "NO₂ es dióxido de nitrógeno, un gas asociado principalmente a procesos de combustión.",
    whatIs:
      "Es un gas con coloración marrón-rojiza en concentraciones altas, formado por reacciones de combustión. Suele ser más notorio cerca de calles con mucho tránsito o instalaciones que queman combustibles.",
    sources: [
      "Tránsito vehicular",
      "Motores",
      "Centrales térmicas",
      "Industrias",
      "Calderas",
      "Combustión de combustibles fósiles",
    ],
    where:
      "Suele aparecer cerca de avenidas y autopistas, zonas industriales y sectores urbanos densos con tránsito intenso.",
    highIndicates:
      "Puede estar asociado a tránsito intenso o combustión cercana, aunque el mapa no puede atribuir una causa concreta.",
    effects: [
      "Irritación respiratoria",
      "Participación en reacciones que generan ozono y partículas secundarias",
      "Reducción de la visibilidad en combinación con otros contaminantes",
    ],
    goodWhenLow: [
      "Menor exposición a gases irritantes",
      "Mejores condiciones respiratorias",
      "Menor influencia de fuentes de combustión próximas",
    ],
    badWhenHigh: [
      "Irritación respiratoria",
      "Agravamiento de síntomas en personas sensibles",
      "Mayor probabilidad de formación de ozono y partículas secundarias",
    ],
    cannotAssert: [
      "El mapa no puede determinar la causa de un valor alto (tránsito, industria o central térmica) sin datos de emisiones y viento.",
      "Un valor alto en una estación no significa que toda la zona circundante lo tenga: la lectura directa es válida en el punto de la estación.",
    ],
    howRepresented:
      "Se muestra como índice AQI por estación y como mancha térmica estimada entre estaciones.",
  },
  o3: {
    key: "o3",
    execSummary:
      "El O₃ se forma en el aire con el sol; sube en días soleados, incluso lejos de sus fuentes.",
    analogy: "Contaminante que se forma en el aire con el sol.",
    quickCards: {
      sources: "Se forma con sol, tránsito y otros contaminantes.",
      whenLow: "Días más tranquilos para respirar.",
      whenHigh: "Días de mucho sol: suele subir.",
      notMeaning: "No significa que haya una fuente de ozono ahí: se forma con sol.",
    },
    meaning:
      "O₃ es ozono. En este mapa se refiere al ozono troposférico, el que se encuentra cerca del suelo, no a la capa que protege en la atmósfera alta.",
    whatIs:
      "No se emite directamente en la mayoría de los casos: se forma por reacciones químicas en el aire. Intervienen la radiación solar, los óxidos de nitrógeno y compuestos orgánicos.",
    sources: [
      "Reacciones químicas entre óxidos de nitrógeno y compuestos orgánicos",
      "Radiación solar intensa",
      "Tránsito urbano (aporta los precursores)",
      "Industrias y combustión (aporta los precursores)",
    ],
    where:
      "Puede formarse en zonas urbanas con sol y tránsito, y puede trasladarse con el viento: pueden aparecer niveles elevados lejos de la fuente original.",
    highIndicates:
      "Puede indicar la presencia de reacciones fotoquímicas activas. Una zona con ozono elevado no implica necesariamente que exista una fuente directa de ozono en ese lugar.",
    warning:
      "Una zona con ozono elevado no implica necesariamente que exista una fuente directa de ozono en ese lugar.",
    effects: [
      "Irritación de las vías respiratorias",
      "Posible agravamiento de afecciones respiratorias",
      "Menor capacidad para realizar ejercicio intenso en días de sol",
      "Efectos sobre la vegetación",
    ],
    goodWhenLow: [
      "Menos irritación respiratoria",
      "Condiciones más cómodas para actividades al aire libre en días de sol",
      "Menos estrés para personas con afecciones respiratorias",
    ],
    badWhenHigh: [
      "Irritación pulmonar",
      "Agravamiento de síntomas en personas con enfermedades respiratorias",
      "Mayor incomodidad para actividad física intensa",
    ],
    cannotAssert: [
      "El mapa no puede afirmar que haya una fuente directa de ozono en una zona con valores elevados: el ozono suele formarse a partir de otros contaminantes.",
      "No puede predecir la evolución del ozono ni su desplazamiento con el viento.",
    ],
    howRepresented:
      "Se muestra como índice AQI por estación y como estimación visual entre estaciones. Los valores altos suelen aparecer en días soleados.",
  },
  so2: {
    key: "so2",
    execSummary:
      "El SO₂ es un gas de quemar combustibles con azufre y de la industria.",
    analogy: "Gas de quemar combustibles con azufre.",
    quickCards: {
      sources: "Refinerías, centrales eléctricas, industria.",
      whenLow: "Menos gases irritantes cerca.",
      whenHigh: "Combustión o industria intensas cerca.",
      notMeaning: "No dice cuál proceso lo genera.",
    },
    meaning:
      "SO₂ es dióxido de azufre, un gas producido sobre todo al quemar combustibles que contienen azufre.",
    whatIs:
      "Es un gas incoloro con olor característico que se libera en procesos de combustión e industriales. Puede transformarse en el aire en partículas finas (sulfatos).",
    sources: [
      "Combustibles con azufre (gasoil, carbón)",
      "Industria",
      "Generación de energía",
      "Refinerías",
      "Algunos procesos productivos",
    ],
    where:
      "Suele aparecer cerca de refinerías, centrales térmicas, zonas industriales y en regiones donde se queman combustibles con azufre.",
    highIndicates:
      "Puede estar asociado a fuentes de combustión o industriales cercanas, aunque el mapa no puede atribuir una causa concreta.",
    effects: [
      "Irritación respiratoria",
      "Posible formación de partículas finas secundarias (sulfatos)",
      "Agravamiento de enfermedades respiratorias en personas sensibles",
    ],
    goodWhenLow: [
      "Menor exposición a gases irritantes",
      "Menos aporte a la formación de partículas secundarias",
      "Mejores condiciones respiratorias",
    ],
    badWhenHigh: [
      "Irritación respiratoria",
      "Agravamiento de enfermedades respiratorias",
      "Aporte a la formación de partículas finas en el aire",
    ],
    cannotAssert: [
      "El mapa no puede determinar si el SO₂ proviene de una refinería, una central térmica u otro proceso.",
      "Un valor elevado en una estación no implica que toda la zona industrial tenga el mismo nivel en cada punto.",
    ],
    howRepresented:
      "Se muestra como índice AQI por estación y como estimación visual entre estaciones.",
  },
  co: {
    key: "co",
    execSummary:
      "El CO es un gas sin olor de la combustión; el riesgo es acumularse en espacios cerrados.",
    analogy: "Gas sin olor de la combustión incompleta.",
    quickCards: {
      sources: "Tránsito, calefacción, motores.",
      whenLow: "Menos exposición a un gas sin olor.",
      whenHigh: "Riesgo de acumulación en espacios cerrados.",
      notMeaning: "No mide el aire dentro de tu casa u oficina.",
    },
    meaning:
      "CO es monóxido de carbono, un gas producido por la combustión incompleta de materiales que contienen carbono.",
    whatIs:
      "Es un gas sin color ni olor. En espacios abiertos suele dispersarse con el viento; en espacios cerrados y mal ventilados puede acumularse y resultar peligroso.",
    sources: [
      "Tránsito vehicular",
      "Combustión incompleta",
      "Calderas y calefacción",
      "Generadores",
      "Incendios y quemas",
      "Procesos industriales",
    ],
    where:
      "Suele aparecer cerca de calles con mucho tránsito, zonas de calefacción a leña o gas y lugares con motores de combustión.",
    highIndicates:
      "Puede estar asociado a combustión incompleta o tránsito intenso cercano, aunque el mapa no puede atribuir una causa concreta.",
    effects: [
      "Reduce la capacidad de la sangre para transportar oxígeno",
      "Puede provocar dolores de cabeza, mareos y fatiga en concentraciones elevadas",
      "En espacios cerrados sin ventilación puede acumularse",
    ],
    goodWhenLow: [
      "Menor exposición a un gas sin olor que afecta el transporte de oxígeno",
      "Mejores condiciones cerca del tránsito o de la calefacción",
    ],
    badWhenHigh: [
      "Dolores de cabeza, mareos y fatiga en concentraciones elevadas",
      "Riesgo de acumulación en ambientes poco ventilados",
      "Agravamiento de síntomas en personas con afecciones cardíacas o respiratorias",
    ],
    cannotAssert: [
      "El mapa no puede medir el CO dentro de espacios cerrados, donde suele acumularse.",
      "Un valor alto en una estación exterior no describe las condiciones dentro de una vivienda u oficina.",
    ],
    howRepresented:
      "Se muestra como índice AQI por estación y como estimación visual entre estaciones. Es más frecuente en zonas urbanas con tránsito.",
  },
};

export const GUIDE_POLLUTANT_KEYS: PollutantKey[] = ["pm25", "pm10", "no2", "o3", "so2", "co"];

export function pollutantGuide(key: PollutantKey): PollutantGuide {
  return POLLUTANT_GUIDES[key];
}
