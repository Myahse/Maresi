import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { defaultMarkerIcon, ABIDJAN_CENTER } from "./leafletSetup";
import "leaflet/dist/leaflet.css";

interface PropertyLocationMapProps {
  latitude?: number;
  longitude?: number;
  title: string;
  location: string;
}

export function PropertyLocationMap({ latitude, longitude, title, location }: PropertyLocationMapProps) {
  const position: [number, number] =
    latitude != null && longitude != null ? [latitude, longitude] : ABIDJAN_CENTER;

  return (
    <div className="h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-gray-200">
      <MapContainer center={position} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} icon={defaultMarkerIcon}>
          <Popup>
            <strong>{title}</strong>
            <br />
            {location}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
