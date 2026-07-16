import { memo } from "react";

interface ActivityChartProps {
  data: Record<string, number>;
  title: string;
  color?: string;
}

export const ActivityChart = memo(function ActivityChart({
  data,
  title,
  color = "var(--color-accent)",
}: ActivityChartProps) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...entries.map(([, v]) => v));

  if (entries.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        <p className="text-sm text-text-secondary">No activity yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex h-32 items-end gap-1">
        {entries.map(([day, value]) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full min-w-[4px] rounded-t transition-all"
              style={{
                height: `${Math.max(4, (value / max) * 100)}%`,
                backgroundColor: color,
                opacity: value > 0 ? 1 : 0.2,
              }}
              title={`${day}: ${value}`}
            />
            <span className="text-[9px] text-text-secondary">
              {day.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

interface DistributionChartProps {
  data: { label: string; value: number; color?: string }[];
  title: string;
}

export const DistributionChart = memo(function DistributionChart({
  data,
  title,
}: DistributionChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span>{d.label}</span>
              <span className="text-text-secondary">{d.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(d.value / total) * 100}%`,
                  backgroundColor: d.color || "var(--color-accent)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
