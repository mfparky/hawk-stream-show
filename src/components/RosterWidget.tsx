import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Users } from "lucide-react";

interface RosterPlayer {
  id: string;
  jersey_number: string | null;
  player_name: string;
  position: string | null;
}

const RosterWidget = () => {
  const { data: players, isLoading } = useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster")
        .select("*")
        .order("jersey_number", { ascending: true });
      if (error) throw error;
      return data as RosterPlayer[];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="h-4 w-24 rounded bg-muted mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 w-full rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!players || players.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        Team Roster
      </p>
      <div className="space-y-1">
        {players.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 text-sm py-1 border-b border-border last:border-0"
          >
            {p.jersey_number && (
              <span className="text-xs font-bold text-primary w-6 text-right tabular-nums">
                #{p.jersey_number}
              </span>
            )}
            <span className="text-foreground font-medium flex-1">{p.player_name}</span>
            {p.position && (
              <span className="text-xs text-muted-foreground">{p.position}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RosterWidget;
