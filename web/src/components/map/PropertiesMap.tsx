import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { Property } from "@/types";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { ABIDJAN_CENTER, activeMarkerIcon, defaultMarkerIcon } from "./leafletSetup";
import "leaflet/dist/leaflet.css";

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 1.2 });
  }, [position, map]);
  return null;
}

interface PropertiesMapProps {
  properties: Property[];
  hoveredId?: string | null;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export function PropertiesMap({ properties, hoveredId, onMarkerClick, className }: PropertiesMapProps) {
  const { formatPrice } = usePriceFormatter();

  const withCoords = useMemo(
    () =>
      properties.filter(
        (p): p is Property & { latitude: number; longitude: number } =>
          p.latitude != null && p.longitude != null
      ),
    [properties]
  );

  const flyTarget = useMemo(() => {
    const hovered = withCoords.find((p) => p.id === hoveredId);
    return hovered ? ([hovered.latitude, hovered.longitude] as [number, number]) : null;
  }, [hoveredId, withCoords]);

  const center = withCoords[0]
    ? ([withCoords[0].latitude, withCoords[0].longitude] as [number, number])
    : ABIDJAN_CENTER;

  return (
    <div className={className ?? "h-full w-full min-h-[280px]"}>
      <MapContainer center={center} zoom={12} className="h-full w-full z-0" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo position={flyTarget} />
        {withCoords.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={p.id === hoveredId ? activeMarkerIcon : defaultMarkerIcon}
            eventHandlers={{
              click: () => onMarkerClick?.(p.id),
            }}
          >
            <Popup>
              <div className="text-sm font-jakarta min-w-[140px]">
                <p className="font-bold">{p.title}</p>
                <p className="text-brand font-semibold">{formatPrice(p.price)}</p>
                <p className="text-gray-500">{p.location}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
