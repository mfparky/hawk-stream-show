import { useScoreSettings } from "@/hooks/useScoreSettings";

const ScoreboardWidget = () => {
  const score = useScoreSettings();

  if (!score.enabled) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      {/* Home team */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Home</p>
        <p className="font-bold text-foreground truncate text-sm sm:text-base leading-tight">
          {score.homeTeam || "Home"}
        </p>
      </div>

      {/* Score + status */}
      <div className="flex flex-col items-center shrink-0 text-center">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground leading-none">
            {score.homeScore}
          </span>
          <span className="text-muted-foreground text-xl leading-none">–</span>
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground leading-none">
            {score.awayScore}
          </span>
        </div>
        {score.status && (
          <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {score.status}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 min-w-0 text-right">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Away</p>
        <p className="font-bold text-foreground truncate text-sm sm:text-base leading-tight">
          {score.awayTeam || "Away"}
        </p>
      </div>
    </div>
  );
};

export default ScoreboardWidget;
