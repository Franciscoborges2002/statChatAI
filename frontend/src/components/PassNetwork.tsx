import { useMemo, useState } from "react";
import type { PassNetworkEdge, PassNetworkNode } from "../types";

interface Props {
  nodes: PassNetworkNode[];
  edges: PassNetworkEdge[];
  color: string;
  team?: string;
}

const PITCH_LENGTH = 120;
const PITCH_WIDTH = 80;
const VIEW_W = 560;
const VIEW_H = 380;
const PAD = 20;

function scaleX(x: number) {
  return PAD + (x / PITCH_LENGTH) * (VIEW_W - 2 * PAD);
}

function scaleY(y: number) {
  return PAD + (y / PITCH_WIDTH) * (VIEW_H - 2 * PAD);
}

function lastName(fullName: string) {
  const parts = fullName.trim().split(" ");
  return parts[parts.length - 1];
}

export function PassNetwork({ nodes, edges, color, team }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const ariaLabel = team
    ? `${team} pass network: ${nodes.length} players, ${edges.length} passing links`
    : "Pass network";

  const nodeByName = useMemo(() => {
    const m = new Map<string, PassNetworkNode>();
    for (const n of nodes) m.set(n.player, n);
    return m;
  }, [nodes]);

  const maxPasses = Math.max(1, ...nodes.map((n) => n.passes));
  const maxEdge = Math.max(1, ...edges.map((e) => e.count));

  function nodeRadius(passes: number) {
    return 6 + (passes / maxPasses) * 12;
  }

  function edgeWidth(count: number) {
    return 1 + (count / maxEdge) * 7;
  }

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="auto" role="img" aria-label={ariaLabel}>
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="var(--pitch-fill)" rx={8} />
      <rect x={PAD} y={PAD} width={VIEW_W - 2 * PAD} height={VIEW_H - 2 * PAD} fill="none" stroke="var(--pitch-line)" strokeWidth={2} />
      <line x1={VIEW_W / 2} y1={PAD} x2={VIEW_W / 2} y2={VIEW_H - PAD} stroke="var(--pitch-line)" strokeWidth={1.5} />

      {edges.map((e, i) => {
        const src = nodeByName.get(e.source);
        const dst = nodeByName.get(e.target);
        if (!src || !dst) return null;
        const isDim = hovered && hovered !== e.source && hovered !== e.target;
        return (
          <line
            key={i}
            x1={scaleX(src.x)}
            y1={scaleY(src.y)}
            x2={scaleX(dst.x)}
            y2={scaleY(dst.y)}
            stroke={color}
            strokeWidth={edgeWidth(e.count)}
            strokeLinecap="round"
            opacity={isDim ? 0.08 : 0.35}
          />
        );
      })}

      {nodes.map((n) => {
        const r = nodeRadius(n.passes);
        const isDim = hovered && hovered !== n.player;
        return (
          <g
            key={n.player}
            onMouseEnter={() => setHovered(n.player)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
            opacity={isDim ? 0.35 : 1}
          >
            <circle cx={scaleX(n.x)} cy={scaleY(n.y)} r={r + 2} fill="var(--pitch-fill)" />
            <circle cx={scaleX(n.x)} cy={scaleY(n.y)} r={r} fill={color} />
            <text
              x={scaleX(n.x)}
              y={scaleY(n.y) + r + 12}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted-foreground)"
            >
              {lastName(n.player)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
