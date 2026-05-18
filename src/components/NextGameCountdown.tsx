import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useNextGameTime } from "@/hooks/useNextGameTime";

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

const Unit = ({ value, label }: { value: string | number; label: string }) => (
  <div className="flex flex-col items-center px-3 sm:px-4">
    <span className="font-oswald text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums text-primary">
      {value}
    </span>
    <span className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
  </div>
);

const NextGameCountdown = () => {
  const next = useNextGameTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!next) return null;
  const diff = next.getTime() - now;
  if (diff <= 0) return null;

  const { days, hours, minutes, seconds } = format(diff);
  const when = next.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        Next live stream
      </div>
      <div className="mt-2 flex items-center justify-center divide-x divide-border">
        {days > 0 && <Unit value={days} label="Days" />}
        <Unit value={hours} label="Hours" />
        <Unit value={minutes} label="Min" />
        <Unit value={seconds} label="Sec" />
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">{when}</p>
    </div>
  );
};

export default NextGameCountdown;
