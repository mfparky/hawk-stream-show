import { useQuery } from "@tanstack/react-query";

interface WeatherWidgetProps {
  lat: number;
  lon: number;
  venueName: string;
}

// WMO Weather Interpretation Codes → label + emoji
function describeCode(code: number): { label: string; icon: string } {
  if (code === 0)              return { label: "Clear sky",        icon: "☀️" };
  if (code <= 2)               return { label: "Partly cloudy",    icon: "⛅" };
  if (code === 3)              return { label: "Overcast",         icon: "☁️" };
  if (code <= 49)              return { label: "Fog",              icon: "🌫️" };
  if (code <= 57)              return { label: "Drizzle",          icon: "🌦️" };
  if (code <= 67)              return { label: "Rain",             icon: "🌧️" };
  if (code <= 77)              return { label: "Snow",             icon: "❄️" };
  if (code <= 82)              return { label: "Rain showers",     icon: "🌦️" };
  if (code <= 86)              return { label: "Snow showers",     icon: "🌨️" };
  if (code === 95)             return { label: "Thunderstorm",     icon: "⛈️" };
  if (code >= 96)              return { label: "Severe storm",     icon: "🌩️" };
  return                              { label: "Unknown",          icon: "🌡️" };
}

// Format "2026-02-27T14:00" (Open-Meteo local time) → "2:00 PM"
function formatLocalTime(timeStr: string): string {
  const timePart = timeStr.split("T")[1] ?? "";
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

interface OpenMeteoResponse {
  timezone_abbreviation: string;
  current: {
    time: string;
    temperature_2m: number;
    weathercode: number;
    windspeed_10m: number;
  };
}

async function fetchWeather(lat: number, lon: number): Promise<OpenMeteoResponse> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode,windspeed_10m` +
    `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

const WeatherWidget = ({ lat, lon, venueName }: WeatherWidgetProps) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["weather", lat, lon],
    queryFn: () => fetchWeather(lat, lon),
    refetchInterval: 10 * 60_000, // refresh every 10 min
    staleTime:        8 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Weather
        </p>
        <div className="h-10 bg-muted rounded" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Weather
        </p>
        <p className="text-sm text-muted-foreground">Unable to load weather.</p>
      </div>
    );
  }

  const { temperature_2m, weathercode, windspeed_10m, time } = data.current;
  const { label, icon } = describeCode(weathercode);
  const tempC = Math.round(temperature_2m);
  const localTime = formatLocalTime(time);
  const tzAbbr = data.timezone_abbreviation;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Weather at {venueName}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-4xl leading-none" role="img" aria-label={label}>
          {icon}
        </span>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {tempC}°C
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {label} · Wind {Math.round(windspeed_10m)} km/h
          </p>
          {localTime && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {localTime}{tzAbbr ? ` ${tzAbbr}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
