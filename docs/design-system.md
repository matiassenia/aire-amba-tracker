# Design System

This design system documents the mobile-first UI rules for Aire Argentina. It is inspired by Windy, Apple Weather, and Google Maps, with the map as the primary surface.

## Principles

- Map first, data second.
- One primary contextual surface at a time.
- No empty future modules in the UI.
- Progressive disclosure over dashboard density.
- Touch targets must be comfortable for one-handed use.
- Page-level mobile scroll is not allowed.

## Layout

Mobile shell:

- `height: 100dvh`.
- `overflow: hidden`.
- Map fills the shell.
- Bottom sheet is fixed inside the map shell.
- Secondary panels scroll internally only.

Safe-area spacing:

- Top: `calc(0.75rem + env(safe-area-inset-top))`.
- Bottom: `calc(0.75rem + env(safe-area-inset-bottom))`.
- Left: `calc(0.75rem + env(safe-area-inset-left))`.
- Right: `calc(0.75rem + env(safe-area-inset-right))`.

## Breakpoints

| Name | Width | Behavior |
| --- | --- | --- |
| Mobile | `< 768px` | Fullscreen map, bottom sheet states. |
| Tablet | `768px - 1023px` | Wider bottom sheet, map remains primary. |
| Desktop | `>= 1024px` | Context panel may sit on the right, but content model remains singular. |

## Spacing

- 4px: hairline internal spacing.
- 8px: compact control gap.
- 12px: default mobile inset.
- 16px: panel padding.
- 24px: section separation.

## Typography

- App title: 15-16px, semibold.
- Primary sheet value: 28-40px depending on state.
- Body: 14px.
- Caption: 11-12px.
- Labels: uppercase only for short metadata labels.

## Color

Base palette:

- Background: dark navy/black map surface.
- Primary text: white.
- Secondary text: white at 60%-75% opacity.
- Muted text: white at 40%-55% opacity.
- Glass surfaces: slate/black with 45%-90% opacity and blur.
- Accent: cyan for focus rings and active controls.

AQI colors stay governed by existing AQI utilities.

## Touch Targets

- Minimum control size: 44 x 44 px.
- Close buttons: 44 x 44 px hit area.
- Chips: 44px minimum height.
- Segmented control buttons: 40-44px minimum height.
- Bottom sheet handle zone: at least 44px tall.

## Components

### Bottom Sheet

States:

- Collapsed: pollutant name, status, `Actual` or `Histórico` only.
- Half-expanded: AQI, selected station, coverage/freshness, `Actual | Histórico`.
- Expanded: complete detail with internal scroll.

Rules:

- Does not contain legend.
- Does not contain help/education guide.
- Does not contain app configuration.
- Does not expose future empty modules.

### Legend

Rules:

- Defaults collapsed on mobile.
- Opens independently from the bottom sheet.
- Closes without changing selected station, pollutant, or sheet state.
- Uses compact explanatory text.

### Help

Rules:

- Opens independently through a help button.
- Uses a secondary sheet/modal.
- Has internal scroll.
- Never merges with the AQI bottom sheet.

### Pollutant Chips

Rules:

- Horizontal scroll is allowed.
- No dropdown for pollutant selection.
- Active chip is visually distinct.
- Disabled/no-data state can be muted but remains understandable.

### Map Controls

Rules:

- Mobile MapLibre controls are grouped into a single compact floating cluster.
- Secondary actions are hidden behind compact controls when needed.
- Controls must not overlap the bottom sheet handle.

## Overlay Budget

Allowed simultaneously on mobile:

- Compact top app/pollutant controls.
- One map-control cluster.
- One legend button or expanded legend.
- One AQI bottom sheet.

Avoid:

- Stacked warning pills.
- Permanent legends.
- Multiple contextual panels.
- Dashboard cards below the map.
- Page-level scrolling.
