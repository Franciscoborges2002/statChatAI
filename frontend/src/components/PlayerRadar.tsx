import type { RadarMetric } from "../types";

interface Props {
  metrics: RadarMetric[];
  color: string;
  title?: string;
}

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 48;

function pointFor(index: number, total: number, fraction: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = RADIUS * Math.max(0, Math.min(1, fraction));
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)] as const;
}

export function PlayerRadar({ metrics, color, title }: Props) {
  const n = metrics.length;
  if (n === 0) return null;

  const ariaLabel = title
    ? `${title}: ${metrics.map((m) => `${m.metric} ${m.value}`).join(", ")}`
    : "Player radar chart";

  const rings = [0.25, 0.5, 0.75, 1];
  const polygonPoints = metrics
    .map((m, i) => pointFor(i, n, m.value / m.max).join(","))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="auto" role="img" aria-label={ariaLabel}>
      {rings.map((r) => {
        const pts = Array.from({ length: n }, (_, i) => pointFor(i, n, r).join(",")).join(" ");
        return <polygon key={r} points={pts} fill="none" stroke="var(--gridline)" strokeWidth={1} />;
      })}

      {metrics.map((m, i) => {
        const [x, y] = pointFor(i, n, 1);
        return <line key={m.metric} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="var(--gridline)" strokeWidth={1} />;
      })}

      <polygon points={polygonPoints} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />

      {metrics.map((m, i) => {
        const [x, y] = pointFor(i, n, m.value / m.max);
        return <circle key={m.metric} cx={x} cy={y} r={3} fill={color} />;
      })}

      {metrics.map((m, i) => {
        const [lx, ly] = pointFor(i, n, 1.18);
        return (
          <text
            key={m.metric}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="var(--muted-foreground)"
          >
            {m.metric} ({m.value})
          </text>
        );
      })}
    </svg>
  );
}
