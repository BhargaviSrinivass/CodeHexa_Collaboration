import { memo, useMemo, useState } from "react";

interface ActivityHeatmapProps {
  data: Record<string, { count: number; minutes: number }>;
}

function level(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVEL_COLORS = [
  "var(--color-heatmap-0)",
  "var(--color-heatmap-1)",
  "var(--color-heatmap-2)",
  "var(--color-heatmap-3)",
  "var(--color-heatmap-4)",
];

export const ActivityHeatmap = memo(function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    date: string;
    count: number;
    minutes: number;
  } | null>(null);

  const { cells, weeks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const list: { date: string; count: number; minutes: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = data[key] || { count: 0, minutes: 0 };
      list.push({ date: key, count: entry.count, minutes: entry.minutes });
      cursor.setDate(cursor.getDate() + 1);
    }
    const weekCount = Math.ceil(list.length / 7);
    return { cells: list, weeks: weekCount };
  }, [data]);

  const activeDays = cells.filter((c) => c.count > 0).length;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Activity</h3>
        <p className="text-xs text-text-secondary">{activeDays} active days in the last year</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="inline-grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${weeks}, 11px)`,
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
          }}
        >
          {cells.map((c) => (
            <button
              key={c.date}
              type="button"
              className="h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125"
              style={{ backgroundColor: LEVEL_COLORS[level(c.count)] }}
              onMouseEnter={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setTip({
                  x: rect.left,
                  y: rect.top - 8,
                  date: c.date,
                  count: c.count,
                  minutes: c.minutes,
                });
              }}
              onMouseLeave={() => setTip(null)}
              aria-label={`${c.date}: ${c.count} activities`}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-secondary">
        <span>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <span
            key={i}
            className="inline-block h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ))}
        <span>More</span>
      </div>
      {tip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs shadow-lg"
          style={{ left: tip.x, top: tip.y, transform: "translate(-40%, -100%)" }}
        >
          <p className="font-semibold">{tip.date}</p>
          <p className="text-text-secondary">
            {tip.count} problem{tip.count === 1 ? "" : "s"} · {tip.minutes} min
          </p>
        </div>
      )}
    </div>
  );
});
