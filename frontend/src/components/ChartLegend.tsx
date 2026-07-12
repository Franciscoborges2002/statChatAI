export interface LegendItem {
  label: string;
  color: string;
  shape: "circle" | "square" | "line";
}

interface Props {
  items: LegendItem[];
}

/** Shape + color double-encodes team identity so it survives colorblindness. */
export function ChartLegend({ items }: Props) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className={
              item.shape === "circle"
                ? "size-2.5 shrink-0 rounded-full"
                : item.shape === "square"
                  ? "size-2.5 shrink-0"
                  : "h-0.5 w-4 shrink-0 rounded-full"
            }
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
