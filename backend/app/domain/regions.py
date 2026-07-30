from dataclasses import dataclass


@dataclass(frozen=True)
class Bounds:
    south: float
    west: float
    north: float
    east: float

    def as_waqi_latlng(self) -> str:
        return f"{self.south},{self.west},{self.north},{self.east}"


@dataclass(frozen=True)
class Region:
    id: str
    name: str
    bounds: Bounds
    center_lat: float
    center_lon: float
    default_zoom: int
    description: str


# Operational coverage regions for Argentina. Bounds are rectangular query windows,
# not administrative boundaries; they are intentionally documented as operational areas.
ARGENTINA_REGIONS: tuple[Region, ...] = (
    Region(
        id="amba",
        name="AMBA",
        bounds=Bounds(south=-35.0, west=-59.0, north=-34.3, east=-58.0),
        center_lat=-34.62,
        center_lon=-58.45,
        default_zoom=9,
        description="Area operativa para Ciudad de Buenos Aires y conurbano bonaerense.",
    ),
    Region(
        id="centro",
        name="Centro",
        bounds=Bounds(south=-38.8, west=-65.8, north=-30.0, east=-56.0),
        center_lat=-34.2,
        center_lon=-61.0,
        default_zoom=6,
        description="Area operativa para el centro del pais y parte de la region pampeana.",
    ),
    Region(
        id="cuyo",
        name="Cuyo",
        bounds=Bounds(south=-36.2, west=-70.2, north=-28.0, east=-64.0),
        center_lat=-32.2,
        center_lon=-67.3,
        default_zoom=6,
        description="Area operativa para el oeste argentino de Cuyo.",
    ),
    Region(
        id="noa",
        name="NOA",
        bounds=Bounds(south=-30.8, west=-69.8, north=-21.6, east=-62.0),
        center_lat=-26.2,
        center_lon=-65.9,
        default_zoom=6,
        description="Area operativa para el noroeste argentino.",
    ),
    Region(
        id="nea",
        name="NEA",
        bounds=Bounds(south=-31.5, west=-62.8, north=-21.7, east=-53.5),
        center_lat=-26.6,
        center_lon=-58.0,
        default_zoom=6,
        description="Area operativa para el noreste argentino y litoral.",
    ),
    Region(
        id="patagonia-norte",
        name="Patagonia norte",
        bounds=Bounds(south=-43.8, west=-72.8, north=-36.0, east=-62.0),
        center_lat=-39.9,
        center_lon=-68.0,
        default_zoom=6,
        description="Area operativa para el norte de la Patagonia.",
    ),
    Region(
        id="patagonia-sur",
        name="Patagonia sur",
        bounds=Bounds(south=-55.2, west=-73.8, north=-43.0, east=-63.0),
        center_lat=-49.2,
        center_lon=-68.5,
        default_zoom=5,
        description="Area operativa para el sur de la Patagonia.",
    ),
)

ARGENTINA_REGION = Region(
    id="argentina",
    name="Argentina",
    bounds=Bounds(south=-55.2, west=-73.8, north=-21.6, east=-53.5),
    center_lat=-38.4,
    center_lon=-63.6,
    default_zoom=4,
    description="Vista nacional compuesta por regiones operativas cacheadas.",
)

REGION_BY_ID = {region.id: region for region in ARGENTINA_REGIONS}
ALL_REGION_IDS = tuple(region.id for region in ARGENTINA_REGIONS)


def public_regions() -> tuple[Region, ...]:
    return (ARGENTINA_REGION, *ARGENTINA_REGIONS)


def get_region(region_id: str) -> Region | None:
    if region_id == ARGENTINA_REGION.id:
        return ARGENTINA_REGION
    return REGION_BY_ID.get(region_id)
