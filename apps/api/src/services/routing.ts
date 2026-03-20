import { config } from "../lib/config";

interface Coordinates {
  lat: number;
  lng: number;
}

interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: string; // encoded polyline for map rendering
  legs: Array<{
    distanceKm: number;
    durationMinutes: number;
  }>;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

// ─── Geocoding via Nominatim ───
export async function geocode(address: string): Promise<GeocodeResult | null> {
  const url = `${config.nominatimUrl}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "TrackKit/0.1 (delivery-tracking)" },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `${config.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lng}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "TrackKit/0.1 (delivery-tracking)" },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.display_name || null;
}

// ─── Routing via Valhalla ───
export async function getRoute(
  origin: Coordinates,
  destination: Coordinates,
  costing: "auto" | "motorcycle" | "bicycle" = "auto"
): Promise<RouteResult | null> {
  const body = {
    locations: [
      { lat: origin.lat, lon: origin.lng },
      { lat: destination.lat, lon: destination.lng },
    ],
    costing,
    directions_options: { units: "kilometers" },
  };

  const res = await fetch(`${config.valhallaUrl}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data = await res.json();

  const trip = data.trip;
  if (!trip?.legs?.length) return null;

  const totalDistance = trip.summary.length; // km
  const totalDuration = trip.summary.time / 60; // minutes

  return {
    distanceKm: Math.round(totalDistance * 10) / 10,
    durationMinutes: Math.ceil(totalDuration),
    polyline: trip.legs[0].shape, // encoded polyline
    legs: trip.legs.map((leg: any) => ({
      distanceKm: Math.round(leg.summary.length * 10) / 10,
      durationMinutes: Math.ceil(leg.summary.time / 60),
    })),
  };
}

// ─── ETA calculation (lightweight - just distance-based estimate when Valhalla is slow) ───
export function estimateETA(
  driverPos: Coordinates,
  destination: Coordinates,
  avgSpeedKmh: number = 30
): { distanceKm: number; etaMinutes: number } {
  const R = 6371;
  const dLat = ((destination.lat - driverPos.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - driverPos.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((driverPos.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const etaMinutes = Math.ceil((distanceKm / avgSpeedKmh) * 60);

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMinutes,
  };
}
