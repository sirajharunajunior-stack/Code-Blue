"use client";

import { cn } from "@/lib/utils/cn";
import { LEVELS } from "@/lib/health/levels";
import { BODY_SYSTEMS } from "@/lib/data/bodySystems";
import type { BodySystemId, HealthLevel } from "@/types";

/**
 * Interactive frontal body schematic.
 *
 * A real anatomical model would need a licensed asset and a GPU; this stays
 * lightweight, renders on the server, works with keyboard navigation and can
 * never fail to load. Each system has a hotspot, an organ highlight layer and a
 * leader line to a technical label.
 */
export function BodySchematic({
  active,
  onSelect,
  levels,
  className,
}: {
  active: BodySystemId;
  onSelect: (id: BodySystemId) => void;
  levels: Record<BodySystemId, HealthLevel>;
  className?: string;
}) {
  const activeSystem = BODY_SYSTEMS.find((s) => s.id === active);

  return (
    <svg
      viewBox="0 0 200 400"
      className={cn("h-full w-full", className)}
      role="group"
      aria-label="Interactive body map. Select a body system."
    >
      <defs>
        <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f2636" />
          <stop offset="55%" stopColor="#0a1a27" />
          <stop offset="100%" stopColor="#061019" />
        </linearGradient>
        <linearGradient id="scan-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ff0e4" stopOpacity="0" />
          <stop offset="45%" stopColor="#4ff0e4" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#4ff0e4" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4ff0e4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* telemetry grid inside the frame */}
      <g stroke="#4ff0e4" strokeWidth="0.35" opacity="0.055">
        {Array.from({ length: 17 }, (_, i) => (
          <line key={`h-${i}`} x1="24" x2="176" y1={16 + i * 22} y2={16 + i * 22} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v-${i}`} x1={42 + i * 16} x2={42 + i * 16} y1="16" y2="384" />
        ))}
      </g>

      {/* silhouette */}
      <g stroke="#1b3f55" strokeWidth="1.1" fill="url(#body-fill)" strokeLinejoin="round">
        <circle cx="100" cy="42" r="21" />
        <rect x="94" y="59" width="12" height="14" rx="4" />
        <path d="M72 80 C82 73 118 73 128 80 L125 130 C123 148 119 158 112 168 L112 194 L88 194 L88 168 C81 158 77 148 75 130 Z" />
        <path d="M88 190 L112 190 L114 206 L86 206 Z" />
        <path d="M74 86 C64 108 60 150 57 192" fill="none" strokeWidth="13" strokeLinecap="round" />
        <path d="M126 86 C136 108 140 150 143 192" fill="none" strokeWidth="13" strokeLinecap="round" />
        <circle cx="56" cy="198" r="5" />
        <circle cx="144" cy="198" r="5" />
        <path d="M92 204 C90 244 86 276 86 306 L86 348" fill="none" strokeWidth="15" strokeLinecap="round" />
        <path d="M108 204 C110 244 114 276 114 306 L114 348" fill="none" strokeWidth="15" strokeLinecap="round" />
        <ellipse cx="84" cy="354" rx="8" ry="4" />
        <ellipse cx="116" cy="354" rx="8" ry="4" />
      </g>

      {/* skeleton hint */}
      <g
        stroke="#8b9cff"
        strokeWidth="1"
        fill="none"
        opacity={active === "bones" ? 0.85 : 0.22}
        strokeLinecap="round"
        style={{ transition: "opacity 240ms ease" }}
      >
        <path d="M100 68 L100 150" />
        {[88, 97, 106, 115].map((y) => (
          <path key={y} d={`M88 ${y} Q100 ${y - 6} 112 ${y}`} />
        ))}
        <path d="M86 196 Q100 190 114 196" />
        <path d="M92 202 L88 250 L86 300" />
        <path d="M108 202 L112 250 L114 300" />
      </g>

      {/* muscle hint */}
      <g fill="#4ff0e4" opacity={active === "muscles" ? 0.32 : 0.08} style={{ transition: "opacity 240ms ease" }}>
        <ellipse cx="77" cy="92" rx="8" ry="11" />
        <ellipse cx="123" cy="92" rx="8" ry="11" />
        <ellipse cx="63" cy="132" rx="6" ry="15" />
        <ellipse cx="137" cy="132" rx="6" ry="15" />
        <ellipse cx="90" cy="240" rx="8" ry="26" />
        <ellipse cx="110" cy="240" rx="8" ry="26" />
      </g>

      {/* brain */}
      <g
        opacity={active === "brain" ? 0.95 : 0.4}
        style={{ transition: "opacity 240ms ease" }}
      >
        <path
          d="M88 38 C89 27 111 27 112 38 C113 46 108 51 100 51 C92 51 87 46 88 38 Z"
          fill={active === "brain" ? "#4ff0e4" : "#1b8f8a"}
          stroke="#4ff0e4"
          strokeWidth="0.6"
        />
        <path d="M100 30 L100 48 M93 34 Q97 38 94 44 M107 34 Q103 38 106 44" stroke="#03060a" strokeWidth="0.7" opacity="0.55" fill="none" />
      </g>

      {/* eyes */}
      <g opacity={active === "eyes" ? 1 : 0.5} style={{ transition: "opacity 240ms ease" }}>
        <ellipse cx="93" cy="49" rx="3.2" ry="2.2" fill="#4ff0e4" stroke="#03060a" strokeWidth="0.4" />
        <ellipse cx="107" cy="49" rx="3.2" ry="2.2" fill="#4ff0e4" stroke="#03060a" strokeWidth="0.4" />
      </g>

      {/* lungs */}
      <g
        opacity={active === "lungs" ? 0.92 : 0.38}
        style={{ transition: "opacity 240ms ease" }}
        fill={active === "lungs" ? "#4ff0e4" : "#1b8f8a"}
        stroke="#4ff0e4"
        strokeWidth="0.5"
      >
        <path d="M96 96 C87 99 82 111 84 124 C85 132 93 134 95 126 Z" />
        <path d="M104 96 C113 99 118 111 116 124 C115 132 107 134 105 126 Z" />
        <path d="M100 94 L100 118" stroke="#03060a" strokeWidth="0.6" opacity="0.5" />
      </g>

      {/* heart */}
      <g
        opacity={active === "heart" ? 1 : 0.5}
        style={{ transition: "opacity 240ms ease" }}
      >
        <path
          d="M95 105 C90 99 82 103 84 111 C86 118 95 124 95 124 C95 124 104 118 106 111 C108 103 100 99 95 105 Z"
          fill={active === "heart" ? "#ff4d5e" : "#b03a48"}
          stroke="#ff8a94"
          strokeWidth="0.5"
        />
      </g>

      {/* digestive */}
      <g
        opacity={active === "digestive" ? 0.95 : 0.38}
        style={{ transition: "opacity 240ms ease" }}
        fill={active === "digestive" ? "#4ff0e4" : "#1b8f8a"}
        stroke="#4ff0e4"
        strokeWidth="0.5"
      >
        <path d="M97 140 C91 142 90 150 95 153 C100 156 105 152 103 147 C102 143 99 141 97 140 Z" />
        <path
          d="M94 156 C88 162 90 172 98 174 C106 176 111 170 108 164 C106 159 99 157 94 156 Z"
          fill="none"
          strokeWidth="2"
        />
      </g>

      {/* scan sweep */}
      <rect
        x="24"
        y="0"
        width="152"
        height="400"
        fill="url(#scan-gradient)"
        className="animate-sweep"
        pointerEvents="none"
      />

      {/* hotspots */}
      {BODY_SYSTEMS.map((system) => {
        const isActive = system.id === active;
        const level = levels[system.id];
        const hex = LEVELS[level].hex;
        const { cx, cy } = system.region;
        return (
          <g
            key={system.id}
            role="button"
            tabIndex={0}
            aria-label={`${system.label} — ${LEVELS[level].label}`}
            aria-pressed={isActive}
            onClick={() => onSelect(system.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(system.id);
              }
            }}
            className="cursor-pointer outline-none"
          >
            <circle cx={cx} cy={cy} r="17" fill="transparent" />
            <circle
              cx={cx}
              cy={cy}
              r={isActive ? 9 : 6}
              fill="none"
              stroke={isActive ? "#4ff0e4" : hex}
              strokeWidth={isActive ? 1.1 : 0.8}
              opacity={isActive ? 0.9 : 0.45}
              className={isActive ? "animate-pulse-dot" : undefined}
              style={{ transition: "r 200ms ease, opacity 200ms ease" }}
            />
            <circle cx={cx} cy={cy} r="1.8" fill={isActive ? "#4ff0e4" : hex} />
          </g>
        );
      })}

      {/* leader line + code for the active system */}
      {activeSystem && (
        <g pointerEvents="none">
          <line
            x1={activeSystem.region.cx}
            y1={activeSystem.region.cy}
            x2={activeSystem.region.cx + 34}
            y2={activeSystem.region.cy - 22}
            stroke="#4ff0e4"
            strokeWidth="0.6"
            strokeDasharray="2 2"
            opacity="0.7"
          />
          <text
            x={activeSystem.region.cx + 37}
            y={activeSystem.region.cy - 24}
            fill="#4ff0e4"
            fontSize="6"
            fontFamily="var(--font-mono)"
            letterSpacing="1"
          >
            {activeSystem.shortLabel.toUpperCase()} · ACTIVE
          </text>
        </g>
      )}

      {/* frame ticks */}
      <g stroke="#1b3f55" strokeWidth="0.8" opacity="0.9">
        <path d="M10 12 h10 M10 12 v10" fill="none" />
        <path d="M190 12 h-10 M190 12 v10" fill="none" />
        <path d="M10 388 h10 M10 388 v-10" fill="none" />
        <path d="M190 388 h-10 M190 388 v-10" fill="none" />
      </g>
      <text
        x="100"
        y="394"
        textAnchor="middle"
        fill="#4f6878"
        fontSize="5"
        fontFamily="var(--font-mono)"
        letterSpacing="1.4"
      >
        ANTERIOR VIEW · SCHEMATIC · NOT TO SCALE
      </text>
    </svg>
  );
}
