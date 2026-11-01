import type { DayPoint } from "@/lib/domain";

export function TrendChart({ points }: { points: DayPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const width = 560;
  const height = 156;
  const padX = 8;
  const baseline = 118;
  const innerW = width - padX * 2;
  const gap = 12;
  const barW = (innerW - gap * (points.length - 1)) / points.length;
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const high = points.reduce((sum, point) => sum + point.high, 0);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${total} noticias en 7 días, ${high} con relevancia alta`}
        className="h-40 w-full"
      >
        {[0.33, 0.66, 1].map((step) => {
          const y = baseline - step * 96;
          return (
            <line
              key={step}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeDasharray="3 4"
            />
          );
        })}
        {points.map((point, index) => {
          const x = padX + index * (barW + gap);
          const totalH = (point.count / max) * 96;
          const highH = (point.high / max) * 96;
          return (
            <g key={point.date}>
              <rect x={x} y={baseline - 96} width={barW} height={96} rx={8} fill="var(--bg-muted)" />
              {totalH > 0 ? (
                <rect
                  x={x}
                  y={baseline - totalH}
                  width={barW}
                  height={totalH}
                  rx={8}
                  fill="var(--accent)"
                  opacity={0.35}
                />
              ) : null}
              {highH > 0 ? (
                <rect x={x} y={baseline - highH} width={barW} height={highH} rx={8} fill="var(--accent)" />
              ) : null}
              {point.count > 0 ? (
                <text
                  x={x + barW / 2}
                  y={baseline - totalH - 6}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="11"
                >
                  {point.count}
                </text>
              ) : null}
              <text x={x + barW / 2} y={146} textAnchor="middle" fill="var(--muted)" fontSize="11">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" />
          Relevancia 2–3
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent/40" />
          Resto del día
        </span>
      </figcaption>
    </figure>
  );
}
