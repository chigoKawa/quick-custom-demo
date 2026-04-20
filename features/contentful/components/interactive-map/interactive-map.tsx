"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { LatLngBoundsExpression } from "leaflet";
import L from "leaflet";
import type { IMapPoint } from "../../type";
import { createMarkerIcon } from "./map-point-icon";
import MapPointPopup from "./map-point-popup";
import type { Document } from "@contentful/rich-text-types";

const TILE_URLS: Record<string, string> = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

const TILE_ATTRIBUTIONS: Record<string, string> = {
  standard:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  light:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  dark:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
};

interface InteractiveMapProps {
  points: IMapPoint[];
  mapStyle: string;
  defaultZoom?: number;
  defaultCenter?: { lat: number; lon: number };
  enableClustering?: boolean;
  showRouteLines?: boolean;
}

function AutoFitBounds({ points }: { points: IMapPoint[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;

    const bounds = L.latLngBounds(
      points.map((p) => [p.fields.location.lat, p.fields.location.lon])
    );
    map.fitBounds(bounds as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);

  return null;
}

function ScrollWheelToggle({ active, onActivate }: { active: boolean; onActivate: () => void }) {
  const map = useMapEvents({
    click: () => {
      if (!active) {
        onActivate();
        map.scrollWheelZoom.enable();
      }
    },
  });

  useEffect(() => {
    if (active) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [active, map]);

  useEffect(() => {
    const container = map.getContainer();
    const handleMouseLeave = () => {
      if (active) {
        onActivate();
        map.scrollWheelZoom.disable();
      }
    };
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => container.removeEventListener("mouseleave", handleMouseLeave);
  }, [active, map, onActivate]);

  return null;
}

const ROUTE_LINE_STYLES: Record<string, { color: string; opacity: number }> = {
  standard: { color: "#3b82f6", opacity: 0.7 },
  light: { color: "#6366f1", opacity: 0.7 },
  dark: { color: "#60a5fa", opacity: 0.8 },
};

export default function InteractiveMap({
  points,
  mapStyle,
  defaultZoom,
  defaultCenter,
  enableClustering,
  showRouteLines,
}: InteractiveMapProps) {
  const [scrollZoomActive, setScrollZoomActive] = useState(false);
  const style = mapStyle in TILE_URLS ? mapStyle : "standard";
  const center: [number, number] = defaultCenter
    ? [defaultCenter.lat, defaultCenter.lon]
    : [51.505, -0.09];
  const zoom = defaultZoom ?? 13;
  const shouldAutoFit = !defaultCenter && !defaultZoom && points.length > 0;

  const markers = points.map((point) => {
    const { location, title, pointType, summary } = point.fields;
    const icon = createMarkerIcon(pointType as string);

    return (
      <Marker
        key={point.sys.id}
        position={[location.lat, location.lon]}
        icon={icon}
      >
        <Popup>
          <MapPointPopup
            title={title as string}
            pointType={pointType as string}
            summary={summary as Document | undefined}
          />
        </Popup>
      </Marker>
    );
  });

  const routePositions: [number, number][] = points.map((p) => [
    p.fields.location.lat,
    p.fields.location.lon,
  ]);

  const lineStyle = ROUTE_LINE_STYLES[style] ?? ROUTE_LINE_STYLES.standard;

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full aspect-[2/1] md:aspect-[5/2] rounded-xl z-0"
        style={{ isolation: "isolate" }}
      >
        <TileLayer url={TILE_URLS[style]} attribution={TILE_ATTRIBUTIONS[style]} />
        <ScrollWheelToggle
          active={scrollZoomActive}
          onActivate={() => setScrollZoomActive((prev) => !prev)}
        />
        {shouldAutoFit && <AutoFitBounds points={points} />}
        {showRouteLines && routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: lineStyle.color,
              weight: 3,
              opacity: lineStyle.opacity,
              dashArray: "8 6",
            }}
          />
        )}
        {enableClustering ? (
          <MarkerClusterGroup chunkedLoading>{markers}</MarkerClusterGroup>
        ) : (
          markers
        )}
      </MapContainer>
      {!scrollZoomActive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <span className="bg-background/80 backdrop-blur-sm text-xs text-muted-foreground px-3 py-1.5 rounded-full shadow-sm">
            Click the map to enable zoom
          </span>
        </div>
      )}
    </div>
  );
}
