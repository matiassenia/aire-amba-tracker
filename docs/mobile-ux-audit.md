# Mobile UX Audit

Audit scope: frontend mobile experience only. No backend, API, or environmental logic changes are included.

## Summary

The current interface exposes too many simultaneous surfaces over the map. On mobile, the product reads more like a dashboard than a geographic exploration tool. The main risk is not data correctness, but cognitive and tactile overload: the map is partially hidden by controls, permanent legends, status pills, and competing contextual panels.

Primary affected file: `src/components/EnvironmentalMap.tsx`.

## Findings

| Area | Component | Problem | UX impact | Priority |
| --- | --- | --- | --- | --- |
| Map viewport | `src/pages/Index.tsx` | Map uses `75vh` with a `500px` minimum and is followed by a mobile summary card. | Small phones can scroll the document; map does not feel native/fullscreen. | High |
| Summary card | `src/pages/Index.tsx` | Redundant coverage card below the map on mobile. | Splits attention and adds page scroll outside the map. | High |
| Pollutant controls | `src/components/EnvironmentalMap.tsx` | Top pollutant chip row can occupy significant vertical space. | Reduces map visibility and competes with status messages. | High |
| Status pills | `src/components/EnvironmentalMap.tsx` | Coverage, filtered stations, old data, errors, and nearest station can stack simultaneously. | Creates visual noise and hides map content. | High |
| Context panels | `src/components/EnvironmentalMap.tsx` | Pollutant info and station details are separate floating panels. | Competing panels make hierarchy unclear. | High |
| Legend | `src/components/EnvironmentalMap.tsx` | Legend is permanently visible. | Occupies valuable map area and fights bottom controls. | High |
| Bottom navigation | `src/components/layout/BottomBar.tsx` | Fixed bottom region bar competes with mobile bottom sheet. | Bottom edge becomes crowded and hard to use with gesture navigation. | High |
| MapLibre controls | `src/components/map/MapLibreGlobe.tsx` | Seven independent controls are visible on the map. | Too many touch targets; feels like tooling rather than consumer map UI. | High |
| MapLibre info overlays | `src/components/map/MapLibreGlobe.tsx` | Hotspot card, empty state, and explanatory attribution card add extra overlays. | Reduces map-first feel. | Medium |
| Help guide | `src/components/layout/EducationGuide.tsx` | Uses a large secondary sheet. | Acceptable if kept independent; should never merge into AQI sheet. | Medium |
| Leaflet popup | `src/components/map/LeafletMap.tsx` | Popup duplicates station detail. | Can conflict with unified bottom sheet. | Medium |
| Safe areas | Multiple | Existing bottom/top safe helpers are partial. | iPhone notch/Dynamic Island and gesture edges may conflict with controls. | High |

## Component Captures

Textual captures are used because this audit is code-based.

### Current Mobile Stack

```text
Header outside map
Map container
  Top pollutant chips
  Actual / Latest selector
  Multiple status pills
  Permanent legend
  Pollutant panel OR station panel
  Fixed region bottom bar
Summary card below map
```

Impact: too many visible layers and document scroll.

### Desired Mobile Stack

```text
Fullscreen map
  Compact top controls
  Compact map-control cluster
  Independent legend button
  One AQI bottom sheet
Independent help sheet when requested
```

Impact: map remains primary, data appears progressively.

## Responsive Breakpoints

Current breakpoints are mostly Tailwind `sm`, `md`, and `lg` classes embedded directly in components.

Observed issues:

- `md` switches panels from bottom to right, but mobile still has multiple bottom overlays.
- `lg:hidden` summary card creates a mobile-only dashboard surface below the map.
- No single mobile app shell prevents document scroll.

## UX Priorities

1. Remove document scroll on mobile.
2. Keep one primary AQI bottom sheet.
3. Keep legend and help independent.
4. Collapse non-essential map overlays.
5. Ensure 44px minimum touch targets.
6. Respect all safe-area insets.
