
# Plan: Aire AMBA - Apple Weather Edition

## Overview
Transform the current Aire AMBA app into a premium, Apple Weather-inspired air quality visualization with smooth animations, glassmorphism UI, contextual messaging, and an immersive dark theme.

---

## Current State Analysis

The app already has:
- Leaflet map with heat layer visualization
- WAQI API integration with IDW interpolation
- Basic scope toggle (CABA/Conurbano/AMBA)
- Simple HUD overlay with AQI display

Missing for Apple Weather experience:
- Dark theme (currently light)
- Animated particle effects for air flow
- Floating glassmorphism cards
- Contextual health messages
- Zone/neighborhood click interactions
- Smooth spring-based animations
- Mock data fallback when no API token

---

## Architecture

```text
+--------------------------------------------------+
|                   App Shell                       |
|  (Dark theme, full-screen, immersive)            |
+--------------------------------------------------+
|                                                   |
|  +---------------------------------------------+ |
|  |              Interactive Map                 | |
|  |  - CARTO Dark basemap                       | |
|  |  - Zone polygons (clickable)                | |
|  |  - Animated heat layer                      | |
|  |  - Particle canvas overlay                  | |
|  +---------------------------------------------+ |
|                                                   |
|  +------------------+  +----------------------+  |
|  | AQI Summary Card |  | Zone Details Panel   |  |
|  | (top-left, glass)|  | (slide-in from right)|  |
|  +------------------+  +----------------------+  |
|                                                   |
|  +---------------------------------------------+ |
|  |           Bottom Legend + Scope Toggle       | |
|  +---------------------------------------------+ |
+--------------------------------------------------+
```

---

## Implementation Steps

### Step 1: Create Mock Data System
**Files:** `src/data/mockStations.ts`, `src/data/zones.ts`

Create realistic mock station data for Buenos Aires so the app renders immediately:
- 20+ mock stations across AMBA
- AQI values ranging 25-95 (realistic for BA)
- Station names from real neighborhoods
- CABA comunas and Conurbano partidos zone data with simplified polygons

### Step 2: Create Types and Utilities
**Files:** `src/types/airQuality.ts`, `src/lib/aqiUtils.ts`

Define TypeScript interfaces and utility functions:
- Station, Zone, AQILevel types
- `getAqiColor()` - Apple-inspired soft color palette
- `getAqiLabel()` - Spanish labels
- `getContextualMessage()` - Health recommendations based on AQI
- `getConfidenceLevel()` - Estimation confidence

Example contextual messages:
- AQI 0-50: "Excelente dia para caminar al aire libre"
- AQI 51-100: "Buen dia, evita ejercicio intenso prolongado"  
- AQI 101-150: "Grupos sensibles deben limitar actividades"
- AQI 150+: "Mejor quedarse en interiores hoy"

### Step 3: Create useAirQualityData Hook
**File:** `src/hooks/useAirQualityData.ts`

Data hook with mock fallback:
- Try fetching from WAQI API if token exists
- Fall back to mock data automatically
- Expose `isUsingMockData` flag for UI indicator
- Cache results with 10-minute TTL
- IDW estimation for zone AQI values

### Step 4: Update Design System for Dark Theme
**File:** `src/index.css`

Force dark mode and add Apple-inspired styles:
- Dark background as default
- Glassmorphism utility classes
- Soft shadows and subtle borders
- Custom scrollbar styling
- Animation keyframes for particles and cards

### Step 5: Create Animated Particle Layer
**File:** `src/components/map/ParticleLayer.tsx`

Canvas-based particle animation overlay:
- Particles flow based on simulated wind direction
- Speed varies by AQI (slower = more polluted)
- Density varies by zone pollution level
- Subtle, calming motion (not distracting)
- Performance-optimized with requestAnimationFrame

### Step 6: Create Zone Polygons Component
**File:** `src/components/map/ZonePolygons.tsx`

Interactive zone boundaries:
- Soft-colored fill based on estimated AQI
- Subtle white/transparent borders
- Hover effect with slight opacity change
- Click handler to select zone
- Smooth transition animations

### Step 7: Create Glassmorphism UI Components

**File:** `src/components/ui/GlassCard.tsx`
Reusable glass-effect card with:
- backdrop-blur
- Semi-transparent background
- Subtle border and shadow
- Spring-based enter/exit animations

**File:** `src/components/cards/AQISummaryCard.tsx`
Top-left floating summary showing:
- Current average AQI with color indicator
- Status label (Bueno/Moderado/etc)
- Last update time
- Mock data indicator if applicable

**File:** `src/components/cards/ZoneDetailCard.tsx`
Slide-in panel when zone is clicked:
- Zone name
- Estimated AQI with large display
- Contextual health message with emoji
- Nearest 3 stations with distances
- Confidence indicator
- Dominant pollutant
- Smooth spring animation on open/close

### Step 8: Create Bottom Controls
**File:** `src/components/layout/BottomBar.tsx`

Minimal bottom bar with:
- AQI color legend (horizontal)
- Scope toggle pills (CABA / Conurbano / AMBA)
- Glassmorphism styling
- Safe area padding for mobile

### Step 9: Create Main Map Component
**File:** `src/components/AireAmbaMap.tsx`

Orchestrate all map layers:
- CARTO Dark basemap
- Zone polygons layer
- Heat layer (existing, refined)
- Particle canvas overlay
- Station markers (minimal, optional)
- Click/tap handlers

### Step 10: Update Index Page
**File:** `src/pages/Index.tsx`

Full redesign:
- Remove header, go immersive
- Full-screen map as background
- Floating cards positioned absolutely
- Smooth transitions between views
- Integrate all new components

### Step 11: Add Animations with CSS
**File:** `tailwind.config.ts` updates

Add spring-like animation keyframes:
- `slide-in-right` for panels
- `fade-in-up` for cards
- `pulse-soft` for AQI indicators
- `float` for subtle particle motion

---

## Apple Weather Color Palette

AQI ranges with soft, desaturated colors:
- 0-50: `#4ADE80` (soft green)
- 51-100: `#FBBF24` (warm amber)
- 101-150: `#FB923C` (soft orange)
- 151-200: `#F87171` (muted red)
- 201-300: `#A78BFA` (soft purple)
- 300+: `#7F1D1D` (dark maroon)

---

## Contextual Messages (Spanish)

```text
AQI 0-50:
  "Excelente dia para actividades al aire libre"
  "El aire esta limpio, disfruta el exterior"

AQI 51-100:
  "Buen dia para salir, modera el ejercicio intenso"
  "Calidad aceptable para la mayoria"

AQI 101-150:
  "Grupos sensibles deben limitar actividades"
  "Considera reducir tiempo al aire libre"

AQI 151-200:
  "Evita actividades prolongadas afuera"
  "Mejor quedarse en interiores"

AQI 200+:
  "Permanece en interiores"
  "Calidad del aire peligrosa"
```

---

## File Structure (New/Modified)

```text
src/
├── components/
│   ├── AireAmbaMap.tsx          (NEW - main orchestrator)
│   ├── cards/
│   │   ├── AQISummaryCard.tsx   (NEW)
│   │   └── ZoneDetailCard.tsx   (NEW)
│   ├── layout/
│   │   └── BottomBar.tsx        (NEW)
│   ├── map/
│   │   ├── ParticleLayer.tsx    (NEW)
│   │   ├── ZonePolygons.tsx     (NEW)
│   │   └── LeafletMap.tsx       (NEW - wrapped)
│   ├── ui/
│   │   └── GlassCard.tsx        (NEW)
│   ├── HeatLayer.tsx            (KEEP - minor tweaks)
│   └── MapView.tsx              (DEPRECATE)
├── data/
│   ├── mockStations.ts          (NEW)
│   └── zones.ts                 (NEW)
├── hooks/
│   └── useAirQualityData.ts     (NEW)
├── lib/
│   ├── aqiUtils.ts              (NEW)
│   ├── idw.ts                   (KEEP)
│   └── waqi.ts                  (KEEP)
├── types/
│   └── airQuality.ts            (NEW)
├── pages/
│   └── Index.tsx                (MODIFY)
└── index.css                    (MODIFY)
```

---

## Technical Details

### Particle Animation Algorithm
```typescript
// Simplified particle system
particles.forEach(p => {
  // Direction influenced by "wind" (random seed)
  p.x += Math.cos(windAngle) * p.speed
  p.y += Math.sin(windAngle) * p.speed
  
  // Speed inversely proportional to local AQI
  p.speed = baseSpeed * (1 - localAqi / 300)
  
  // Reset when off-screen
  if (outOfBounds(p)) resetParticle(p)
})
```

### Zone Selection State
```typescript
const [selectedZone, setSelectedZone] = useState<Zone | null>(null)

// Click handler on polygon
onZoneClick={(zone) => setSelectedZone(zone)}

// Panel visibility
<ZoneDetailCard 
  zone={selectedZone} 
  onClose={() => setSelectedZone(null)}
/>
```

### Mock Data Fallback Logic
```typescript
const useAirQualityData = () => {
  const token = import.meta.env.VITE_WAQI_TOKEN
  
  if (!token) {
    return {
      stations: MOCK_STATIONS,
      isUsingMockData: true,
      // ...
    }
  }
  
  // Fetch real data...
}
```

---

## Mobile Considerations

- Touch-friendly tap targets (44px minimum)
- Bottom bar respects safe areas
- Zone detail panel slides from bottom on mobile
- Particles reduced on mobile for performance
- Font sizes scale appropriately

---

## Performance Optimizations

- Lazy load Leaflet components
- Throttle particle animation to 30fps
- Memoize IDW calculations
- Debounce zone hover effects
- Use CSS transforms for animations (GPU accelerated)
- Limit visible particles based on device capability

