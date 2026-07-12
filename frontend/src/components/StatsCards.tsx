import { Card } from "@/components/ui/card";
import type { StatCard } from "../types";

interface Props {
  stats: StatCard[];
}

export function StatsCards({ stats }: Props) {
  if (stats.length === 0) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
      {stats.map((s) => (
        <Card key={s.label} className="gap-0.5 rounded-lg bg-secondary/40 px-3 py-2.5">
          <div className="text-[11px] text-muted-foreground">{s.label}</div>
          <div className="text-xl font-semibold tabular-nums">{s.value}</div>
        </Card>
      ))}
    </div>
  );
}
