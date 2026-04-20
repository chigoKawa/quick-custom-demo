import L from "leaflet";
import {
  TrainFront,
  Building2,
  Plane,
  Hospital,
  GraduationCap,
  Trees,
  UtensilsCrossed,
  Hotel,
  MapPin,
} from "lucide-react";
import type { FC, SVGProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type PointType =
  | "Station"
  | "Building"
  | "Airport"
  | "Hospital"
  | "School"
  | "Park"
  | "Restaurant"
  | "Hotel";

const iconComponents: Record<PointType, FC<SVGProps<SVGSVGElement>>> = {
  Station: TrainFront,
  Building: Building2,
  Airport: Plane,
  Hospital: Hospital,
  School: GraduationCap,
  Park: Trees,
  Restaurant: UtensilsCrossed,
  Hotel: Hotel,
};

const colorMap: Record<PointType, string> = {
  Station: "#3b82f6",
  Building: "#6366f1",
  Airport: "#8b5cf6",
  Hospital: "#ef4444",
  School: "#f59e0b",
  Park: "#22c55e",
  Restaurant: "#f97316",
  Hotel: "#06b6d4",
};

export function getPointTypeIcon(pointType: string): FC<SVGProps<SVGSVGElement>> {
  return iconComponents[pointType as PointType] ?? MapPin;
}

export function getPointTypeColor(pointType: string): string {
  return colorMap[pointType as PointType] ?? "#6b7280";
}

export function createMarkerIcon(pointType: string): L.DivIcon {
  const Icon = getPointTypeIcon(pointType);
  const color = getPointTypeColor(pointType);

  const markup = renderToStaticMarkup(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 2px 8px ${color}66`,
        border: "2px solid white",
      }}
    >
      <Icon width={18} height={18} color="white" />
    </div>
  );

  return L.divIcon({
    html: markup,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}
