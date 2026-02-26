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

interface OpenMeteoResponse {
  current: {
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

  const { temperature_2m, weathercode, windspeed_10m } = data.current;
  const { label, icon } = describeCode(weathercode);
  const tempF = Math.round(temperature_2m * 9 / 5 + 32);
  const tempC = Math.round(temperature_2m);

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
            {tempF}°F
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              / {tempC}°C
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {label} · Wind {Math.round(windspeed_10m)} km/h
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
