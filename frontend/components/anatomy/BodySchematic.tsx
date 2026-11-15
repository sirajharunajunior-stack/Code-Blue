"use client";

import { cn } from "@/lib/utils/cn";
import { LEVELS } from "@/lib/health/levels";
import { BODY_SYSTEMS } from "@/lib/data";
import type { BodySystemId, HealthLevel } from "@/types";

/**
 * Anterior anatomical figure.
 *
 * Drawn inline as SVG rather than loaded from a licensed atlas: it stays crisp
 * at any size, renders on the server, never blocks on a network request and
 * works with keyboard navigation. Proportions follow the usual eight-head
 * figure; the organs, skeleton and muscle groups are simplified but
 * anatomically placed. Every hot spot maps to one of the seven systems in
 * `BODY_SYSTEMS`.
 */

/* ---- contour paths (200 × 400 viewBox, symmetrical about x = 100) ---- */

const HEAD =
  "M100 15 C112 15 120 22 121.5 31.5 C122.8 38.4 120.8 45.5 116.1 50.6 C111.7 55.1 106.6 57.4 100 57.4 C93.4 57.4 88.3 55.1 83.9 50.6 C79.2 45.5 77.2 38.4 78.5 31.5 C80 22 88 15 100 15 Z";

const TORSO =
  "M86 58 C77.5 60.5 71.5 66.8 70 76.5 C67.8 90.8 69.2 104.8 71.4 119.4 L71.4 139.7 C71.4 148.6 69.6 158.5 66.4 167.8 C62.9 178.2 66.5 189.4 75.7 196 C83.6 201.9 91.7 204.5 100 204.5 C108.3 204.5 116.4 201.9 124.3 196 C133.5 189.4 137.1 178.2 133.6 167.8 C130.4 158.5 128.6 148.6 128.6 139.7 L128.6 119.4 C130.8 104.8 132.2 90.8 130 76.5 C128.5 66.8 122.5 60.5 114 58 C109.5 56.9 105 56.5 100 56.5 C95 56.5 90.5 56.9 86 58 Z";

const ARM =
  "M75 83 C68.5 86.3 63.9 92.5 62.6 100.9 C61.2 109.2 61.5 117.7 62 126.8 C62.6 138 63.1 149.1 63.4 160.5 C63.6 170.6 63.4 180.1 64 188.8 C64.5 196.6 65.8 202.8 68.6 209 C70.6 213.6 72.6 215.5 74.8 215.5 C76.6 215.5 77.9 213.8 77.9 210.8 C78 206.1 77.2 200.1 76.5 194.3 C75.5 184.2 75.1 172.9 75.3 161.6 C75.4 151.4 75.8 140.7 76.2 130 C76.6 117.9 77.1 106.7 79.5 95.6 C80.8 90.3 79.2 84.8 75 83 Z";

const LEG =
  "M93 206 C88.5 212.8 85.8 221.3 85.2 231.6 C84.6 242.6 85.1 254.1 85.9 265.1 C86.5 274.3 87 283.8 87.2 293.8 C87.4 305.4 86.8 315.5 86.2 325.8 C85.6 338.2 85 350.3 85.5 358.4 C85.9 364.5 88.4 369 92.2 371.3 C95.1 372.9 98.1 372.8 100.1 370.9 C101.9 369 102.8 366.1 102.6 362.5 C102.1 353.3 101.2 343.6 100.5 334.4 C99.7 323.3 99.5 312.5 99.6 301.7 C99.7 291.8 100.1 281.9 100.5 272.4 C100.8 262.8 101.4 253.5 101.9 244.2 C102.4 235 103 225.7 103.3 217.1 C103.5 211.4 101.6 208.1 98.5 206.9 C96.5 206.2 94.5 205.7 93 206 Z";

const MIRROR = "translate(200 0) scale(-1 1)";

/** Anatomy layers fade back when another system is selected. */
function layer(id: BodySystemId, active: BodySystemId, rest: number) {
  return {
    opacity: active === id ? 1 : rest,
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
      viewBox="0 0 200 400"
      className={cn("h-full w-full", className)}
      role="group"
      aria-label="Interactive body map. Select a body system."
    >
      <defs>
        <linearGradient id="anatomy-skin" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#ecd4c3" />
          <stop offset="34%" stopColor="#d3ae97" />
          <stop offset="70%" stopColor="#b58b74" />
          <stop offset="100%" stopColor="#8d6553" />
        </linearGradient>
        <radialGradient id="anatomy-sheen" cx="50%" cy="28%" r="62%">
          <stop offset="0%" stopColor="#fff4e8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff4e8" stopOpacity="0" />
        </radialGradient>
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
        <filter id="anatomy-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* ambient light and measurement grid */}
      <rect width="200" height="400" fill="url(#anatomy-aura)" />
      <g stroke="#4ff0e4" strokeWidth="0.35" opacity="0.04">
        {Array.from({ length: 17 }, (_, i) => (
          <line key={`h-${i}`} x1="24" x2="176" y1={16 + i * 22} y2={16 + i * 22} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v-${i}`} x1={42 + i * 16} x2={42 + i * 16} y1="16" y2="384" />
        ))}
      </g>

      <ellipse cx="100" cy="374" rx="42" ry="6" fill="#000" opacity="0.55" filter="url(#anatomy-shadow)" />

      {/* ---- skin and body contour ---- */}
      <g stroke="#4a2f26" strokeWidth="0.55" strokeLinejoin="round">
        <path d={TORSO} fill="url(#anatomy-skin)" />
        <path d={HEAD} fill="url(#anatomy-skin)" />
        <ellipse cx="83.6" cy="40" rx="2.6" ry="4.4" fill="url(#anatomy-skin)" />
        <ellipse cx="116.4" cy="40" rx="2.6" ry="4.4" fill="url(#anatomy-skin)" />
        <path d={ARM} fill="url(#anatomy-skin)" />
        <path d={ARM} fill="url(#anatomy-skin)" transform={MIRROR} />
        <path d={LEG} fill="url(#anatomy-skin)" />
        <path d={LEG} fill="url(#anatomy-skin)" transform={MIRROR} />
      </g>

      {/* soft key light on the chest and face */}
      <path d={TORSO} fill="url(#anatomy-sheen)" opacity="0.4" />
      <path d={HEAD} fill="url(#anatomy-sheen)" opacity="0.35" />

      {/* rim light ties the figure to the interface palette */}
      <g fill="none" stroke="#8fd8d0" strokeWidth="0.45" opacity="0.2">
        <path d={TORSO} />
        <path d={HEAD} />
        <path d={ARM} />
        <path d={ARM} transform={MIRROR} />
        <path d={LEG} />
        <path d={LEG} transform={MIRROR} />
      </g>

      {/* ---- surface anatomy ---- */}
      <g fill="none" stroke="#7a5344" strokeLinecap="round" opacity="0.42">
        <path d="M88 51 C92 56 108 56 112 51" strokeWidth="0.9" />
        <path d="M100 41 L100 47" strokeWidth="0.45" />
        <path d="M96.5 52.4 C98.5 53.7 101.5 53.7 103.5 52.4" strokeWidth="0.5" />
        <path d="M89.6 35.4 C91.6 34 94 34.5 95.6 36" strokeWidth="0.45" />
        <path d="M110.4 35.4 C108.4 34 106 34.5 104.4 36" strokeWidth="0.45" />
        <path d="M92 60 C94 64 96.5 67 100 68.5" strokeWidth="0.5" />
        <path d="M108 60 C106 64 103.5 67 100 68.5" strokeWidth="0.5" />
        <path d="M86 79 C92 76.4 97 76 100 76.8" strokeWidth="0.55" />
        <path d="M114 79 C108 76.4 103 76 100 76.8" strokeWidth="0.55" />
        <path d="M100 82 L100 120" strokeWidth="0.45" opacity="0.7" />
        <path d="M92 114 L99 114 M92 122 L99 122 M92 130 L99 130" strokeWidth="0.4" />
        <path d="M108 114 L101 114 M108 122 L101 122 M108 130 L101 130" strokeWidth="0.4" />
        <path d="M83 166 C89 161 95 163 100 169" strokeWidth="0.55" />
        <path d="M117 166 C111 161 105 163 100 169" strokeWidth="0.55" />
        <path d="M61 144 C64 146 67 146 70 144" strokeWidth="0.5" />
        <path d="M139 144 C136 146 133 146 130 144" strokeWidth="0.5" />
        <path d="M84 266 C87 269 91 269 94 266" strokeWidth="0.5" />
        <path d="M116 266 C113 269 109 269 106 266" strokeWidth="0.5" />
        <path d="M65.5 204 L65.5 210 M67.5 205 L67.5 211 M69.5 204 L69.5 210" strokeWidth="0.35" />
        <path d="M134.5 204 L134.5 210 M132.5 205 L132.5 211 M130.5 204 L130.5 210" strokeWidth="0.35" />
      </g>
      <ellipse cx="100" cy="147" rx="1.2" ry="1.6" fill="#8a6250" opacity="0.55" />

      {/* ---- skeleton ---- */}
      <g
        fill="none"
        stroke="#efe2cb"
        strokeWidth="0.9"
        strokeLinecap="round"
        {...layer("bones", safeActive, 0.3)}
      >
        <path
          d="M100 22 C92 22 87 28 87 35 C87 42 92 47 100 48 C108 47 113 42 113 35 C113 28 108 22 100 22 Z"
          strokeWidth="0.7"
        />
        <path d="M91 42 C94 48 106 48 109 42" strokeWidth="0.45" />
        <path d="M100 62 L100 176" strokeWidth="1.1" />
        {Array.from({ length: 15 }, (_, index) => (
          <path
            key={`v-${index}`}
            d={`M98 ${70 + index * 7} L102 ${70 + index * 7}`}
            strokeWidth="0.4"
          />
        ))}
        {[84, 90, 96, 102, 108, 114].map((y) => (
          <g key={`rib-${y}`}>
            <path d={`M100 ${y} C92 ${y - 2} 85 ${y + 4} 84 ${y + 10}`} strokeWidth="0.65" />
            <path d={`M100 ${y} C108 ${y - 2} 115 ${y + 4} 116 ${y + 10}`} strokeWidth="0.65" />
          </g>
        ))}
        <path d="M100 76 L100 118" strokeWidth="1.4" opacity="0.85" />
        <path d="M86 78 C92 75 97 75 100 76.4" strokeWidth="0.8" />
        <path d="M114 78 C108 75 103 75 100 76.4" strokeWidth="0.8" />
        <path d="M100 168 C95 162 88 162 83 166 C81 172 83 179 88 182" strokeWidth="0.8" />
        <path d="M100 168 C105 162 112 162 117 166 C119 172 117 179 112 182" strokeWidth="0.8" />
        <path d="M92 181 C96 185 104 185 108 181" strokeWidth="0.7" />
        <path d="M74 90 L66 140 L63 188" strokeWidth="0.8" />
        <path d="M74 90 L66 140 L63 188" strokeWidth="0.8" transform={MIRROR} />
        <path d="M93 184 L86 262 L87 352" strokeWidth="0.9" />
        <path d="M93 184 L86 262 L87 352" strokeWidth="0.9" transform={MIRROR} />
        <circle cx="74" cy="90" r="1.8" />
        <circle cx="126" cy="90" r="1.8" />
        <circle cx="66" cy="140" r="1.5" />
        <circle cx="134" cy="140" r="1.5" />
        <circle cx="86" cy="266" r="1.8" />
        <circle cx="114" cy="266" r="1.8" />
        <circle cx="87" cy="352" r="1.5" />
        <circle cx="113" cy="352" r="1.5" />
      </g>

      {/* ---- musculature ---- */}
      <g fill="#b5574f" {...layer("muscles", safeActive, 0.13)}>
        <path d="M99 88 C93 87 87 90 85 96 C84 101 88 104 94 104 C98 104 99 100 99 96 Z" />
        <path d="M101 88 C107 87 113 90 115 96 C116 101 112 104 106 104 C102 104 101 100 101 96 Z" />
        <ellipse cx="73" cy="92" rx="5.5" ry="7.5" />
        <ellipse cx="127" cy="92" rx="5.5" ry="7.5" />
        <ellipse cx="67" cy="116" rx="4.2" ry="13" />
        <ellipse cx="133" cy="116" rx="4.2" ry="13" />
        <ellipse cx="65" cy="162" rx="3.6" ry="14" />
        <ellipse cx="135" cy="162" rx="3.6" ry="14" />
        {[108, 116, 124, 132].map((y) => (
          <g key={`ab-${y}`}>
            <rect x="93" y={y} width="6" height="7" rx="2" />
            <rect x="101" y={y} width="6" height="7" rx="2" />
          </g>
        ))}
        <ellipse cx="89" cy="220" rx="6" ry="22" />
        <ellipse cx="111" cy="220" rx="6" ry="22" />
        <ellipse cx="89" cy="302" rx="4.5" ry="16" />
        <ellipse cx="111" cy="302" rx="4.5" ry="16" />
      </g>

      {/* ---- brain ---- */}
      <g {...layer("brain", safeActive, 0.5)}>
        <path
          d="M100 23 C91 23 86 28 86 34 C86 40 91 44 100 44 C109 44 114 40 114 34 C114 28 109 23 100 23 Z"
          fill="url(#anatomy-brain)"
          stroke="#a96b6b"
          strokeWidth="0.4"
        />
        <g fill="none" stroke="#a96b6b" strokeWidth="0.5" opacity="0.85" strokeLinecap="round">
          <path d="M100 24 L100 43" />
          <path d="M93 27 C96 30 94 34 97 37" />
          <path d="M107 27 C104 30 106 34 103 37" />
          <path d="M89 33 C92 34 93 38 96 40" />
          <path d="M111 33 C108 34 107 38 104 40" />
          <path d="M96 24 C95 28 98 30 96 33" />
          <path d="M104 24 C105 28 102 30 104 33" />
        </g>
        <path
          d="M94 43 C94 47.5 98 48.5 100 47 C102 48.5 106 47.5 106 43 Z"
          fill="#c98a8a"
          stroke="#a96b6b"
          strokeWidth="0.4"
        />
        <path d="M96 44.5 L96 47.5 M99 44.5 L99 47.5 M102 44.5 L102 47.5" stroke="#a96b6b" strokeWidth="0.35" />
        <path d="M98.6 42 L98.6 50 L101.4 50 L101.4 42 Z" fill="#c9958f" stroke="#a96b6b" strokeWidth="0.3" />
      </g>

      {/* ---- eyes ---- */}
      <g {...layer("eyes", safeActive, 0.62)}>
        {[93, 107].map((cx) => (
          <g key={`eye-${cx}`}>
            <ellipse cx={cx} cy="48" rx="3.6" ry="2.3" fill="#f4ece2" stroke="#8a6250" strokeWidth="0.35" />
            <circle cx={cx} cy="48" r="1.5" fill="#6fa9cf" />
            <circle cx={cx} cy="48" r="0.7" fill="#14181d" />
            <path
              d={`M${cx - 3.4} 47 C${cx - 2} 45.6 ${cx + 2} 45.6 ${cx + 3.4} 47`}
              fill="none"
              stroke="#5a3d33"
              strokeWidth="0.4"
            />
          </g>
        ))}
      </g>

      {/* ---- lungs ---- */}
      <g
        stroke="#8f5a62"
        strokeWidth="0.4"
        {...layer("lungs", safeActive, 0.42)}
      >
        <path d="M98 64 L98 78 M102 64 L102 78" stroke="#c9a896" strokeWidth="1.6" />
        <path
          d="M98 78 C94 80 91 84 90 88 M102 78 C106 80 109 84 110 88"
          fill="none"
          stroke="#c9a896"
          strokeWidth="0.9"
        />
        <path
          d="M97.5 79 C90 82 86 90 85 100 C84 110 87 119 92 124 C95 127 97.5 125 97.5 120 Z"
          fill="url(#anatomy-lung)"
        />
        <path
          d="M102.5 79 C110 82 114 90 115 100 C116 110 113 119 108 124 C105 127 102.5 125 102.5 120 Z"
          fill="url(#anatomy-lung)"
        />
        <path d="M88 100 C91 106 94 112 96 119" fill="none" strokeWidth="0.4" opacity="0.7" />
        <path d="M112 100 C109 106 106 112 104 119" fill="none" strokeWidth="0.4" opacity="0.7" />
        <path d="M92 84 C95 89 96 95 96 101" fill="none" stroke="#c08a92" strokeWidth="0.45" />
        <path d="M108 84 C105 89 104 95 104 101" fill="none" stroke="#c08a92" strokeWidth="0.45" />
      </g>

      {/* ---- heart ---- */}
      <g {...layer("heart", safeActive, 0.58)}>
        <path
          d="M102 100 C106 96 112 98 112 105 C112 112 107 118 102 122 C98 118 93 112 93 106 C93 100 98 97 102 100 Z"
          fill="url(#anatomy-heart)"
          stroke="#7d222a"
          strokeWidth="0.4"
        />
        <path
          d="M104 99 C104 93 108 90 112 91"
          fill="none"
          stroke="#c16a6a"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M100 99 C97 94 93 92 90 94"
          fill="none"
          stroke="#a85a5a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M102 104 C100 110 100 116 102 120" fill="none" stroke="#7d222a" strokeWidth="0.6" opacity="0.85" />
        <path d="M95 106 C98 108 99 111 98 114" fill="none" stroke="#8f2b33" strokeWidth="0.5" opacity="0.7" />
      </g>

      {/* ---- digestive tract ---- */}
      <g {...layer("digestive", safeActive, 0.42)}>
        <path d="M100 76 L100 126" fill="none" stroke="#c98a6a" strokeWidth="1.7" />
        <path
          d="M99 127 C94 124 87 125 84 129 C81 133 81 138 85 141 C90 144 96 144 99 141 Z"
          fill="url(#anatomy-liver)"
          stroke="#5e2723"
          strokeWidth="0.4"
        />
        <path
          d="M101 128 C105 125 110 128 112 133 C114 139 111 146 106 147 C102 147 100 143 100 138 Z"
          fill="#cf9070"
          stroke="#9a5b45"
          strokeWidth="0.4"
        />
        <path
          d="M100 133 C104 132 108 133 111 135"
          fill="none"
          stroke="#d8b07a"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M107 142 L108 162 L106 168 M107 142 L93 142 L90 162 L92 168"
          fill="none"
          stroke="#c79a72"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path
          d="M95 150 C90 155 93 162 99 161 C104 160 105 154 100 152 C96 150 92 155 95 160 C98 165 104 163 106 158"
          fill="none"
          stroke="#dda882"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* scanning sweep stays behind the controls */}
      <rect
        x="24"
        y="0"
        width="152"
        height="400"
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
        ANTERIOR VIEW · ANATOMICAL GUIDE
      </text>
    </svg>
  );
}
