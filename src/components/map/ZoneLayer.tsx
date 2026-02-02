// src/components/map/ZoneLayer.tsx
import { useMemo, useState } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";
import type { ZoneFeature } from "@/lib/geo/geojson";
import { getZoneId, getZoneName, toLeafletPositions } from "@/lib/geo/geojson";

type Props = {
  features: ZoneFeature[];
  selectedId?: string | null;
  onSelect: (f: ZoneFeature | null) => void;
};

export function ZoneLayer({ features, selectedId, onSelect }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const baseStyle = useMemo(
    () => ({
      color: "rgba(17, 24, 39, 0.22)",       // borde gris suave
      weight: 1,
      fillColor: "rgba(255,255,255,0.02)",   // casi transparente (Apple)
      fillOpacity: 0.06,
    }),
    []
  );

  const hoverStyle = useMemo(
    () => ({
      color: "rgba(17, 24, 39, 0.45)",
      weight: 2,
      fillColor: "rgba(255,255,255,0.08)",
      fillOpacity: 0.14,
    }),
    []
  );

  const selectedStyle = useMemo(
    () => ({
      color: "rgba(17, 24, 39, 0.65)",
      weight: 2,
      fillColor: "rgba(255,255,255,0.10)",
      fillOpacity: 0.18,
    }),
    []
  );

  return (
    <>
      {features.map((f, idx) => {
        const id = getZoneId(f, idx);
        const name = getZoneName(f, idx);

        const positions = toLeafletPositions(f.geometry) as
          | LatLngExpression[][]
          | LatLngExpression[][][];

        const isHover = hoverId === id;
        const isSelected = selectedId === id;

        const pathOptions = isSelected ? selectedStyle : isHover ? hoverStyle : baseStyle;

        return (
          <Polygon
            key={`zone-${id}`}
            positions={positions}
            pathOptions={pathOptions}
            eventHandlers={{
              mouseover: () => setHoverId(id),
              mouseout: () => setHoverId((cur) => (cur === id ? null : cur)),
              click: (e: LeafletMouseEvent) => {
                e.originalEvent?.stopPropagation?.();
                onSelect(f);
              },
            }}
          >
            {/* Tooltip minimal (aparece al hover) */}
            <Tooltip sticky direction="top" opacity={0.9}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{name}</div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
