import { describe, expect, it } from "vitest";
import { AQI_CATEGORIES } from "@/lib/aqiHeatScale";
import {
  AQI_SCALE_COLUMNS,
  AQI_SCALE_GUIDE,
  AQI_SCALE_ROWS,
  COVERAGE_FRESHNESS,
  DATA_PROVIDERS_GUIDE,
  DATA_SOURCES_COMPARISON,
  DIRECT_VS_INTERPOLATION,
  DOMINANT_POLLUTANT,
  GLOSSARY,
  GOOD_THINGS,
  GUIDE_CATEGORIES,
  GUIDE_POLLUTANT_KEYS,
  INDEX_VS_CONCENTRATION,
  MAP_GUIDE,
  MEASUREMENT_METHODS,
  METHODOLOGY,
  MISCONCEPTIONS,
  PLATFORM_COMPONENTS,
  PLATFORM_SOURCES,
  POLLUTANT_COMPARISON,
  WAQI_GUIDE,
  WAQI_LIMITATIONS,
  pollutantGuide,
  type GuideTableRow,
} from "@/lib/guideContent";

function requireText(value: string, context: string): void {
  expect(value.trim().length, `${context} no debe estar vacío`).toBeGreaterThan(0);
}

describe("guideContent", () => {
  it("cada contaminante tiene la estructura de diez puntos completa y sin vacíos", () => {
    for (const key of GUIDE_POLLUTANT_KEYS) {
      const guide = pollutantGuide(key);
      requireText(guide.execSummary, `${key}.execSummary`);
      requireText(guide.analogy, `${key}.analogy`);
      requireText(guide.quickCards.sources, `${key}.quickCards.sources`);
      requireText(guide.quickCards.whenLow, `${key}.quickCards.whenLow`);
      requireText(guide.quickCards.whenHigh, `${key}.quickCards.whenHigh`);
      requireText(guide.quickCards.notMeaning, `${key}.quickCards.notMeaning`);
      requireText(guide.meaning, `${key}.meaning`);
      requireText(guide.whatIs, `${key}.whatIs`);
      requireText(guide.where, `${key}.where`);
      requireText(guide.highIndicates, `${key}.highIndicates`);
      requireText(guide.howRepresented, `${key}.howRepresented`);
      expect(guide.sources.length).toBeGreaterThan(0);
      expect(guide.effects.length).toBeGreaterThan(0);
      expect(guide.goodWhenLow.length).toBeGreaterThan(0);
      expect(guide.badWhenHigh.length).toBeGreaterThan(0);
      expect(guide.cannotAssert.length).toBeGreaterThan(0);
      for (const list of [
        guide.sources,
        guide.effects,
        guide.goodWhenLow,
        guide.badWhenHigh,
        guide.cannotAssert,
      ]) {
        for (const item of list) {
          requireText(item, `${key}.item`);
        }
      }
    }
  });

  it("la categoría de guía cubre las cinco claves editoriales", () => {
    expect(GUIDE_CATEGORIES.map((category) => category.key)).toEqual([
      "fact",
      "cause",
      "effect",
      "estimation",
      "limit",
    ]);
  });

  it("todas las filas de las tablas respetan sus columnas", () => {
    const checkRows = (columns: { key: string }[], rows: GuideTableRow[]) => {
      const firstKey = columns[0].key;
      for (const row of rows) {
        for (const column of columns) {
          requireText(row[column.key], `fila ${row[firstKey]} → ${column.key}`);
        }
      }
    };
    checkRows(DIRECT_VS_INTERPOLATION.columns, DIRECT_VS_INTERPOLATION.rows);
    checkRows(POLLUTANT_COMPARISON.columns, POLLUTANT_COMPARISON.rows);
  });

  it("el cuadro de comparación incluye los seis contaminantes", () => {
    expect(POLLUTANT_COMPARISON.rows.map((row) => row.sigla)).toEqual([
      "PM2.5",
      "PM10",
      "NO₂",
      "O₃",
      "SO₂",
      "CO",
    ]);
  });

  it("el cuadro de medición vs interpolación cubre las cuatro situaciones", () => {
    expect(DIRECT_VS_INTERPOLATION.rows.map((row) => row.type)).toEqual([
      "Medición directa",
      "Interpolación",
      "Baja cobertura",
      "Sin cobertura",
    ]);
  });

  it("las secciones generales tienen contenido sustancial", () => {
    expect(MAP_GUIDE.subsections.length).toBe(6);
    expect(PLATFORM_COMPONENTS.items.length).toBe(5);
    expect(GOOD_THINGS.items.length).toBeGreaterThanOrEqual(7);
    expect(GOOD_THINGS.disclaimer.length).toBeGreaterThan(0);
    expect(MISCONCEPTIONS.items.length).toBeGreaterThanOrEqual(10);
    expect(COVERAGE_FRESHNESS.items.length).toBeGreaterThan(0);
    expect(METHODOLOGY.steps.length).toBe(8);
    expect(METHODOLOGY.note.length).toBeGreaterThan(0);
    expect(GLOSSARY.entries.length).toBeGreaterThan(0);
  });

  it("el contenido evita afirmaciones categóricas prohibidas", () => {
    const forbidden = [
      "esta zona está contaminada por",
      "este valor se debe a",
      "el mapa demuestra que",
      "el aire es seguro",
      "el aire es peligroso",
    ];
    const allText = [
      MAP_GUIDE.intro,
      ...MAP_GUIDE.subsections.flatMap((s) => [s.title, s.body]),
      ...PLATFORM_COMPONENTS.items.flatMap((i) => [i.title, i.body]),
      ...GOOD_THINGS.items,
      GOOD_THINGS.disclaimer,
      ...MISCONCEPTIONS.items.flatMap((i) => [i.title, i.body]),
      ...POLLUTANT_COMPARISON.rows.flatMap((r) => Object.values(r)),
      ...COVERAGE_FRESHNESS.items.flatMap((i) => [i.title, i.body]),
      ...METHODOLOGY.steps,
      METHODOLOGY.note,
      ...GLOSSARY.entries.flatMap((e) => [e.term, e.definition]),
      ...GUIDE_POLLUTANT_KEYS.flatMap((key) => {
        const g = pollutantGuide(key);
        return [
          g.meaning,
          g.whatIs,
          g.where,
          g.highIndicates,
          g.howRepresented,
          ...g.sources,
          ...g.effects,
          ...g.goodWhenLow,
          ...g.badWhenHigh,
          ...g.cannotAssert,
          ...(g.warning ? [g.warning] : []),
        ];
      }),
    ].join("\n").toLowerCase();

    for (const phrase of forbidden) {
      expect(allText.includes(phrase), `no debe aparecer: "${phrase}"`).toBe(false);
    }
  });
});

function waqiText(): string {
  return [
    WAQI_GUIDE.title,
    WAQI_GUIDE.summary,
    WAQI_GUIDE.execSummary,
    WAQI_GUIDE.clarification,
    AQI_SCALE_GUIDE.title,
    ...AQI_SCALE_GUIDE.paragraphs,
    ...AQI_SCALE_GUIDE.bullets,
    ...AQI_SCALE_ROWS.flatMap((row) => [row.rango, row.categoria, row.colorName, row.interpretacion]),
    DOMINANT_POLLUTANT.title,
    DOMINANT_POLLUTANT.summary,
    DOMINANT_POLLUTANT.body,
    DOMINANT_POLLUTANT.disclaimer,
    INDEX_VS_CONCENTRATION.title,
    INDEX_VS_CONCENTRATION.summary,
    ...INDEX_VS_CONCENTRATION.body,
    INDEX_VS_CONCENTRATION.disclaimer,
    MEASUREMENT_METHODS.title,
    MEASUREMENT_METHODS.summary,
    MEASUREMENT_METHODS.groundStations.title,
    MEASUREMENT_METHODS.groundStations.text,
    ...MEASUREMENT_METHODS.groundStations.techniques.flatMap((t) => [t.pollutants, t.detail]),
    MEASUREMENT_METHODS.groundStations.note,
    MEASUREMENT_METHODS.satellites.title,
    MEASUREMENT_METHODS.satellites.text,
    ...MEASUREMENT_METHODS.satellites.aclaraciones,
    DATA_PROVIDERS_GUIDE.title,
    DATA_PROVIDERS_GUIDE.summary,
    ...DATA_PROVIDERS_GUIDE.levels.flatMap((level) => [level.name, ...level.actors]),
    DATA_PROVIDERS_GUIDE.important,
    DATA_PROVIDERS_GUIDE.disclaimer,
    DATA_SOURCES_COMPARISON.title,
    DATA_SOURCES_COMPARISON.summary,
    ...DATA_SOURCES_COMPARISON.rows.flatMap((row) => Object.values(row)),
    PLATFORM_SOURCES.title,
    PLATFORM_SOURCES.summary,
    ...PLATFORM_SOURCES.sources.flatMap((source) => [source.name, ...source.items]),
    WAQI_LIMITATIONS.title,
    WAQI_LIMITATIONS.summary,
    ...WAQI_LIMITATIONS.items,
  ].join("\n");
}

describe("WAQI_GUIDE", () => {
  it("tiene resumen ejecutivo y aclaración obligatoria", () => {
    requireText(WAQI_GUIDE.execSummary, "WAQI_GUIDE.execSummary");
    expect(WAQI_GUIDE.execSummary.toLowerCase()).toContain("plataforma global");
    expect(WAQI_GUIDE.clarification).toContain("WAQI no necesariamente opera cada estación");
  });

  it("aclara que WAQI agrega datos externos y no mide todo por sí mismo", () => {
    expect(WAQI_GUIDE.clarification).toContain(
      "Recopila y publica datos provenientes de organismos, redes y proveedores externos.",
    );
    const text = waqiText().toLowerCase();
    expect(text).not.toContain("waqi opera todas las estaciones");
    expect(text).not.toContain("waqi realiza todas las mediciones");
    expect(text).not.toContain("todas las estaciones usan exactamente la misma tecnología");
  });

  it("explica el contaminante dominante sin prometer una metodología única", () => {
    requireText(DOMINANT_POLLUTANT.body, "DOMINANT_POLLUTANT.body");
    expect(DOMINANT_POLLUTANT.body.toLowerCase()).toContain("contaminante dominante");
    expect(DOMINANT_POLLUTANT.disclaimer).toContain(
      "La metodología exacta puede variar entre fuentes y organismos.",
    );
  });

  it("explica la diferencia entre índice y concentración", () => {
    expect(INDEX_VS_CONCENTRATION.body.length).toBeGreaterThanOrEqual(3);
    expect(INDEX_VS_CONCENTRATION.title).toBe("AQI no es lo mismo que concentración");
    expect(INDEX_VS_CONCENTRATION.disclaimer).toContain("OpenAQ");
  });
});

describe("AQI scale guide", () => {
  it("tiene exactamente seis rangos derivados de AQI_CATEGORIES", () => {
    expect(AQI_SCALE_ROWS).toHaveLength(6);
    expect(AQI_SCALE_ROWS).toHaveLength(AQI_CATEGORIES.length);
    expect(AQI_SCALE_ROWS.map((row) => row.rango)).toEqual([
      "0–50",
      "51–100",
      "101–150",
      "151–200",
      "201–300",
      "301+",
    ]);
  });

  it("los rangos y colores coinciden con AQI_CATEGORIES", () => {
    AQI_SCALE_ROWS.forEach((row, index) => {
      const category = AQI_CATEGORIES[index];
      expect(row.categoria).toBe(category.label);
      expect(row.color).toBe(category.color);
      expect(row.rango).toBe(category.max === Infinity ? `${category.min}+` : `${category.min}–${category.max}`);
      requireText(row.colorName, `colorName ${row.categoria}`);
      requireText(row.interpretacion, `interpretacion ${row.categoria}`);
    });
  });

  it("cada fila describe el rango, el color y la interpretación breve", () => {
    expect(AQI_SCALE_COLUMNS.map((column) => column.key)).toEqual([
      "rango",
      "color",
      "categoria",
      "interpretacion",
    ]);
    for (const row of AQI_SCALE_ROWS) {
      expect(row.rango.length).toBeGreaterThan(0);
      expect(row.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(row.interpretacion.length).toBeGreaterThan(0);
    }
  });
});

describe("métodos de medición", () => {
  it("explica las estaciones terrestres y sus tecnologías", () => {
    requireText(MEASUREMENT_METHODS.groundStations.text, "groundStations.text");
    expect(MEASUREMENT_METHODS.groundStations.techniques.map((t) => t.pollutants)).toEqual([
      "PM2.5 y PM10",
      "NO₂",
      "SO₂",
      "CO",
      "O₃",
    ]);
    expect(MEASUREMENT_METHODS.groundStations.note).toContain(
      "No todas las estaciones utilizan exactamente los mismos equipos",
    );
  });

  it("explica satélites y modelos sin equipararlos a estaciones", () => {
    requireText(MEASUREMENT_METHODS.satellites.text, "satellites.text");
    expect(MEASUREMENT_METHODS.satellites.text.toLowerCase()).toContain("satélites");
    expect(MEASUREMENT_METHODS.satellites.text.toLowerCase()).toContain("modelos");
    expect(MEASUREMENT_METHODS.satellites.aclaraciones.join(" ")).toContain("no equivale a una estación");
    expect(MEASUREMENT_METHODS.satellites.aclaraciones.join(" ")).toContain(
      "todavía no se implementa una capa satelital en producción",
    );
  });

  it("no afirma que un satélite mide el aire de una calle", () => {
    const text = waqiText().toLowerCase();
    expect(text).toContain("no miden directamente el aire de una calle");
    expect(text).not.toContain("el satélite mide el aire de cada calle");
  });
});

describe("quiénes generan y publican los datos", () => {
  it("describe los niveles de generación y la aclaración sobre WAQI", () => {
    expect(DATA_PROVIDERS_GUIDE.levels.map((level) => level.name)).toEqual([
      "Nivel local",
      "Nivel provincial o regional",
      "Nivel nacional",
      "Plataformas agregadoras",
      "Organismos internacionales",
    ]);
    expect(DATA_PROVIDERS_GUIDE.important).toContain(
      "WAQI actúa principalmente como agregador y visualizador",
    );
    expect(DATA_PROVIDERS_GUIDE.important).toContain(
      "La medición original suele pertenecer a una estación operada por otra institución",
    );
  });

  it("no presenta todos los datos como oficiales sin confirmación", () => {
    expect(DATA_PROVIDERS_GUIDE.disclaimer.length).toBeGreaterThan(0);
    const text = waqiText().toLowerCase();
    expect(text).not.toContain("todos los datos son oficiales");
  });
});

describe("comparación y limitaciones de fuentes", () => {
  it("incluye la tabla comparativa de las cinco fuentes", () => {
    expect(DATA_SOURCES_COMPARISON.rows.map((row) => row.fuente)).toEqual([
      "Estación terrestre",
      "WAQI",
      "OpenAQ",
      "Satélite",
      "Modelo",
    ]);
    const row = DATA_SOURCES_COMPARISON.rows.find((r) => r.fuente === "Satélite");
    expect(row?.limitacion).toContain("No mide directamente a nivel de calle");
  });

  it("describe OpenAQ como desactivado por defecto", () => {
    const openaq = PLATFORM_SOURCES.sources.find((source) => source.name === "OpenAQ");
    expect(openaq?.items.join(" ")).toContain("desactivada por defecto");
    expect(openaq?.items.join(" ")).toContain("no se mezcla automáticamente con AQI");
  });

  it("describe el satélite como no implementado todavía", () => {
    const satellite = PLATFORM_SOURCES.sources.find((source) => source.name === "Satélite");
    expect(satellite?.items.join(" ")).toContain("no implementado todavía");
    expect(satellite?.items.join(" ")).toContain("no reemplazará estaciones terrestres");
  });

  it("listan nueve limitaciones de WAQI", () => {
    expect(WAQI_LIMITATIONS.items).toHaveLength(9);
    expect(WAQI_LIMITATIONS.items.join(" ")).toContain("Una zona sin estación no implica aire limpio");
  });
});

describe("contenido WAQI y zonas transparentes", () => {
  it("ninguna explicación dice que una zona transparente significa aire limpio", () => {
    const text = waqiText().toLowerCase();
    expect(text).not.toContain("transparente significa aire limpio");
    expect(text).not.toContain("sin estación significa aire limpio");
    expect(text).toContain("no implica aire limpio");
  });

  it("mantiene las afirmaciones categóricas prohibidas fuera del contenido WAQI", () => {
    const forbidden = [
      "esta zona está contaminada por",
      "este valor se debe a",
      "el aire es seguro",
      "el aire es peligroso",
      "el mapa demuestra que",
    ];
    const text = waqiText().toLowerCase();
    for (const phrase of forbidden) {
      expect(text.includes(phrase), `no debe aparecer: "${phrase}"`).toBe(false);
    }
  });
});
