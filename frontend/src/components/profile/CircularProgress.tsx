import { memo } from "react";

interface CircularProgressProps {
  easy: number;
  medium: number;
  hard: number;
  size?: number;
}

export const CircularProgress = memo(function CircularProgress({
  easy,
  medium,
  hard,
  size = 140,
}: CircularProgressProps) {
  const total = Math.max(easy + medium + hard, 1);
  const r = 54;
  const c = 2 * Math.PI * r;
  const easyLen = (easy / total) * c;
  const medLen = (medium / total) * c;
  const hardLen = (hard / total) * c;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="12"
          strokeDasharray={`${easyLen} ${c - easyLen}`}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--color-warning)"
          strokeWidth="12"
          strokeDasharray={`${medLen} ${c - medLen}`}
          strokeDashoffset={-easyLen}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--color-error)"
          strokeWidth="12"
          strokeDasharray={`${hardLen} ${c - hardLen}`}
          strokeDashoffset={-(easyLen + medLen)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold">{easy + medium + hard}</p>
        <p className="text-[10px] uppercase tracking-wide text-text-secondary">Solved</p>
      </div>
    </div>
  );
});
