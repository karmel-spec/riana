import type { LabResult } from "@/lib/types";
import { fmtDate } from "@/lib/format";

/** A small inline SVG line chart with the reference range shaded. Server-rendered. */
export function LabChart({ series, title }: { series: LabResult[]; title: string }) {
  if (series.length < 2) return <p className="text-ink-soft">Not enough results yet to chart.</p>;
  const W = 420, H = 170, L = 36, R = 12, T = 18, B = 30;
  const values = series.map((s) => s.value);
  const lo = series[0].ref_low, hi = series[0].ref_high;
  const min = Math.min(...values, lo ?? Infinity) - 0.3;
  const max = Math.max(...values, hi ?? -Infinity) + 0.3;
  const x = (i: number) => L + (i * (W - L - R)) / (series.length - 1);
  const y = (v: number) => T + ((max - v) * (H - T - B)) / (max - min);
  const pts = series.map((s, i) => `${x(i)},${y(s.value)}`).join(" ");
  const last = series[series.length - 1];
  const flagged = series.filter((s) => s.flag !== "normal");
  const label = `${title}: ${series.length} results from ${fmtDate(series[0].taken_on, { year: "numeric" })} to ${fmtDate(last.taken_on, { year: "numeric" })}. Latest ${last.value}${last.unit ?? ""}${last.flag !== "normal" ? `, ${last.flag}` : ""}. ${flagged.length} out of range.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        {lo !== null && hi !== null && (
          <>
            <rect x={L} y={y(hi)} width={W - L - R} height={y(lo) - y(hi)} fill="var(--evergreen-tint)" />
            <text x={W - R - 4} y={y(hi) + 13} textAnchor="end" fontSize="11" fill="var(--evergreen)">normal range</text>
          </>
        )}
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="var(--rule)" />
        <polyline points={pts} fill="none" stroke="var(--evergreen)" strokeWidth="3" strokeLinejoin="round" />
        {series.map((s, i) => (
          <g key={s.id}>
            {s.flag === "normal"
              ? <circle cx={x(i)} cy={y(s.value)} r="4" fill="var(--evergreen)" />
              : <circle cx={x(i)} cy={y(s.value)} r="7" fill="var(--ember)" stroke="var(--paper)" strokeWidth="2" />}
            {(i === 0 || i === series.length - 1) && (
              <text x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : "end"} fontSize="11" fill="var(--ink-soft)">
                {fmtDate(s.taken_on, { month: "short", year: "2-digit" })}
              </text>
            )}
          </g>
        ))}
        <text x={x(series.length - 1) - 10} y={y(last.value) - 12} textAnchor="end" fontSize="13" fontWeight="700"
          fill={last.flag === "normal" ? "var(--evergreen)" : "var(--ember)"}>
          {last.value}{last.unit} {last.flag !== "normal" ? `· ${last.flag}` : ""}
        </text>
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
