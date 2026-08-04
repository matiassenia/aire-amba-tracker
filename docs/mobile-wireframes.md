# Mobile Wireframes

This document defines the proposed mobile-first interface for Aire Argentina before implementation. It is intentionally limited to UX/UI structure and does not introduce new environmental features, backend changes, API changes, or business logic changes.

Primary references: Windy, Apple Weather, and Google Maps.

Core principle: the map is the product. Controls stay compact, contextual, and touch-friendly.

## Scope

In scope:

- Mobile-first map shell.
- One primary bottom sheet for air-quality context.
- Independent compact legend.
- Independent education/help surface.
- No document-level vertical scroll on mobile.
- Full safe-area support for notches, Dynamic Island, and gesture navigation.

Out of scope for this iteration:

- Future visible modules such as Incendios, Calor, or Alertas.
- Empty tabs or placeholder feature surfaces.
- Backend, API, or environmental logic changes.
- Dashboard-style summary cards below the map.

## Product Feel

The interface should feel like a geographic exploration app, not an administrative dashboard.

Target qualities:

- Map-first.
- Minimal overlays.
- One-handed operation.
- Progressive disclosure.
- High touch accuracy.
- Clear hierarchy for non-technical users.

## Safe Areas

All fixed or absolute UI must respect:

- `env(safe-area-inset-top)`
- `env(safe-area-inset-bottom)`
- `env(safe-area-inset-left)`
- `env(safe-area-inset-right)`

Expected placement rules:

- Top controls start below `safe-area-inset-top`.
- Bottom sheet and floating controls sit above `safe-area-inset-bottom`.
- Horizontal padding includes left and right safe areas.
- No tappable control may sit flush against a gesture edge.

## Mobile Collapsed

Default state. The user sees the map first. The bottom sheet is present but compact.

```text
┌─────────────────────────────────────┐
│ safe top / notch area               │
├─────────────────────────────────────┤
│  Aire Argentina              [?]    │
│  Argentina · WAQI                   │
│                                     │
│  [ PM2.5 ] [ PM10 ] [ NO2 ] [ O3 ]  │
│                                     │
│                                     │
│                                     │
│             MAP                     │
│        heat / stations              │
│                                     │
│                                     │
│                         [◎]         │
│                         [+]         │
│                                     │
│  [Leyenda]                          │
│                                     │
│        ┌─────────────────────┐      │
│        │  ───────────────    │      │
│        │  PM10 · Actual      │      │
│        │  Estado disponible  │      │
│        └─────────────────────┘      │
├─────────────────────────────────────┤
│ safe bottom / gesture area          │
└─────────────────────────────────────┘
```

Visible elements:

- Compact brand/status header.
- Help button independent from the main sheet.
- Horizontal pollutant chips.
- Compact map controls.
- Compact legend button.
- Collapsed air-quality bottom sheet.

Behavior:

- Map remains directly pannable and zoomable.
- Bottom sheet drag handle is visible.
- Tapping the sheet or dragging up moves to half-expanded.
- Selecting a station opens the sheet to half-expanded.
- Tapping `Leyenda` opens the legend independently.
- Tapping `?` opens the education guide independently.

Hierarchy:

1. Map.
2. Pollutant selection.
3. Current context in collapsed sheet.
4. Secondary controls.

## Mobile Half-Expanded

Primary interaction state after selecting a station or asking for more detail.

```text
┌─────────────────────────────────────┐
│  Aire Argentina              [?]    │
│  [ PM2.5 ] [ PM10 ] [ NO2 ] [ O3 ]  │
│                                     │
│                                     │
│             MAP                     │
│        still mostly visible         │
│                                     │
│                         [◎]         │
│  [Leyenda]                          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ───────────────                 │ │
│ │ PM10                            │ │
│ │ Actual | Histórico              │ │
│ │                                 │ │
│ │ AQI / Estado                    │ │
│ │ Cobertura y frescura            │ │
│ │ Estación seleccionada, si hay   │ │
│ │ Ver más                         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Bottom sheet content:

- AQI or current status for the selected pollutant.
- Selected pollutant label.
- `Actual | Histórico` segmented control.
- Selected station summary if a station is selected.
- Air-quality state and freshness/cobertura summary.
- A concise `Ver más` affordance for expanded details.

Not included in the bottom sheet:

- Full legend.
- Long educational guide.
- App configuration.
- Future module placeholders.

Behavior:

- Drag down returns to collapsed.
- Drag up opens expanded.
- Map remains visible and interactive in the uncovered area.
- Pollutant chips remain available without opening a dropdown.
- `Actual | Histórico` changes existing view mode only.

Map visibility target:

- Roughly 60%-70% visible in half-expanded state.

## Mobile Expanded

Detail state. Used only when the user intentionally asks for more information.

```text
┌─────────────────────────────────────┐
│  Aire Argentina              [?]    │
│  [ PM2.5 ] [ PM10 ] [ NO2 ] [ O3 ]  │
│                                     │
│              MAP sliver             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ───────────────                 │ │
│ │ PM10 · Actual                   │ │
│ │ AQI / Estado                    │ │
│ │                                 │ │
│ │ Estación seleccionada           │ │
│ │ Contaminantes disponibles       │ │
│ │ Histórico / últimas mediciones  │ │
│ │ Estado de calidad del aire      │ │
│ │ Cobertura                       │ │
│ │                                 │ │
│ │ internal scroll only            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Bottom sheet content:

- Same primary context as half-expanded.
- Station detail if selected.
- Available pollutants for the station.
- Historical/latest measurement context when relevant.
- Air-quality state explanations kept concise.
- Coverage/freshness details.

Behavior:

- The page itself never scrolls.
- Only the expanded sheet scrolls internally.
- Drag down returns to half-expanded, then collapsed.
- Close/clear station returns to pollutant summary.
- Help remains independent and is not embedded here.

Map visibility target:

- A small map portion remains visible to preserve geographic context.

## Legend Interaction

The legend is independent from the bottom sheet.

Collapsed:

```text
[Leyenda]
```

Expanded:

```text
┌─────────────────────────────┐
│ Leyenda                 [x] │
│ ━━━━━━━━━ gradient          │
│ Bueno · Moderado · Dañino   │
│ Interpolación visual        │
└─────────────────────────────┘
```

Rules:

- Opens and closes without changing bottom sheet state.
- Does not cover primary bottom-sheet controls.
- Defaults closed on mobile.
- May remain expanded longer on desktop if space allows.

## Help Interaction

The educational guide remains separate from the primary bottom sheet.

Preferred mobile behavior:

- Opens from `?` or `Guía` button.
- Uses a secondary sheet or lightweight modal.
- Has its own internal scroll.
- Does not alter the air-quality bottom sheet state unless screen space requires temporarily dimming it.

Rules:

- No long guide content inside the main AQI bottom sheet.
- No dashboard-style help panels permanently visible.

## Navigation Flow

Primary flow:

1. User opens app.
2. Map fills the viewport.
3. User pans/zooms map or changes pollutant chip.
4. User taps a station or drags the bottom sheet.
5. Sheet moves to half-expanded with contextual air-quality details.
6. User optionally expands for details.
7. User can switch `Actual | Histórico` from the sheet.
8. User can open legend or help independently.

Station flow:

1. User taps station marker.
2. Station becomes selected on the map.
3. Bottom sheet snaps to half-expanded.
4. Sheet shows station summary and pollutant value.
5. `Ver más` expands detailed station/cobertura information.

Historical flow:

1. User opens half-expanded or expanded sheet.
2. User taps `Histórico` in segmented control.
3. Map changes to latest/historical visualization.
4. Sheet updates concise status text.
5. No dropdown appears.

Legend flow:

1. User taps compact `Leyenda` button.
2. Legend opens as a small independent overlay.
3. User taps `x`, map, or the button again to close.

Help flow:

1. User taps `?`.
2. Education guide opens in a secondary surface.
3. User closes it and returns to the same map/sheet state.

## Bottom Sheet States

Collapsed:

- Height: compact, around 88-116 px plus bottom safe area.
- Purpose: glanceable current context.
- Content: pollutant, current/historical state, quality status.

Half-expanded:

- Height: around 34%-42% of viewport.
- Purpose: main interaction state.
- Content: AQI/status, pollutant, selected station summary, `Actual | Histórico`, freshness/cobertura summary.

Expanded:

- Height: around 72%-82% of viewport.
- Purpose: deliberate detail reading.
- Content: station detail, pollutants, historical/latest data, quality and coverage explanations.
- Scroll: internal only.

State transitions:

- Collapsed to half-expanded: tap sheet, drag up, select station.
- Half-expanded to expanded: drag up or tap `Ver más`.
- Expanded to half-expanded: drag down.
- Half-expanded to collapsed: drag down or tap map.
- Any state to station summary: tap station.

## Tablet

Tablet should keep map-first behavior but reduce vertical sheet dominance.

```text
┌──────────────────────────────────────────────────────┐
│ safe top                                             │
│ Aire Argentina                 [?]                   │
│ [ PM2.5 ][ PM10 ][ NO2 ][ O3 ][ SO2 ][ CO ]          │
│                                                      │
│                    MAP                               │
│                                                      │
│                                      ┌─────────────┐ │
│                                      │ Leyenda     │ │
│                                      └─────────────┘ │
│                                                      │
│     ┌──────────────────────────────────────────┐     │
│     │ bottom sheet: compact or half-expanded   │     │
│     └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

Rules:

- Bottom sheet can be wider but should not become a dashboard.
- Map remains the main canvas.
- Legend may appear as a compact card on the right when expanded.
- Help remains independent.

## Desktop

Desktop can use more horizontal space while preserving the same information model.

```text
┌──────────────────────────────────────────────────────────────┐
│ Aire Argentina                                      [?]       │
│ [ PM2.5 ][ PM10 ][ NO2 ][ O3 ][ SO2 ][ CO ]                  │
│                                                              │
│  ┌──────────────────────────────────────┐ ┌───────────────┐  │
│  │                                      │ │ AQI context   │  │
│  │                 MAP                  │ │ station/info  │  │
│  │                                      │ │ Actual/Hist.  │  │
│  │                                      │ │ quality state │  │
│  └──────────────────────────────────────┘ └───────────────┘  │
│  [Leyenda]                                                    │
└──────────────────────────────────────────────────────────────┘
```

Rules:

- The same contextual content may become a right-side panel on desktop.
- Do not reintroduce multiple competing panels.
- Keep legend independent.
- Keep help independent.
- Avoid visible empty future modules.

## Visual Hierarchy

Priority order:

1. Map and geography.
2. Selected pollutant.
3. Current air-quality status.
4. Selected station context.
5. Freshness/cobertura details.
6. Legend and help.

What should not compete for primary attention:

- Long explanatory copy.
- Multiple warning pills at the same time.
- Permanent legends.
- Region navigation bars that occupy the bottom edge.
- Empty future modules.

## Touch Targets

Minimum targets:

- Buttons: 44 x 44 px.
- Chips: minimum height 44 px.
- Drag handle area: minimum height 24 px, with sheet header target at least 44 px.
- Close buttons: 44 x 44 px hit area.

Spacing:

- Minimum 8 px between compact controls.
- Prefer 12-16 px around clusters of controls.
- Controls near screen edges must include safe-area padding.

## Overlay Rules

Allowed simultaneous mobile overlays:

- Top compact header/chips.
- One compact legend button or expanded legend.
- One primary bottom sheet.
- One small map-control cluster.

Avoid:

- Multiple status pills stacked over the map.
- Station panel plus pollutant panel at the same time.
- Persistent bottom navigation competing with bottom sheet.
- Dropdowns that can leave the viewport.
- Page-level scroll.

## Implementation Notes For Later

Likely affected files after approval:

- `src/pages/Index.tsx`
- `src/components/EnvironmentalMap.tsx`
- `src/components/layout/BottomBar.tsx`
- `src/components/layout/EducationGuide.tsx`
- `src/components/map/MapLibreGlobe.tsx`
- `src/components/map/LeafletMap.tsx`
- `src/index.css`
- `src/components/EnvironmentalMap.test.tsx`

Validation after implementation:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npx tsc -b`
