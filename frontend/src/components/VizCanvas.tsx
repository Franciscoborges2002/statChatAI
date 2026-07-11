import type { Visualization, StatCard, MatchMeta } from "../types";
import { ShotMap } from "./ShotMap";
import { PassNetwork } from "./PassNetwork";
import { Momentum } from "./Momentum";
import { PlayerRadar } from "./PlayerRadar";
import { StatsCards } from "./StatsCards";

interface Props {
  visualization: Visualization | null;
  stats: StatCard[];
  match: MatchMeta | null;
}

export function VizCanvas({ visualization, stats, match }: Props) {
  const teamColors: Record<string, string> = match
    ? { [match.home_team]: "var(--series-1)", [match.away_team]: "var(--series-2)" }
    : {};

  return (
    <section className="panel viz-panel">
      {visualization ? (
        <>
          <div className="viz-header">
            <div className="viz-title">{visualization.title}</div>
            <div className="viz-subtitle">{describeType(visualization.type)}</div>
          </div>

          {match && (visualization.type === "shot_map" || visualization.type === "momentum") && (
            <div className="legend-row">
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: "var(--series-1)" }} />
                {match.home_team}
              </span>
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: "var(--series-2)" }} />
                {match.away_team}
              </span>
            </div>
          )}

          {visualization.type === "shot_map" && visualization.data.shots && (
            <ShotMap shots={visualization.data.shots} teamColors={teamColors} />
          )}

          {visualization.type === "pass_network" && visualization.data.nodes && visualization.data.edges && (
            <PassNetwork
              nodes={visualization.data.nodes}
              edges={visualization.data.edges}
              color={
                visualization.data.team && teamColors[visualization.data.team]
                  ? teamColors[visualization.data.team]
                  : "var(--series-1)"
              }
            />
          )}

          {visualization.type === "momentum" && visualization.data.series && (
            <Momentum
              series={visualization.data.series}
              goals={visualization.data.goals ?? []}
              teamColors={teamColors}
            />
          )}

          {visualization.type === "player_radar" && visualization.data.metrics && (
            <PlayerRadar metrics={visualization.data.metrics} color="var(--series-1)" />
          )}

          {visualization.type === "none" && (
            <div className="viz-empty">No chart for this question — see the written answer.</div>
          )}

          <StatsCards stats={stats} />
        </>
      ) : (
        <div className="viz-empty">Ask a question to render a visualization here.</div>
      )}
    </section>
  );
}

function describeType(type: Visualization["type"]) {
  switch (type) {
    case "shot_map":
      return "Shot map — attacking half, marker size = xG";
    case "pass_network":
      return "Pass network";
    case "momentum":
      return "Momentum over the match";
    case "player_radar":
      return "Player radar";
    default:
      return "";
  }
}
