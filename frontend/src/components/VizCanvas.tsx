import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChartSpline, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Visualization, StatCard, MatchMeta } from "../types";
import { ShotMap } from "./ShotMap";
import { PassNetwork } from "./PassNetwork";
import { Momentum } from "./Momentum";
import { PlayerRadar } from "./PlayerRadar";
import { StatsCards } from "./StatsCards";
import { ChartLegend } from "./ChartLegend";

/** Decorative halfway line + center circle behind empty states. */
function CenterCircleMotif() {
  return (
    <svg
      viewBox="0 0 200 120"
      className="pointer-events-none absolute inset-0 m-auto h-40 w-auto opacity-15"
      aria-hidden="true"
      fill="none"
      stroke="var(--pitch-line)"
      strokeWidth="2"
    >
      <line x1="100" y1="4" x2="100" y2="116" />
      <circle cx="100" cy="60" r="34" />
      <circle cx="100" cy="60" r="3" fill="var(--pitch-line)" stroke="none" />
    </svg>
  );
}

interface Props {
  visualization: Visualization | null;
  stats: StatCard[];
  match: MatchMeta | null;
  loading?: boolean;
}

export function VizCanvas({ visualization, stats, match, loading = false }: Props) {
  const reduceMotion = useReducedMotion();
  const teamColors: Record<string, string> = match
    ? { [match.home_team]: "var(--series-1)", [match.away_team]: "var(--series-2)" }
    : {};

  const fade = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.25, ease: "easeOut" as const },
      };

  return (
    <Card className="min-h-0 gap-4 overflow-y-auto py-5">
      {loading ? (
        <CardContent className="flex flex-1 flex-col gap-4 px-5" aria-label="Loading visualization">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="min-h-64 flex-1 rounded-xl" />
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      ) : visualization ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${visualization.type}-${visualization.title}`}
            className="flex min-h-0 flex-1 flex-col gap-4"
            {...fade}
          >
            <CardHeader className="px-5">
              <CardTitle className="text-[15px]">{visualization.title}</CardTitle>
              {describeType(visualization.type) && (
                <CardDescription className="text-xs">
                  {describeType(visualization.type)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-5">
              {match && visualization.type === "shot_map" && (
                <ChartLegend
                  items={[
                    { label: `${match.home_team} (circles)`, color: "var(--series-1)", shape: "circle" },
                    { label: `${match.away_team} (squares)`, color: "var(--series-2)", shape: "square" },
                  ]}
                />
              )}
              {match && visualization.type === "momentum" && (
                <ChartLegend
                  items={[
                    { label: match.home_team, color: "var(--series-1)", shape: "line" },
                    { label: match.away_team, color: "var(--series-2)", shape: "line" },
                  ]}
                />
              )}

              {visualization.type === "shot_map" && visualization.data.shots && (
                <div className="w-full">
                  <ShotMap shots={visualization.data.shots} teamColors={teamColors} homeTeam={match?.home_team} />
                </div>
              )}

              {visualization.type === "pass_network" &&
                visualization.data.nodes &&
                visualization.data.edges && (
                  <div className="w-full">
                    <PassNetwork
                      nodes={visualization.data.nodes}
                      edges={visualization.data.edges}
                      team={visualization.data.team}
                      color={
                        visualization.data.team && teamColors[visualization.data.team]
                          ? teamColors[visualization.data.team]
                          : "var(--series-1)"
                      }
                    />
                  </div>
                )}

              {visualization.type === "momentum" && visualization.data.series && (
                <div className="w-full">
                  <Momentum
                    series={visualization.data.series}
                    goals={visualization.data.goals ?? []}
                    teamColors={teamColors}
                  />
                </div>
              )}

              {visualization.type === "player_radar" && visualization.data.metrics && (
                <div className="mx-auto w-full max-w-[420px]">
                  <PlayerRadar
                    metrics={visualization.data.metrics}
                    color="var(--series-1)"
                    title={visualization.title}
                  />
                </div>
              )}

              {visualization.type === "none" && (
                <div className="relative flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CenterCircleMotif />
                  <MessageSquareText className="size-6 opacity-50" aria-hidden="true" />
                  No chart for this one — the answer's in the chat.
                </div>
              )}

              <StatsCards stats={stats} />
            </CardContent>
          </motion.div>
        </AnimatePresence>
      ) : (
        <CardContent className="relative flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <CenterCircleMotif />
          <ChartSpline className="size-6 opacity-50" aria-hidden="true" />
          Ask about the match to put it on the board.
        </CardContent>
      )}
    </Card>
  );
}

function describeType(type: Visualization["type"]) {
  switch (type) {
    case "shot_map":
      return "Shot map — attacking half, marker size = xG, filled = goal";
    case "pass_network":
      return "Pass network — average positions; circle size = passes made, line width = passes between the pair";
    case "momentum":
      return "Momentum — team involvement per 5-minute window";
    case "player_radar":
      return "Player radar — each axis scaled to its own match max";
    default:
      return "";
  }
}
