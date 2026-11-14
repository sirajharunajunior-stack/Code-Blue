interface SparklineProps {
  values: number[];
  /** Stroke colour, any CSS colour string. */
  color?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  className?: string;
  /** Draw a soft area under the line. */
  area?: boolean;
  /** Show a dot on the newest point. */
  showLast?: boolean;
}

/**
 * Dependency-free sparkline. Deterministic output (no ids, no hooks), so it
 * renders identically on the server and the client.
 */
export function Sparkline({
  values,
  color = "#4ff0e4",
  height = 28,
  width = 96,
  strokeWidth = 1.4,
  className,
  area = true,
  showLast = true,
}: SparklineProps) {
  if (!values.length) {
    return <div className={className} style={{ height }} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = strokeWidth;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);

  const points = values.map((v, i) => [pad + i * stepX, y(v)] as const);
  const line = points.map(([x, py], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${py.toFixed(2)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {area && (
        <path
          d={`${line} L${last[0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`}
          fill={color}
          opacity={0.1}
        />
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {showLast && <circle cx={last[0]} cy={last[1]} r={1.7} fill={color} />}
    </svg>
  );
}
