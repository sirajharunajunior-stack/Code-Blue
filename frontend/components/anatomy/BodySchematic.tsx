"use client";

import { cn } from "@/lib/utils/cn";
import { LEVELS } from "@/lib/health/levels";
import { BODY_SYSTEMS } from "@/lib/data";
import type { BodySystemId, HealthLevel } from "@/types";

const MIRROR = "translate(200 0) scale(-1 1)";

/**
 * Anterior anatomical figure.
 *
 * A cropped, local copy of a 3D-shaded anatomical reference is the figure
 * layer. Simplified organ and system overlays remain selectable; they are
 * educational, not diagnostic. Every hot spot maps to one of the seven systems
 * in `BODY_SYSTEMS`.
 */

/** Anatomy layers fade back when another system is selected. */
function layer(
  id: BodySystemId,
  active: BodySystemId,
  rest: number,
  selected = 0.86,
) {
  return {
    opacity: active === id ? selected : rest,
    style: { transition: "opacity 240ms ease" },
  } as const;
}

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
  const safeActive = BODY_SYSTEMS.some((s) => s.id === active) ? active : "heart";
  const activeSystem = BODY_SYSTEMS.find((s) => s.id === safeActive) ?? BODY_SYSTEMS[0];

  return (
    <svg
      viewBox="0 0 200 412"
      className={cn("h-full w-full animate-anatomy-breathe", className)}
      role="group"
      aria-label="Interactive body map. Select a body system."
    >
      <defs>
        <linearGradient id="anatomy-lung" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dda4aa" />
          <stop offset="100%" stopColor="#b0717a" />
        </linearGradient>
        <radialGradient id="anatomy-heart" cx="42%" cy="35%" r="72%">
          <stop offset="0%" stopColor="#d15860" />
          <stop offset="60%" stopColor="#a8323b" />
          <stop offset="100%" stopColor="#7d222a" />
        </radialGradient>
        <linearGradient id="anatomy-brain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b6b6" />
          <stop offset="100%" stopColor="#c1878b" />
        </linearGradient>
        <linearGradient id="anatomy-liver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a423a" />
          <stop offset="100%" stopColor="#6d312c" />
        </linearGradient>
        <linearGradient id="anatomy-kidney" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b65c61" />
          <stop offset="100%" stopColor="#7b3338" />
        </linearGradient>
        <linearGradient id="anatomy-gut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e3ae86" />
          <stop offset="100%" stopColor="#c08a63" />
        </linearGradient>
        <radialGradient id="anatomy-aura" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#4ff0e4" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#4ff0e4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="anatomy-scan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ff0e4" stopOpacity="0" />
          <stop offset="45%" stopColor="#4ff0e4" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#4ff0e4" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#4ff0e4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ambient light and measurement grid */}
      <rect width="200" height="412" fill="url(#anatomy-aura)" />
      <g stroke="#4ff0e4" strokeWidth="0.35" opacity="0.04">
        {Array.from({ length: 17 }, (_, i) => (
          <line key={`h-${i}`} x1="24" x2="176" y1={16 + i * 22} y2={16 + i * 22} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v-${i}`} x1={42 + i * 16} x2={42 + i * 16} y1="16" y2="384" />
        ))}
      </g>

      <image
        x="14.9"
        y="0"
        width="170.2"
        height="384"
        href="/anatomy/human-anterior-reference.png"
        preserveAspectRatio="none"
        opacity="0.4"
        aria-hidden="true"
      />

      {/* ---- skeleton ---- */}
      <g
        fill="none"
        stroke="#efe2cb"
        strokeWidth="0.75"
        strokeLinecap="round"
        {...layer("bones", safeActive, 0.2, 0.9)}
      >
        <path
          d="M100 3 C90 3 84 11 84 22 C84 33 90 42 100 45 C110 42 116 33 116 22 C116 11 110 3 100 3 Z"
          strokeWidth="0.8"
        />
        <path d="M89 28 C92 36 108 36 111 28" strokeWidth="0.5" />
        <path d="M100 47 L100 215" strokeWidth="1" />
        {Array.from({ length: 21 }, (_, index) => (
          <path
            key={`v-${index}`}
            d={`M98 ${54 + index * 7.5} L102 ${54 + index * 7.5}`}
            strokeWidth="0.4"
          />
        ))}
        {[92, 100, 108, 116, 124, 132].map((y) => (
          <g key={`rib-${y}`}>
            <path d={`M100 ${y} C91 ${y - 2} 83 ${y + 3} 82 ${y + 11}`} strokeWidth="0.65" />
            <path d={`M100 ${y} C109 ${y - 2} 117 ${y + 3} 118 ${y + 11}`} strokeWidth="0.65" />
          </g>
        ))}
        <path d="M100 91 L100 139" strokeWidth="1.4" opacity="0.85" />
        <path d="M100 69 C89 69 77 72 66 74 M100 69 C111 69 123 72 134 74" strokeWidth="0.8" />
        <path d="M100 198 C92 190 84 194 82 203 C83 214 90 220 100 223" strokeWidth="0.8" />
        <path d="M100 198 C108 190 116 194 118 203 C117 214 110 220 100 223" strokeWidth="0.8" />
        <path d="M66 74 L43 131 L25 180" strokeWidth="0.8" />
        <path d="M66 74 L43 131 L25 180" strokeWidth="0.8" transform={MIRROR} />
        <path d="M88 215 C85 233 83 256 84 279 C85 291 87 301 88 311 C89 328 90 344 89 356" strokeWidth="0.9" />
        <path d="M88 215 C85 233 83 256 84 279 C85 291 87 301 88 311 C89 328 90 344 89 356" strokeWidth="0.9" transform={MIRROR} />
        <path d="M89 355 C86 362 83 367 80 372 M89 355 C91 362 93 368 94 374" strokeWidth="0.65" />
        <path d="M89 355 C86 362 83 367 80 372 M89 355 C91 362 93 368 94 374" strokeWidth="0.65" transform={MIRROR} />
        <circle cx="66" cy="74" r="2" />
        <circle cx="134" cy="74" r="2" />
        <circle cx="43" cy="131" r="1.6" />
        <circle cx="157" cy="131" r="1.6" />
        <circle cx="84" cy="279" r="1.8" />
        <circle cx="116" cy="279" r="1.8" />
        <circle cx="89" cy="356" r="1.5" />
        <circle cx="111" cy="356" r="1.5" />
      </g>

      {/* ---- musculature ---- */}
      <g fill="#b5574f" {...layer("muscles", safeActive, 0.08, 0.5)}>
        <path d="M99 82 C91 79 82 82 79 89 C77 96 84 103 94 105 C98 103 99 96 99 90 Z" />
        <path d="M101 82 C109 79 118 82 121 89 C123 96 116 103 106 105 C102 103 101 96 101 90 Z" />
        <ellipse cx="72" cy="72" rx="8" ry="11" />
        <ellipse cx="128" cy="72" rx="8" ry="11" />
        <ellipse cx="55" cy="101" rx="5.2" ry="19" transform="rotate(18 55 101)" />
        <ellipse cx="145" cy="101" rx="5.2" ry="19" transform="rotate(-18 145 101)" />
        <ellipse cx="37" cy="151" rx="4.2" ry="17" transform="rotate(14 37 151)" />
        <ellipse cx="163" cy="151" rx="4.2" ry="17" transform="rotate(-14 163 151)" />
        {[130, 139, 148, 157].map((y) => (
          <g key={`ab-${y}`}>
            <rect x="92" y={y} width="7" height="8" rx="2.5" />
            <rect x="101" y={y} width="7" height="8" rx="2.5" />
          </g>
        ))}
        <ellipse cx="88" cy="238" rx="7" ry="26" />
        <ellipse cx="112" cy="238" rx="7" ry="26" />
        <ellipse cx="88" cy="326" rx="5.2" ry="20" />
        <ellipse cx="112" cy="326" rx="5.2" ry="20" />
      </g>

      {/* ---- brain ---- */}
      <g {...layer("brain", safeActive, 0.25, 0.92)}>
        <path
          d="M100 5 C91 5 86 10 86 18 C86 26 91 32 100 33 C109 32 114 26 114 18 C114 10 109 5 100 5 Z"
          fill="url(#anatomy-brain)"
          stroke="#a96b6b"
          strokeWidth="0.4"
        />
        <g fill="none" stroke="#a96b6b" strokeWidth="0.5" opacity="0.85" strokeLinecap="round">
          <path d="M100 6 L100 32" />
          <path d="M93 8 C96 12 94 16 97 20" />
          <path d="M107 8 C104 12 106 16 103 20" />
          <path d="M89 15 C92 16 93 20 96 23" />
          <path d="M111 15 C108 16 107 20 104 23" />
          <path d="M96 6 C95 10 98 12 96 15" />
          <path d="M104 6 C105 10 102 12 104 15" />
        </g>
        <path
          d="M94 32 C94 39 98 40 100 38 C102 40 106 39 106 32 Z"
          fill="#c98a8a"
          stroke="#a96b6b"
          strokeWidth="0.4"
        />
        <path d="M96 34 L96 38 M99 34 L99 38 M102 34 L102 38" stroke="#a96b6b" strokeWidth="0.35" />
        <path d="M98.6 38 L98.6 52 L101.4 52 L101.4 38 Z" fill="#c9958f" stroke="#a96b6b" strokeWidth="0.3" />
      </g>

      {/* ---- eyes ---- */}
      <g {...layer("eyes", safeActive, 0.3, 0.9)}>
        {[94, 106].map((cx) => (
          <g key={`eye-${cx}`}>
            <ellipse cx={cx} cy="23" rx="3.8" ry="1.8" fill="none" stroke="#bce2ef" strokeWidth="0.7" />
          </g>
        ))}
      </g>

      {/* ---- lungs ---- */}
      <g
        className="animate-anatomy-lungs"
        stroke="#8f5a62"
        strokeWidth="0.4"
        {...layer("lungs", safeActive, 0.3, 0.92)}
      >
        <path d="M98 58 L98 85 M102 58 L102 85" stroke="#c9a896" strokeWidth="1.6" />
        <path
          d="M98 83 C94 85 91 90 90 94 M102 83 C106 85 109 90 110 94"
          fill="none"
          stroke="#c9a896"
          strokeWidth="0.9"
        />
        <path
          d="M97.5 84 C90 87 86 95 85 105 C84 116 87 128 92 135 C95 138 97.5 136 97.5 130 Z"
          fill="url(#anatomy-lung)"
        />
        <path
          d="M102.5 84 C110 87 114 95 115 105 C116 116 113 128 108 135 C105 138 102.5 136 102.5 130 Z"
          fill="url(#anatomy-lung)"
        />
        <path d="M88 105 C91 112 94 121 96 130" fill="none" strokeWidth="0.4" opacity="0.7" />
        <path d="M112 105 C109 112 106 121 104 130" fill="none" strokeWidth="0.4" opacity="0.7" />
        <path d="M92 90 C95 96 96 103 96 110" fill="none" stroke="#c08a92" strokeWidth="0.45" />
        <path d="M108 90 C105 96 104 103 104 110" fill="none" stroke="#c08a92" strokeWidth="0.45" />
      </g>

      {/* ---- heart ---- */}
      <g className="animate-anatomy-heart" {...layer("heart", safeActive, 0.35, 0.95)}>
        <path
          d="M102 112 C106 107 113 109 113 116 C113 124 107 132 102 137 C97 132 92 125 92 118 C92 111 98 108 102 112 Z"
          fill="url(#anatomy-heart)"
          stroke="#7d222a"
          strokeWidth="0.4"
        />
        <path
          d="M104 111 C104 104 108 101 112 102"
          fill="none"
          stroke="#c16a6a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M100 111 C97 105 93 103 90 105"
          fill="none"
          stroke="#a85a5a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M102 116 C100 122 100 130 102 135" fill="none" stroke="#7d222a" strokeWidth="0.6" opacity="0.85" />
        <path d="M95 118 C98 120 99 123 98 126" fill="none" stroke="#8f2b33" strokeWidth="0.5" opacity="0.7" />
      </g>

      {/* ---- digestive tract ---- */}
      <g {...layer("digestive", safeActive, 0.3, 0.92)}>
        <path d="M100 87 L100 147" fill="none" stroke="#c98a6a" strokeWidth="1.7" />
        <path
          d="M82 155 C77 156 76 162 79 168 C82 173 87 169 87 164 C87 160 85 157 82 155 Z"
          fill="url(#anatomy-kidney)"
          stroke="#713139"
          strokeWidth="0.5"
        />
        <path
          d="M82 155 C77 156 76 162 79 168 C82 173 87 169 87 164 C87 160 85 157 82 155 Z"
          fill="url(#anatomy-kidney)"
          stroke="#713139"
          strokeWidth="0.5"
          transform={MIRROR}
        />
        <path
          d="M96 165 C100 162 107 163 111 166 C107 169 100 169 96 165 Z"
          fill="#d9a875"
          stroke="#9d704c"
          strokeWidth="0.4"
        />
        <path
          d="M99 148 C93 145 84 146 80 151 C77 156 80 164 87 166 C92 167 98 164 100 160 Z"
          fill="url(#anatomy-liver)"
          stroke="#5e2723"
          strokeWidth="0.4"
        />
        <path
          d="M102 151 C107 146 113 149 114 155 C115 161 111 168 106 169 C102 169 100 164 100 160 Z"
          fill="#cf9070"
          stroke="#9a5b45"
          strokeWidth="0.4"
        />
        <path
          d="M117 153 C121 153 123 158 121 163 C119 167 116 165 115 162 C114 158 115 155 117 153 Z"
          fill="#70414b"
          stroke="#4c3038"
          strokeWidth="0.45"
        />
        <path d="M96 159 C94 162 95 166 98 167 C100 164 100 161 98 159 Z" fill="#78905c" stroke="#536541" strokeWidth="0.4" />
        <path d="M84 169 C84 180 91 189 98 198 M116 169 C116 180 109 189 102 198" fill="none" stroke="#c98a6a" strokeWidth="0.8" />
        <path
          d="M92 185 C90 179 91 170 92 166 C97 164 103 164 108 166 C109 171 110 180 108 185 C106 190 103 190 101 187"
          fill="none"
          stroke="#c79a72"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M94 171 C98 168 104 169 104 173 C104 177 96 175 95 179 C94 183 103 181 105 184 C106 187 99 189 96 186"
          fill="none"
          stroke="url(#anatomy-gut)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M101 187 L101 198" fill="none" stroke="#c79a72" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M95 199 C95 194 105 194 105 199 L104 206 C102 210 98 210 96 206 Z"
          fill="#c77d82"
          stroke="#86444a"
          strokeWidth="0.45"
        />
      </g>

      {/* scanning sweep stays behind the controls */}
      <rect
        x="24"
        y="0"
        width="152"
        height="412"
        fill="url(#anatomy-scan)"
        className="animate-sweep"
        pointerEvents="none"
      />

      {/* ---- interactive hot spots ---- */}
      {BODY_SYSTEMS.map((system) => {
        const isActive = system.id === safeActive;
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
            className="group cursor-pointer outline-none"
          >
            <circle
              cx={cx}
              cy={cy}
              r="12"
              fill="transparent"
              className="stroke-transparent group-focus-visible:stroke-signal group-focus-visible:stroke-2"
            />
            <circle
              cx={cx}
              cy={cy}
              r={isActive ? 8.5 : 6}
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

      {/* ---- label for the selected system ---- */}
      {activeSystem && (
        <g pointerEvents="none">
          {(() => {
            const { cx, cy } = activeSystem.region;
            const toLeft = cx >= 100;
            const labelX = toLeft ? Math.max(8, cx - 30) : Math.min(192, cx + 30);
            const labelY = Math.max(12, cy - 22);
            return (
              <>
                <line
                  x1={cx}
                  y1={cy}
                  x2={labelX}
                  y2={labelY + 1.5}
                  stroke="#4ff0e4"
                  strokeWidth="0.6"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={toLeft ? "end" : "start"}
                  fill="#4ff0e4"
                  fontSize="5.5"
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.8"
                >
                  {activeSystem.shortLabel.toUpperCase()}
                </text>
              </>
            );
          })()}
        </g>
      )}
      {/* ---- frame ---- */}
      <g stroke="#1b3f55" strokeWidth="0.8" opacity="0.9">
        <path d="M10 12 h10 M10 12 v10" fill="none" />
        <path d="M190 12 h-10 M190 12 v10" fill="none" />
        <path d="M10 408 h10 M10 408 v-10" fill="none" />
        <path d="M190 408 h-10 M190 408 v-10" fill="none" />
      </g>
    </svg>
  );
}
