// LeafletMap - Core map component with dark theme basemap
import { DivIcon } from "leaflet";
import { CircleMarker, MapContainer, Marker, Pane, Popup, TileLayer, useMap } from "react-leaflet";
import { HeatLayer } from "@/components/HeatLayer";
import { ZonePolygons } from "@/components/map/ZonePolygons";
import { AQI_HEAT_GRADIENT, aqiColor } from "@/lib/aqiHeatScale";
import type { Region, Station, Zone } from "@/types/airQuality";
import {
  heatLayerConfig,
  heatPointsForPollutant,
  freshnessMultiplierForStation,
  pollutantValue,
  type PollutantKey,
} from "@/lib/pollutantHeat";
import { clusterStations, shouldClusterStations } from "@/lib/stationClusters";
import { useEffect, useMemo, useState } from "react";
import { useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
  stations: Station[];
  zones: Zone[];
  region: Region | null;
  selectedPollutant: PollutantKey;
  selectedStationUid?: number | null;
  selectedZoneId?: string | null;
  onStationSelect: (station: Station) => void;
  onZoneClick: (zone: Zone) => void;
}

function MapCameraController({ region }: { region: Region | null }) {
  const map = useMap();

  useEffect(() => {
    if (!region) return;
    map.flyTo([region.center[0], region.center[1]], region.default_zoom, { duration: 0.8 });
  }, [map, region]);

  return null;
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });
  useEffect(() => onZoomChange(map.getZoom()), [map, onZoomChange]);
  return null;
}

export function LeafletMap({
  stations,
  zones,
  region,
  selectedPollutant,
  selectedStationUid,
  selectedZoneId,
  onStationSelect,
  onZoneClick,
}: LeafletMapProps) {
  const [zoom, setZoom] = useState(region?.default_zoom ?? 4);
  const center = region?.center ?? [-38.4, -63.6];
  const defaultZoom = region?.default_zoom ?? 4;
  const regionId = region?.id ?? "argentina";

  const heatPoints = useMemo(
    () => heatPointsForPollutant(stations, selectedPollutant),
    [stations, selectedPollutant]
  );
  const heatConfig = useMemo(
    () => heatLayerConfig(regionId, heatPoints.length, zoom, region?.default_zoom ?? 9),
    [regionId, heatPoints.length, zoom, region?.default_zoom]
  );
  const useClusters = shouldClusterStations(regionId, zoom, stations.length);

  const clusters = useMemo(() => {
    if (!useClusters) return [];
    return clusterStations(stations);
  }, [stations, useClusters]);

  const clusterIcons = useMemo(() => {
    return new Map(
      clusters.map((cluster) => [
        cluster.id,
        new DivIcon({
          className: "station-cluster-icon",
          html: `<div class="station-cluster-core">${cluster.stations.length}</div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
      ]),
    );
  }, [clusters]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[center[0], center[1]]}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        preferCanvas
      >
        <MapCameraController region={region} />
        <ZoomTracker onZoomChange={setZoom} />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />

        {/* Visual effects pane: no pointer events. */}
        <Pane name="fx" style={{ zIndex: 450, pointerEvents: "none" }}>
          {heatConfig && (
            <HeatLayer
              points={heatPoints}
              radius={heatConfig.radius}
              blur={heatConfig.blur}
              maxZoom={heatConfig.maxZoom}
              minOpacity={heatConfig.minOpacity}
              max={1}
              gradient={AQI_HEAT_GRADIENT}
              pane="fx"
            />
          )}
        </Pane>

        {/* Approximate AMBA reference zones. */}
        <Pane name="zones" style={{ zIndex: 650, pointerEvents: "auto" }}>
          <ZonePolygons zones={zones} onZoneClick={onZoneClick} selectedZoneId={selectedZoneId} />
        </Pane>

        <Pane name="stations" style={{ zIndex: 700, pointerEvents: "auto" }}>
          {useClusters
            ? clusters.map((cluster) => (
                <Marker
                  key={cluster.id}
                  position={[cluster.lat, cluster.lon]}
                  icon={clusterIcons.get(cluster.id)}
                >
                  <Popup>
                    <div className="min-w-44 text-white">
                      <div className="font-semibold">{cluster.stations.length} estaciones</div>
                      <div className="mt-1 text-sm text-white/70">Agrupadas para la vista nacional.</div>
                    </div>
                  </Popup>
                </Marker>
              ))
            : stations.map((station) => {
            const value = pollutantValue(station, selectedPollutant);
            const hasValue = value !== null;
            const isExpired = hasValue && freshnessMultiplierForStation(station) <= 0;
            const isSelected = selectedStationUid === station.uid;
            const markerColor = hasValue ? aqiColor(value) : "#64748b";

            return (
              <CircleMarker
                key={station.uid}
                center={[station.lat, station.lon]}
                radius={isSelected ? 8 : hasValue ? 6 : 4.5}
                pathOptions={{
                  color: isSelected ? "#ffffff" : isExpired ? "rgba(226,232,240,0.72)" : hasValue ? "rgba(226,246,255,0.9)" : "rgba(255,255,255,0.42)",
                  fillColor: markerColor,
                  fillOpacity: isExpired ? 0.34 : hasValue ? 0.82 : 0.42,
                  opacity: isExpired ? 0.62 : hasValue ? 0.95 : 0.58,
                  weight: isSelected ? 2.5 : 1.5,
                  dashArray: isExpired ? "4 4" : undefined,
                  className: isExpired ? "station-marker station-marker-expired" : hasValue ? "station-marker station-marker-active" : "station-marker",
                }}
                eventHandlers={{
                  click: () => onStationSelect(station),
                }}
              >
                <Popup>
                  <div className="min-w-52 text-white">
                    <div className="font-semibold">{station.name}</div>
                    <div className="mt-1 text-sm text-white/70">
                      {hasValue ? `Valor informado: ${value}` : "Sin datos para el contaminante activo"}
                    </div>
                    {isExpired && (
                      <div className="mt-1 text-sm text-amber-200/90">
                        Dato antiguo: no se usa para interpolación.
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-3 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
                      onClick={() => onStationSelect(station)}
                    >
                      Ver detalle
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </Pane>
      </MapContainer>

    </div>
  );
}
