import { LayoutList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MatchMeta } from "../types";

interface Props {
  match: MatchMeta | null;
  onBrowseGames: () => void;
}

function BallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 text-primary"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.5 7.7 10.6l1.6 5h5.4l1.6-5L12 7.5Z" fill="currentColor" stroke="none" />
      <path d="M12 2v5.5M4.6 6.5l3.1 4.1M2.4 14.7l5.3-.1M9.3 15.6 7 21.2M14.7 15.6l2.3 5.6M21.6 14.7l-5.3-.1M19.4 6.5l-3.1 4.1" />
    </svg>
  );
}

/** Team-color identity chip — color lives here, not in the team name text. */
function TeamDot({ token }: { token: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: `var(${token})` }}
      aria-hidden="true"
    />
  );
}

export function Header({ match, onBrowseGames }: Props) {
  return (
    <header className="flex items-center gap-4 rounded-xl border bg-card px-5 py-3">
      <div className="flex items-center gap-2.5">
        <BallIcon />
        <h1 className="text-sm font-semibold leading-tight">Stat Chat AI</h1>
      </div>

      {match ? (
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <TeamDot token="--series-1" />
              <span className="truncate text-sm font-medium">{match.home_team}</span>
            </span>
            <span className="text-xl font-bold tabular-nums leading-none">
              {match.home_score}–{match.away_score}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium">{match.away_team}</span>
              <TeamDot token="--series-2" />
            </span>
            <Badge variant="secondary" className="px-1.5 text-[10px] font-semibold">
              FT
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {match.competition} {match.season}
            {match.stadium && <span className="hidden sm:inline"> · {match.stadium}</span>}
            {" · "}
            {match.match_date}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading match…</p>
      )}

      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={onBrowseGames}>
        <LayoutList aria-hidden="true" />
        Browse games
      </Button>
    </header>
  );
}
