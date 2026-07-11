import type { StatCard } from "../types";

interface Props {
  stats: StatCard[];
}

export function StatsCards({ stats }: Props) {
  if (stats.length === 0) return null;
  return (
    <div className="stats-row">
      {stats.map((s) => (
        <div className="stat-card" key={s.label}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
