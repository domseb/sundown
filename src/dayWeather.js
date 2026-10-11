import { useEffect, useState } from "react";

const LOCATION_KEY = "sundown-forecast-location";
const WEEK_KEY = "sundown-forecast-week";

export function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

export function datesFromMonday(mondayIso) {
  const [year, month, day] = mondayIso.split("-").map(Number);
  const monday = new Date(year, month - 1, day, 12);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toISODate(date);
  });
}

/** Monday–Friday currently in progress. On Saturday and Sunday this is the coming week. */
export function getWorkingWeekDates(now = new Date()) {
  const day = now.getDay();
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  const delta = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
  monday.setDate(monday.getDate() + delta);
  return datesFromMonday(toISODate(monday));
}

/** Monday of the next week that has not started. On Saturday and Sunday that is the coming Monday. */
export function getWeekAheadMonday(now = new Date()) {
  const day = now.getDay();
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  const delta = day === 0 ? 1 : day === 6 ? 2 : 8 - day;
  monday.setDate(monday.getDate() + delta);
  return toISODate(monday);
}

export function readDisplayedMonday(now = new Date()) {
  const natural = getWorkingWeekDates(now)[0];
  try {
    const stored = localStorage.getItem(WEEK_KEY);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored) && stored >= natural) return stored;
  } catch {
    /* storage can be unavailable */
  }
  return natural;
}

export function rememberDisplayedMonday(mondayIso) {
  try {
    localStorage.setItem(WEEK_KEY, mondayIso);
  } catch {
    /* storage can be unavailable */
  }
}

export function weatherFromCode(code) {
  if (code === 0 || code === 1) return { kind: "clear", label: "Clear" };
  if (code === 2) return { kind: "partly", label: "Partly cloudy" };
  if (code === 3) return { kind: "cloudy", label: "Cloudy" };
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog" };
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return { kind: "rain", label: "Drizzle" };
  }
  if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67) {
    return { kind: "rain", label: "Rain" };
  }
  if (code === 80 || code === 81 || code === 82) return { kind: "rain", label: "Showers" };
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return { kind: "snow", label: "Snow" };
  }
  if (code === 95 || code === 96 || code === 99) return { kind: "storm", label: "Storm" };
  return { kind: "cloudy", label: "Cloudy" };
}

function readCachedLocation() {
  try {
    const raw = sessionStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function cacheLocation(location) {
  try {
    sessionStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch {
    /* storage can be unavailable */
  }
}

function locationFromGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60 * 60 * 1000 }
    );
  });
}

async function geolocationPermission() {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

async function locationFromNetwork() {
  const response = await fetch("https://get.geojs.io/v1/ip/geo.json");
  if (!response.ok) return null;
  const data = await response.json();
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

async function resolveLocation() {
  const cached = readCachedLocation();
  if (cached) return cached;

  const permission = await geolocationPermission();
  let location = permission === "granted" ? await locationFromGeolocation() : null;

  if (!location) {
    try {
      location = await locationFromNetwork();
    } catch {
      location = null;
    }
  }

  if (!location && permission !== "denied") {
    location = await locationFromGeolocation();
  }

  if (location) cacheLocation(location);
  return location;
}

async function fetchForecast(latitude, longitude, dates) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max",
    timezone: "auto",
    start_date: dates[0],
    end_date: dates[dates.length - 1],
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Forecast request failed");

  const data = await response.json();
  const times = data.daily?.time || [];
  const codes = data.daily?.weather_code || [];
  const temps = data.daily?.temperature_2m_max || [];
  const byDate = new Map(
    times.map((time, index) => [time, { code: codes[index], temp: temps[index] }])
  );

  return dates.map((date) => {
    const day = byDate.get(date);
    if (!day || day.code == null || day.temp == null) return null;
    const { kind, label } = weatherFromCode(day.code);
    return { kind, label, temp: Math.round(day.temp) };
  });
}

export function useWorkingWeekForecast(weekMonday, refreshKey = 0) {
  const [forecasts, setForecasts] = useState(() => Array(5).fill(null));

  useEffect(() => {
    if (!weekMonday) return undefined;
    let cancelled = false;

    (async () => {
      const location = await resolveLocation();
      if (!location || cancelled) return;
      const days = await fetchForecast(
        location.latitude,
        location.longitude,
        datesFromMonday(weekMonday)
      );
      if (!cancelled) setForecasts(days);
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [weekMonday, refreshKey]);

  return forecasts;
}
