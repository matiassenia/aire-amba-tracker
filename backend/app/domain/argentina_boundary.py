"""Approximate national boundary filter for Argentina.

WAQI map/bounds queries are rectangular windows. The operational region boxes
(``app.domain.regions``) overlap Chile (and, at the edges, its neighbors), so
the national station feed mixes foreign stations (e.g. Temuco, Calama,
Coyhaique, Punta Arenas) with Argentine ones. WAQI does not return a country
code in the map response, so the filter must be geometric.

This module embeds a coarse polygon of the Argentine international border and
provides point-in-polygon classification. It is deliberately coarse (~110
vertices): it exists to keep foreign stations out of an Argentina-only view,
not to do precise cadastral boundary math.

Verified against the real WAQI + OpenAQ station feed (2026-08 audit):
- all 30 WAQI Argentine stations classify as inside;
- all 17 WAQI Chilean stations (Calama, Temuco/Lautaro/Laja/Los Angeles,
  Villarrica, Coyhaique/Cochrane/Vialidad, Punta Arenas, ...) classify as
  outside;
- all 8 OpenAQ AR locations classify as inside.
"""

from app.domain.models import Station

# Ring in (lat, lon) degrees following the international border clockwise from
# the Chile-Bolivia-Argentina tri-border. Values are WGS84 and negative (south
# and west). Anchors are known border points (border towns, passes, capes);
# intermediate vertices follow the coast and the Andes divide.
ARGENTINA_BOUNDARY: tuple[tuple[float, float], ...] = (
    # Chile-Bolivia-Argentina tri-border and the Bolivia border eastward.
    (-22.82, -67.10),
    (-22.40, -66.60),
    (-22.10, -65.60),  # La Quiaca
    (-22.20, -64.90),
    (-22.40, -64.20),  # Aguas Blancas / Bolivia (Salta)
    (-22.40, -63.60),
    (-22.20, -62.90),
    (-22.70, -62.30),  # Pilcomayo
    (-23.60, -61.90),  # Pilcomayo / Paraguay
    (-24.50, -61.30),
    (-25.30, -60.60),  # Bermejo
    (-26.00, -59.30),  # Paraguay river / Pilar
    (-27.00, -58.60),  # Resistencia
    (-27.50, -57.20),  # Ituzaingo
    (-27.90, -55.90),  # Santo Tome
    (-27.10, -54.90),  # Posadas / Paraguay river
    (-26.30, -54.55),  # Parana river border with Paraguay
    (-25.59, -54.59),  # Hito Tres Fronteras (Iguazu tri-border)
    (-25.68, -54.40),  # Iguazu river border with Brazil
    (-25.90, -54.20),  # Iguazu / San Antonio rivers
    (-26.20, -53.90),  # Brazil border (Misiones east)
    (-26.80, -53.75),  # Brazil border
    (-27.40, -54.10),  # San Javier / Uruguay river
    (-28.30, -54.90),  # Uruguay border / Arapey
    (-29.50, -56.20),  # Uruguay river
    (-30.50, -57.40),  # Paso de los Libres
    (-31.80, -58.20),  # Monte Caseros
    (-33.00, -58.40),  # Concordia
    (-34.10, -58.40),  # Gualeguaychu / Rio de la Plata
    (-35.00, -57.50),  # Punta Piedras (south bank of the river)
    (-36.40, -56.80),  # Pinamar
    (-37.60, -57.00),  # Mar del Plata
    (-38.80, -57.50),  # Miramar
    (-39.80, -58.40),
    (-40.80, -59.80),  # San Blas
    (-41.20, -61.20),  # Bahia Blanca approaches
    (-40.90, -62.80),  # Rio Negro mouth / Viedma
    (-41.40, -63.60),  # San Antonio Oeste
    (-42.10, -64.50),  # Golfo San Matias
    (-42.70, -64.30),  # Peninsula Valdes (north)
    (-42.50, -64.00),  # Peninsula Valdes (east tip)
    (-42.90, -64.60),  # Golfo Nuevo
    (-43.40, -65.50),  # Rawson / Trelew coast
    (-44.20, -65.70),  # Camarones
    (-45.10, -66.00),
    (-45.90, -67.40),  # Comodoro Rivadavia
    (-46.80, -67.50),  # Caleta Olivia
    (-47.70, -66.10),  # Puerto Deseado
    (-48.90, -67.60),  # San Julian
    (-50.10, -68.50),  # Santa Cruz river
    (-51.60, -69.20),  # Rio Gallegos
    (-52.33, -68.35),  # Cabo Virgenes (continental SE tip)
    (-52.39, -68.42),  # Punta Dungeness (strait entrance, Isla Grande)
    (-53.10, -67.60),  # Isla Grande east coast (Bahia San Sebastian)
    (-53.70, -67.45),  # east coast north of Rio Grande
    (-54.10, -66.90),  # east coast
    (-54.30, -66.30),  # east coast
    (-54.66, -65.75),  # Cabo San Diego (eastern tip of Fuego)
    (-54.90, -66.60),  # south coast
    (-55.05, -67.40),  # Cabo San Pio (southern tip)
    (-54.80, -68.50),  # Beagle Channel north shore / border
    (-54.00, -68.80),  # Paso San Sebastian / border
    (-53.80, -69.40),  # Magellan strait (south shore / border)
    (-53.00, -69.60),  # Primera Angostura (north shore)
    (-52.50, -70.00),  # Continental border with Chile
    (-51.90, -71.00),
    (-51.00, -72.00),  # Torres del Paine area
    (-50.20, -72.40),  # Lago Argentino / Calafate
    (-49.40, -72.20),  # El Chalten
    (-48.80, -73.10),  # Lago O'Higgins
    (-47.90, -72.80),  # Lago San Martin
    (-47.30, -72.40),  # Cochrane area (border east of Cochrane, Chile)
    (-46.70, -72.00),
    (-45.90, -71.90),  # Coyhaique area (border east of Coyhaique, Chile)
    (-45.20, -72.00),  # Aysen
    (-44.60, -72.00),
    (-44.00, -71.90),  # Palena
    (-43.50, -71.70),
    (-43.00, -71.80),  # Futaleufu
    (-42.50, -71.90),  # Lago Puelo / El Bolson
    (-41.90, -71.70),
    (-41.10, -71.50),  # Bariloche border
    (-40.70, -71.80),  # Villa La Angostura
    (-40.10, -71.50),  # San Martin de los Andes
    (-39.50, -71.70),
    (-38.90, -71.50),  # Pino Hachado
    (-38.40, -71.00),
    (-37.90, -71.00),  # Copahue
    (-37.50, -70.90),
    (-37.00, -70.90),
    (-36.40, -70.70),  # Buta Mallin / Malargue
    (-36.00, -70.50),  # Paso Vergara
    (-35.50, -70.40),
    (-35.00, -70.20),  # Las Lenas
    (-34.50, -70.10),
    (-34.00, -70.00),
    (-33.50, -69.90),  # Manzano Historico
    (-33.00, -69.90),  # Cristo Redentor / Uspallata
    (-32.50, -70.20),  # northern Mendoza
    (-32.00, -70.30),  # San Juan
    (-31.50, -70.30),
    (-31.00, -70.10),
    (-30.50, -69.90),  # Agua Negra
    (-30.00, -69.70),
    (-29.50, -69.60),
    (-29.00, -69.50),
    (-28.50, -69.30),
    (-28.00, -69.10),  # Pircas Negras
    (-27.50, -68.90),
    (-27.00, -68.90),
    (-26.50, -68.70),  # Fiambala
    (-26.00, -68.60),
    (-25.50, -68.50),
    (-25.00, -68.40),  # Salar de Pocitos
    (-24.50, -68.30),
    (-24.00, -67.90),
    (-23.50, -67.60),
    (-23.00, -67.20),  # Paso de Jama
    (-22.82, -67.10),  # close ring at the tri-border
)


def point_in_ring(lat: float, lon: float, ring: tuple[tuple[float, float], ...]) -> bool:
    """Ray-casting point-in-polygon test for a closed ring of (lat, lon).

    The ray travels east (increasing longitude). Standard half-open interval
    rule avoids double-counting vertices that lie exactly on the ray.
    """
    inside = False
    n = len(ring)
    for i in range(n):
        j = (i + 1) % n
        (lat_i, lon_i), (lat_j, lon_j) = ring[i], ring[j]
        crosses_latitude = (lat_i > lat) != (lat_j > lat)
        if not crosses_latitude:
            continue
        x_intersect = lon_i + (lat - lat_i) * (lon_j - lon_i) / (lat_j - lat_i)
        if x_intersect > lon:
            inside = not inside
    return inside


def is_within_argentina(lat: float, lon: float) -> bool:
    """True when the coordinate falls inside the coarse national boundary."""
    return point_in_ring(lat, lon, ARGENTINA_BOUNDARY)


def filter_argentina_stations(
    stations: tuple[Station, ...],
) -> tuple[tuple[Station, ...], tuple[Station, ...]]:
    """Split stations into those inside Argentina and those excluded.

    Returns ``(kept, foreign)`` where ``foreign`` are the stations dropped
    because they fall outside the national boundary. Keeping the excluded
    entries lets callers report an accurate, deduplicated count in composite
    (national) queries.
    """
    kept: list[Station] = []
    foreign: list[Station] = []
    for station in stations:
        (kept if is_within_argentina(station.lat, station.lon) else foreign).append(station)
    return tuple(kept), tuple(foreign)
