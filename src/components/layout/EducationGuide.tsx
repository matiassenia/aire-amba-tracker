// Guía editorial "¿Qué muestra este mapa?".
//
// UX de contenido en tres niveles:
//   1. cada tema muestra un resumen de 1-2 líneas;
//   2. el contenido se organiza en accordions (uno por tema);
//   3. los cuadros comparativos y la metodología viven dentro de los temas.
//
// Principio de lectura: primero comprensión, después profundidad.
//   - resumen ejecutivo arriba de cada sección;
//   - tarjetas visuales (qué significa / qué podría salir bien / mal / limitaciones);
//   - cuadros comparativos visibles;
//   - párrafos cortos y listas como bullets escaneables;
//   - el contenido profundo queda detrás de accordions plegados.

import { useMemo, type ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PollutantKey } from "@/lib/pollutantHeat";
import { POLLUTANT_INFO } from "@/lib/pollutantInfo";
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
  type GuideTableColumn,
  type GuideTableRow,
} from "@/lib/guideContent";

const SECTION_ORDER: { id: string; title: string; summary: string }[] = [
  { id: "que-muestra", title: MAP_GUIDE.title, summary: MAP_GUIDE.summary },
  { id: "medicion-vs-interpolacion", title: DIRECT_VS_INTERPOLATION.title, summary: DIRECT_VS_INTERPOLATION.summary },
  { id: "que-aporta", title: GOOD_THINGS.title, summary: GOOD_THINGS.summary },
  { id: "limitaciones", title: MISCONCEPTIONS.title, summary: MISCONCEPTIONS.summary },
  { id: "comparacion", title: POLLUTANT_COMPARISON.title, summary: POLLUTANT_COMPARISON.summary },
  { id: "waqi", title: "Sobre WAQI y los datos", summary: WAQI_GUIDE.summary },
  { id: "cobertura-frescura", title: COVERAGE_FRESHNESS.title, summary: COVERAGE_FRESHNESS.summary },
  { id: "metodologia", title: METHODOLOGY.title, summary: METHODOLOGY.summary },
  { id: "glosario", title: GLOSSARY.title, summary: GLOSSARY.summary },
];

type GuideSection = { id: string; title: string; summary: string; content: ReactNode };

function SectionTrigger({ title, summary }: { title: string; summary: string }) {
  return (
    <span className="flex flex-1 flex-col items-start gap-1 py-0.5 text-left">
      <span className="text-[15px] font-medium leading-snug text-white">{title}</span>
      <span className="text-xs font-normal leading-snug text-white/55">{summary}</span>
    </span>
  );
}

function ExecSummary({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2.5">
      <p className="flex items-start gap-2 text-sm leading-relaxed text-cyan-50/90">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-200/80" aria-hidden />
        <span>{children}</span>
      </p>
    </div>
  );
}

function CategoryLegend() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-100/65">
        Cómo leer esta guía
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/72">
        Cada tema distingue cinco categorías para no confundir lo medido con lo posible.
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {GUIDE_CATEGORIES.map((category) => (
          <li key={category.key} className="flex items-center gap-2 text-sm text-white/75">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category.dot }} />
            {category.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResponsiveTable({ columns, rows }: { columns: GuideTableColumn[]; rows: GuideTableRow[] }) {
  return (
    <div>
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.07]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="h-11 px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[columns[0].key]} className="border-b border-white/8 transition-colors hover:bg-white/[0.03] last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-2.5 align-top text-sm leading-relaxed",
                      column.key === columns[0].key ? "font-semibold text-white" : "text-white/70",
                    )}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <div key={row[columns[0].key]} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-sm font-semibold text-white">{row[columns[0].key]}</div>
            <dl className="mt-2 grid gap-1.5">
              {columns.slice(1).map((column) => (
                <div key={column.key} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                    {column.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-white/75">{row[column.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardList({
  items,
  dot,
  dotClassName,
}: {
  items: string[];
  dot?: string;
  dotClassName?: string;
}) {
  return (
    <ul className="grid gap-1.5 text-sm leading-relaxed text-white/78">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span
            className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dotClassName)}
            style={dot ? { backgroundColor: dot } : undefined}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

type InfoCardTone = "fact" | "cause" | "good" | "bad" | "limit";

const INFO_CARD_STYLES: Record<InfoCardTone, { border: string; title: string; dot: string }> = {
  fact: { border: "border-cyan-200/15", title: "text-cyan-50/90", dot: "#38bdf8" },
  cause: { border: "border-amber-200/15", title: "text-amber-50/85", dot: "#fbbf24" },
  good: { border: "border-emerald-200/15", title: "text-emerald-50/85", dot: "#34d399" },
  bad: { border: "border-orange-200/15", title: "text-orange-50/85", dot: "#fb923c" },
  limit: { border: "border-white/10", title: "text-white/85", dot: "#94a3b8" },
};

function InfoCard({ tone, label, text }: { tone: InfoCardTone; label: string; text: string }) {
  const styles = INFO_CARD_STYLES[tone];
  return (
    <div className={cn("rounded-2xl border bg-white/[0.04] p-3", styles.border)}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: styles.dot }} />
        <h4 className={cn("text-sm font-semibold", styles.title)}>{label}</h4>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/82">{text}</p>
    </div>
  );
}

function DeepBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <h4 className="text-sm font-semibold text-white/85">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function PollutantDeepDive({ pollutant }: { pollutant: PollutantKey }) {
  const info = POLLUTANT_INFO[pollutant];
  const guide = pollutantGuide(pollutant);

  const quickCards: { tone: InfoCardTone; label: string; text: string }[] = [
    { tone: "fact", label: "Qué es", text: guide.analogy },
    { tone: "cause", label: "Fuentes frecuentes", text: guide.quickCards.sources },
    { tone: "good", label: "Cuando está bajo", text: guide.quickCards.whenLow },
    { tone: "bad", label: "Cuando está alto", text: guide.quickCards.whenHigh },
    { tone: "limit", label: "Lo que NO significa", text: guide.quickCards.notMeaning },
  ];

  return (
    <div className="space-y-3">
      <ExecSummary>{guide.execSummary}</ExecSummary>

      <div className="grid gap-2 sm:grid-cols-2">
        {quickCards.map((card, index) => (
          <div key={card.label} className={cn(index === quickCards.length - 1 && "sm:col-span-2")}>
            <InfoCard tone={card.tone} label={card.label} text={card.text} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-3 py-2 text-sm text-cyan-50/85">
        <span className="font-medium text-cyan-50/90">En esta plataforma:</span> {guide.howRepresented}
      </div>

      <Accordion type="multiple">
        <AccordionItem value="profundizar" className="border-white/10">
          <AccordionTrigger>
            <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-[15px] font-medium text-white">
              Profundizar en {info.shortName}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <DeepBlock title="¿Qué significa la sigla?">
                <p className="text-sm leading-relaxed text-white/78">{guide.meaning}</p>
              </DeepBlock>
              <DeepBlock title="¿Qué es?">
                <p className="text-sm leading-relaxed text-white/78">{guide.whatIs}</p>
              </DeepBlock>
              <DeepBlock title="Fuentes habituales">
                <CardList items={guide.sources} dot={info.visualColor} />
              </DeepBlock>
              <DeepBlock title="¿Dónde suele aparecer?">
                <p className="text-sm leading-relaxed text-white/78">{guide.where}</p>
              </DeepBlock>
              <DeepBlock title="¿Qué puede indicar un nivel alto?">
                <p className="text-sm leading-relaxed text-white/78">{guide.highIndicates}</p>
              </DeepBlock>
              <DeepBlock title="Efectos posibles">
                <CardList items={guide.effects} dotClassName="bg-white/40" />
              </DeepBlock>
              <DeepBlock title="Qué puede salir bien">
                <CardList items={guide.goodWhenLow} dotClassName="bg-emerald-300/80" />
              </DeepBlock>
              <DeepBlock title="Qué puede salir mal">
                <CardList items={guide.badWhenHigh} dotClassName="bg-orange-300/80" />
              </DeepBlock>
              <DeepBlock title="Lo que el mapa no puede afirmar">
                <CardList items={guide.cannotAssert} dot="#94a3b8" />
              </DeepBlock>
              {guide.warning && (
                <div className="rounded-2xl border border-amber-200/15 bg-amber-200/8 px-3 py-2 text-sm text-amber-50/90">
                  {guide.warning}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function AqiScaleTable() {
  return (
    <div>
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.07]">
              {AQI_SCALE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="h-11 px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AQI_SCALE_ROWS.map((row) => (
              <tr key={row.categoria} className="border-b border-white/8 transition-colors hover:bg-white/[0.03] last:border-0">
                <td className="px-3 py-2.5 align-top text-sm font-semibold text-white">{row.rango}</td>
                <td className="px-3 py-2.5 align-top">
                  <span className="flex items-center gap-2 text-sm text-white/75">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.colorName}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top text-sm text-white/85">{row.categoria}</td>
                <td className="px-3 py-2.5 align-top text-sm leading-relaxed text-white/70">{row.interpretacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 md:hidden">
        {AQI_SCALE_ROWS.map((row) => (
          <div key={row.categoria} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">{row.rango}</span>
              <span className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                {row.colorName}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium text-white/85">{row.categoria}</div>
            <p className="mt-1 text-sm leading-relaxed text-white/70">{row.interpretacion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndexVsConcentrationCard() {
  return (
    <div className="rounded-2xl border border-amber-200/25 bg-amber-200/10 p-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300/90" aria-hidden />
        <h4 className="text-sm font-semibold text-amber-50/90">{INDEX_VS_CONCENTRATION.title}</h4>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {INDEX_VS_CONCENTRATION.body.map((paragraph) => (
          <li key={paragraph} className="flex items-start gap-2 text-sm leading-relaxed text-white/82">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/70" aria-hidden />
            {paragraph}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-white/60">{INDEX_VS_CONCENTRATION.disclaimer}</p>
    </div>
  );
}

function WaqiSection() {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-white">{WAQI_GUIDE.title}</h3>
      <ExecSummary>{WAQI_GUIDE.execSummary}</ExecSummary>
      <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-3 py-2 text-sm text-cyan-50/90">
        {WAQI_GUIDE.clarification}
      </div>

      <DeepBlock title={AQI_SCALE_GUIDE.title}>
        {AQI_SCALE_GUIDE.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-white/78">
            {paragraph}
          </p>
        ))}
        <ul className="mt-2 grid gap-1.5">
          {AQI_SCALE_GUIDE.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm leading-relaxed text-white/75">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/80" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <AqiScaleTable />
        </div>
      </DeepBlock>

      <Accordion type="multiple">
        <AccordionItem value="profundizar-waqi" className="border-white/10">
          <AccordionTrigger>
            <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-[15px] font-medium text-white">
              Profundizar sobre WAQI y los datos
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Accordion type="multiple">
                <AccordionItem value="medicion" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {MEASUREMENT_METHODS.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <DeepBlock title={MEASUREMENT_METHODS.groundStations.title}>
                        <p className="text-sm leading-relaxed text-white/78">
                          {MEASUREMENT_METHODS.groundStations.text}
                        </p>
                        <dl className="mt-2 grid gap-1.5">
                          {MEASUREMENT_METHODS.groundStations.techniques.map((technique) => (
                            <div key={technique.pollutants} className="flex flex-col gap-0.5">
                              <dt className="text-sm font-medium text-white/85">{technique.pollutants}</dt>
                              <dd className="text-sm leading-relaxed text-white/72">{technique.detail}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="mt-2 rounded-2xl border border-amber-200/15 bg-amber-200/8 px-3 py-2 text-sm text-amber-50/90">
                          {MEASUREMENT_METHODS.groundStations.note}
                        </p>
                      </DeepBlock>
                      <DeepBlock title={MEASUREMENT_METHODS.satellites.title}>
                        {MEASUREMENT_METHODS.satellites.text.split("\n\n").map((paragraph) => (
                          <p key={paragraph} className="text-sm leading-relaxed text-white/78">
                            {paragraph}
                          </p>
                        ))}
                        <CardList items={MEASUREMENT_METHODS.satellites.aclaraciones} dotClassName="bg-white/40" />
                      </DeepBlock>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="quien-publica" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {DATA_PROVIDERS_GUIDE.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {DATA_PROVIDERS_GUIDE.levels.map((level) => (
                        <div key={level.name} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <h4 className="text-sm font-semibold text-white/85">{level.name}</h4>
                          <ul className="mt-1.5 flex flex-wrap gap-1.5">
                            {level.actors.map((actor) => (
                              <li
                                key={actor}
                                className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs text-white/70"
                              >
                                {actor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-3 py-2 text-sm text-cyan-50/90">
                        {DATA_PROVIDERS_GUIDE.important}
                      </div>
                      <p className="text-xs leading-relaxed text-white/55">{DATA_PROVIDERS_GUIDE.disclaimer}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dominante" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {DOMINANT_POLLUTANT.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {DOMINANT_POLLUTANT.body.split("\n\n").map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-relaxed text-white/78">
                          {paragraph}
                        </p>
                      ))}
                      <p className="text-xs leading-relaxed text-white/55">{DOMINANT_POLLUTANT.disclaimer}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="indice-vs-concentracion" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {INDEX_VS_CONCENTRATION.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <IndexVsConcentrationCard />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="comparacion-fuentes" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {DATA_SOURCES_COMPARISON.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ResponsiveTable
                      columns={DATA_SOURCES_COMPARISON.columns}
                      rows={DATA_SOURCES_COMPARISON.rows}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="plataforma" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {PLATFORM_SOURCES.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {PLATFORM_SOURCES.sources.map((source) => (
                        <div key={source.name} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <h4 className="text-sm font-semibold text-white/85">{source.name}</h4>
                          <CardList items={source.items} dotClassName="bg-white/40" />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="limitaciones-waqi" className="border-white/10">
                  <AccordionTrigger>
                    <span className="flex flex-1 items-center gap-2 py-0.5 text-left text-sm font-medium text-white">
                      {WAQI_LIMITATIONS.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardList items={WAQI_LIMITATIONS.items} dotClassName="bg-white/40" />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function EducationGuide({
  onClose,
}: {
  onClose: () => void;
}) {
  const sections: GuideSection[] = useMemo(
    () =>
      SECTION_ORDER.map((section) => {
        switch (section.id) {
          case "que-muestra":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{MAP_GUIDE.summary}</ExecSummary>
                  <div className="space-y-2 text-sm leading-relaxed text-white/78">
                    {MAP_GUIDE.intro.split("\n\n").map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <DeepBlock title="¿De qué consta la plataforma?">
                    <p className="text-sm text-white/75">{PLATFORM_COMPONENTS.intro}</p>
                    <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-sm leading-relaxed text-white/75">
                      {PLATFORM_COMPONENTS.items.map((item) => (
                        <li key={item.title}>
                          <span className="font-medium text-white/85">{item.title}:</span> {item.body}
                        </li>
                      ))}
                    </ol>
                  </DeepBlock>
                  <CategoryLegend />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MAP_GUIDE.subsections.map((subsection) => (
                      <div key={subsection.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <h4 className="text-sm font-semibold text-white/85">{subsection.title}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/72">{subsection.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            };
          case "medicion-vs-interpolacion":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{DIRECT_VS_INTERPOLATION.summary}</ExecSummary>
                  <ResponsiveTable
                    columns={DIRECT_VS_INTERPOLATION.columns}
                    rows={DIRECT_VS_INTERPOLATION.rows}
                  />
                </div>
              ),
            };
          case "que-aporta":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{GOOD_THINGS.summary}</ExecSummary>
                  <CardList items={GOOD_THINGS.items} dotClassName="bg-emerald-300/80" />
                  <div className="rounded-2xl border border-amber-200/15 bg-amber-200/8 px-3 py-2 text-sm text-amber-50/90">
                    {GOOD_THINGS.disclaimer}
                  </div>
                </div>
              ),
            };
          case "limitaciones":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{MISCONCEPTIONS.summary}</ExecSummary>
                  <ol className="grid gap-2">
                    {MISCONCEPTIONS.items.map((item, index) => (
                      <li key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/70">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-white/85">{item.title}</div>
                          <p className="mt-1 text-sm leading-relaxed text-white/70">{item.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ),
            };
          case "comparacion":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{POLLUTANT_COMPARISON.summary}</ExecSummary>
                  <ResponsiveTable columns={POLLUTANT_COMPARISON.columns} rows={POLLUTANT_COMPARISON.rows} />
                  <p className="text-xs leading-relaxed text-white/55">
                    «Efecto principal» describe una posibilidad asociada al contaminante; no significa
                    que todos los valores altos produzcan ese efecto ni que el mapa pueda diagnosticarlo.
                  </p>
                </div>
              ),
            };
          case "waqi":
            return {
              ...section,
              content: <WaqiSection />,
            };
          case "cobertura-frescura":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{COVERAGE_FRESHNESS.summary}</ExecSummary>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {COVERAGE_FRESHNESS.items.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <h4 className="text-sm font-semibold text-white/85">{item.title}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/72">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            };
          case "metodologia":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{METHODOLOGY.summary}</ExecSummary>
                  <ol className="grid gap-2 sm:grid-cols-2">
                    {METHODOLOGY.steps.map((step, index) => (
                      <li key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/70">
                          {index + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-white/78">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-3 py-2 text-sm text-cyan-50/85">
                    {METHODOLOGY.note}
                  </div>
                </div>
              ),
            };
          case "glosario":
            return {
              ...section,
              content: (
                <div className="space-y-3">
                  <ExecSummary>{GLOSSARY.summary}</ExecSummary>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {GLOSSARY.entries.map((entry) => (
                      <div key={entry.term} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <dt className="text-sm font-semibold text-white/85">{entry.term}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-white/72">{entry.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ),
            };
          default:
            return { ...section, content: null };
        }
      }),
    [],
  );

  return (
    <Sheet open modal={false} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        aria-label="Guía para leer el mapa"
        overlayClassName="pointer-events-none bg-black/0"
        className={cn(
          "inset-x-2 bottom-2 flex max-h-[86vh] flex-col rounded-[1.75rem] border-white/10 bg-slate-950/92 p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl",
          "md:inset-y-4 md:left-auto md:right-4 md:top-4 md:h-auto md:max-h-[calc(100vh-2rem)] md:w-[min(42rem,38vw)] md:max-w-[42rem] md:rounded-[1.75rem] md:border",
        )}
      >
        <section className="flex min-h-0 flex-1 flex-col" aria-label="Guía para leer el mapa">
          <SheetHeader className="sticky top-0 z-10 flex-row items-start justify-between gap-3 border-b border-white/10 bg-slate-950/95 p-4 text-left backdrop-blur-2xl">
            <div>
              <SheetTitle className="text-lg font-semibold text-white">Guía para leer el mapa</SheetTitle>
              <SheetDescription className="mt-1 text-sm text-white/62">
                Documentación general del mapa, los datos, la cobertura y la interpretación.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm text-white/72 transition hover:bg-white/14 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
            >
              Cerrar
            </button>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <Accordion type="multiple" className="mt-2">
              {sections.map((section) => (
                <AccordionItem key={section.id} value={section.id} className="border-white/10">
                  <AccordionTrigger>
                    <SectionTrigger title={section.title} summary={section.summary} />
                  </AccordionTrigger>
                  <AccordionContent>{section.content}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
