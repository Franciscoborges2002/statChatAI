import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { MomentumPoint } from "../types";

interface Props {
  series: MomentumPoint[];
  goals: { minute: number; team: string; player: string }[];
  teamColors: Record<string, string>;
}

const VIEW_W = 600;
const VIEW_H = 320;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 36 };

export function Momentum({ series, goals, teamColors }: Props) {
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);

  const teams = useMemo(() => Array.from(new Set(series.map((p) => p.team))), [series]);

  const byTeam = useMemo(() => {
    const m = new Map<string, MomentumPoint[]>();
    for (const team of teams) {
      m.set(
        team,
        series.filter((p) => p.team === team).sort((a, b) => a.minute - b.minute),
      );
    }
    return m;
  }, [series, teams]);

  const minutes = useMemo(() => Array.from(new Set(series.map((p) => p.minute))).sort((a, b) => a - b), [series]);
  const maxMinute = minutes.length ? minutes[minutes.length - 1] : 90;
  const maxValue = Math.max(1, ...series.map((p) => p.value));

  const x = d3.scaleLinear().domain([0, maxMinute]).range([MARGIN.left, VIEW_W - MARGIN.right]);
  const y = d3
    .scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([VIEW_H - MARGIN.bottom, MARGIN.top]);

  const line = d3
    .line<MomentumPoint>()
    .x((d) => x(d.minute))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const area = d3
    .area<MomentumPoint>()
    .x((d) => x(d.minute))
    .y0(VIEW_H - MARGIN.bottom)
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const yTicks = y.ticks(4);
  const xTicks = x.ticks(6);

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const scale = VIEW_W / rect.width;
    const minute = x.invert(px * scale);
    const nearest = minutes.reduce((a, b) => (Math.abs(b - minute) < Math.abs(a - minute) ? b : a), minutes[0]);
    setHoverMinute(nearest);
  }

  const hoverPoints = hoverMinute != null ? series.filter((p) => p.minute === hoverMinute) : [];

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="auto" role="img" aria-label="Momentum over the match">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={y(t)} y2={y(t)} stroke="var(--gridline)" strokeWidth={1} />
            <text x={MARGIN.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--text-muted)">
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={VIEW_H - MARGIN.bottom + 18} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
            {t}'
          </text>
        ))}

        {teams.map((team) => (
          <path key={`area-${team}`} d={area(byTeam.get(team) ?? []) ?? undefined} fill={teamColors[team] ?? "var(--series-1)"} opacity={0.1} />
        ))}
        {teams.map((team) => (
          <path
            key={`line-${team}`}
            d={line(byTeam.get(team) ?? []) ?? undefined}
            fill="none"
            stroke={teamColors[team] ?? "var(--series-1)"}
            strokeWidth={2}
          />
        ))}

        {goals.map((g, i) => (
          <g key={i}>
            <line x1={x(g.minute)} x2={x(g.minute)} y1={MARGIN.top} y2={VIEW_H - MARGIN.bottom} stroke={teamColors[g.team] ?? "var(--series-1)"} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
            <circle cx={x(g.minute)} cy={MARGIN.top + 4} r={3} fill={teamColors[g.team] ?? "var(--series-1)"} />
          </g>
        ))}

        {hoverMinute != null && (
          <line x1={x(hoverMinute)} x2={x(hoverMinute)} y1={MARGIN.top} y2={VIEW_H - MARGIN.bottom} stroke="var(--baseline)" strokeWidth={1} />
        )}

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={VIEW_W - MARGIN.left - MARGIN.right}
          height={VIEW_H - MARGIN.top - MARGIN.bottom}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverMinute(null)}
        />
      </svg>

      {hoverMinute != null && hoverPoints.length > 0 && (
        <div
          className="shot-tooltip"
          style={{
            left: `min(${(x(hoverMinute) / VIEW_W) * 100}%, 75%)`,
            top: "10%",
          }}
        >
          <div className="tt-title">Minute {hoverMinute}'</div>
          {hoverPoints.map((p) => (
            <div className="tt-row" key={p.team}>
              {p.team}: {p.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
