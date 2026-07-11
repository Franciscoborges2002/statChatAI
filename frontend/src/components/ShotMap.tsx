import { useMemo, useState } from "react";
import type { Shot } from "../types";

interface Props {
  shots: Shot[];
  teamColors: Record<string, string>;
}

// StatsBomb pitch is 120x80; shots live in the attacking half (x >= 60).
const PITCH_LENGTH = 120;
const PITCH_WIDTH = 80;
const HALF_START = 60;

const VIEW_W = 560;
const VIEW_H = 400;
const PAD = 20;

function scaleX(x: number) {
  const t = (x - HALF_START) / (PITCH_LENGTH - HALF_START);
  return PAD + t * (VIEW_W - 2 * PAD);
}

function scaleY(y: number) {
  const t = y / PITCH_WIDTH;
  return PAD + t * (VIEW_H - 2 * PAD);
}

function radiusForXg(xg: number) {
  const r = 5 + Math.sqrt(Math.max(xg, 0)) * 22;
  return Math.min(Math.max(r, 5), 16);
}

export function ShotMap({ shots, teamColors }: Props) {
  const [hovered, setHovered] = useState<{ shot: Shot; px: number; py: number } | null>(null);

  const pitchMarkings = useMemo(
    () => ({
      goalY1: scaleY(30),
      goalY2: scaleY(50),
      boxY1: scaleY(18),
      boxY2: scaleY(62),
      boxX: scaleX(102),
      sixYardY1: scaleY(30),
      sixYardY2: scaleY(50),
      sixYardX: scaleX(114),
      penSpotX: scaleX(108),
      penSpotY: scaleY(40),
    }),
    [],
  );

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Shot map, attacking half"
      >
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="var(--pitch-fill)" rx={8} />
        {/* Halfway edge */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={VIEW_H - PAD} stroke="var(--pitch-line)" strokeWidth={2} />
        {/* Pitch boundary */}
        <rect
          x={PAD}
          y={PAD}
          width={VIEW_W - 2 * PAD}
          height={VIEW_H - 2 * PAD}
          fill="none"
          stroke="var(--pitch-line)"
          strokeWidth={2}
        />
        {/* Penalty box */}
        <rect
          x={pitchMarkings.boxX}
          y={pitchMarkings.boxY1}
          width={VIEW_W - PAD - pitchMarkings.boxX}
          height={pitchMarkings.boxY2 - pitchMarkings.boxY1}
          fill="none"
          stroke="var(--pitch-line)"
          strokeWidth={1.5}
        />
        {/* Six-yard box */}
        <rect
          x={pitchMarkings.sixYardX}
          y={pitchMarkings.sixYardY1}
          width={VIEW_W - PAD - pitchMarkings.sixYardX}
          height={pitchMarkings.sixYardY2 - pitchMarkings.sixYardY1}
          fill="none"
          stroke="var(--pitch-line)"
          strokeWidth={1.5}
        />
        {/* Penalty spot */}
        <circle cx={pitchMarkings.penSpotX} cy={pitchMarkings.penSpotY} r={2} fill="var(--pitch-line)" />
        {/* Goal mouth */}
        <line
          x1={VIEW_W - PAD}
          y1={pitchMarkings.goalY1}
          x2={VIEW_W - PAD}
          y2={pitchMarkings.goalY2}
          stroke="var(--pitch-line)"
          strokeWidth={4}
        />

        {shots.map((s, i) => {
          const cx = scaleX(s.x);
          const cy = scaleY(s.y);
          const r = radiusForXg(s.xg);
          const color = teamColors[s.team] ?? "var(--series-1)";
          const isGoal = s.outcome === "goal";
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered({ shot: s, px: cx, py: cy })}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={cx} cy={cy} r={r + 2} fill="var(--pitch-fill)" />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={isGoal ? color : "none"}
                stroke={color}
                strokeWidth={isGoal ? 0 : 2}
                opacity={isGoal ? 1 : 0.85}
              />
              {isGoal && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={700}
                  fill="#ffffff"
                >
                  G
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="shot-tooltip"
          style={{
            left: `min(${(hovered.px / VIEW_W) * 100}%, 70%)`,
            top: `${(hovered.py / VIEW_H) * 100}%`,
          }}
        >
          <div className="tt-title">
            {hovered.shot.player} · {hovered.shot.minute}'
          </div>
          <div className="tt-row">{hovered.shot.team}</div>
          <div className="tt-row">
            xG {hovered.shot.xg.toFixed(2)} · {hovered.shot.outcome_detail}
          </div>
          <div className="tt-row">
            {hovered.shot.body_part} · {hovered.shot.technique}
          </div>
        </div>
      )}
    </div>
  );
}
