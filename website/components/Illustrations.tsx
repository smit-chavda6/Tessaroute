"use client";

import { useReducedMotion } from "motion/react";
import { useId } from "react";

/*
  Minimal SVG scenes for the Drop-in bento. Rules: hairline strokes in
  translucent white, one accent (cyan) for the single thing that matters in
  each scene, plain mono text, no fills, glows or grids. Motion is limited to
  one quiet element per scene and is omitted for reduced-motion users.
*/

const mono = { fontFamily: "var(--font-mono)" } as const;
const LINE = "rgba(255,255,255,0.14)";
const DIM = "#6b7288";
const TEXT = "#c9cde0";
const ACC = "#5eead4";

/* 1. Tiers --------------------------------------------------------------- */

const TIERS = [
  { alias: "smart", models: ["gpt-6.2-sol", "claude-opus-5-5", "gemini-4-argon"] },
  { alias: "balanced", models: ["gpt-6.1-terra", "claude-sonnet-5-5", "gemini-3.8-flash"] },
  { alias: "fast", models: ["gpt-6-luna", "claude-haiku-5-5", "gemini-3.5-flash-lite"] },
];

export function TierMatrix() {
  const COLS = [90, 186, 294];
  return (
    <svg viewBox="0 0 420 170" className="h-auto w-full" aria-hidden="true">
      {["openai", "anthropic", "gemini"].map((h, i) => (
        <text key={h} x={COLS[i]} y="34" fontSize="8" fill={DIM} style={mono}>
          {h}
        </text>
      ))}
      <line x1="20" x2="400" y1="46" y2="46" stroke={LINE} />
      {TIERS.map((t, r) => {
        const y = 78 + r * 32;
        const lit = t.alias === "balanced";
        return (
          <g key={t.alias}>
            {lit && <line x1="20" x2="20" y1={y - 11} y2={y + 5} stroke={ACC} strokeWidth="2" />}
            <text x="30" y={y} fontSize="9" fill={lit ? "#ffffff" : DIM} style={mono}>
              {t.alias}
            </text>
            {t.models.map((m, c) => (
              <text key={m} x={COLS[c]} y={y} fontSize="8.5" fill={lit ? (c === 0 ? ACC : TEXT) : DIM} style={mono}>
                {m}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* 2. Same-tier fallback -------------------------------------------------- */

export function FallbackRoute() {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const ok = `ok${id}`;
  return (
    <svg viewBox="0 0 420 170" className="h-auto w-full" aria-hidden="true">
      <defs>
        <path id={ok} d="M40 85 H170 C230 85 240 125 300 125" />
      </defs>
      <path d="M40 85 H170" stroke={LINE} />
      <path d="M170 85 C230 85 240 45 300 45" fill="none" stroke={LINE} strokeDasharray="3 5" />
      <path d="M170 85 C230 85 240 125 300 125" fill="none" stroke={ACC} strokeOpacity="0.8" />

      <circle cx="40" cy="85" r="3" fill={TEXT} />
      <text x="40" y="106" textAnchor="middle" fontSize="8" fill={DIM} style={mono}>app</text>

      <circle cx="170" cy="85" r="7" fill="none" stroke="rgba(255,255,255,0.4)" />
      <text x="170" y="106" textAnchor="middle" fontSize="8" fill={DIM} style={mono}>router</text>

      <circle cx="300" cy="45" r="3" fill="none" stroke={DIM} />
      <text x="312" y="48" fontSize="8.5" fill={DIM} style={mono}>anthropic · timeout</text>

      <circle cx="300" cy="125" r="3.5" fill={ACC} />
      <text x="312" y="128" fontSize="8.5" fill="#ffffff" style={mono}>openai</text>
      <text x="312" y="141" fontSize="8" fill={ACC} style={mono}>gpt-6.2-sol</text>

      {!reduce && (
        <circle r="2.5" fill="#ffffff">
          <animateMotion dur="3s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear">
            <mpath href={`#${ok}`} />
          </animateMotion>
        </circle>
      )}
    </svg>
  );
}

/* 3. Cost line ------------------------------------------------------------ */

export function CostChart() {
  const xs = [24, 70, 116, 162, 208, 254, 296];
  const ys = [112, 100, 106, 86, 90, 70, 58];
  let d = `M${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1]! + xs[i]!) / 2;
    d += ` C${cx} ${ys[i - 1]} ${cx} ${ys[i]} ${xs[i]} ${ys[i]}`;
  }
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden="true">
      <line x1="24" x2="296" y1="130" y2="130" stroke={LINE} />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="296" cy="58" r="3.5" fill={ACC} />
      <text x="296" y="40" textAnchor="end" fontSize="10" fill="#ffffff" style={mono}>
        $0.002120
      </text>
      <text x="296" y="28" textAnchor="end" fontSize="7.5" fill={DIM} style={mono}>
        per call
      </text>
      <text x="24" y="146" fontSize="7.5" fill={DIM} style={mono}>mon</text>
      <text x="296" y="146" textAnchor="end" fontSize="7.5" fill={DIM} style={mono}>sun</text>
    </svg>
  );
}

/* 4. Streaming text ------------------------------------------------------- */

const STREAM = ["Routed", "to", "openai", "on", "the", "balanced", "tier,", "streamed", "over", "SSE."];

export function StreamChat() {
  const reduce = useReducedMotion();
  const CHAR = 5.4; // 9px Geist Mono advance
  const lines: string[][] = [[], []];
  STREAM.forEach((w, i) => lines[i < 5 ? 0 : 1]!.push(w));
  let k = 0;
  const total = STREAM.length;
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden="true">
      <text x="24" y="44" fontSize="7.5" fill={DIM} style={mono}>
        text/event-stream
      </text>
      {lines.map((line, r) => {
        let x = 24;
        return line.map((w) => {
          const i = k++;
          const start = (i / total) * 0.6;
          const el = (
            <text key={`${r}-${i}`} x={x} y={80 + r * 20} fontSize="9" fill={TEXT} style={mono} opacity={reduce ? 1 : 0}>
              {w}
              {!reduce && (
                <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${start.toFixed(3)};${(start + 0.03).toFixed(3)};0.94;1`} dur="5s" repeatCount="indefinite" />
              )}
            </text>
          );
          x += (w.length + 1) * CHAR;
          return el;
        });
      })}
      <rect x="24" y="112" width="5" height="11" fill={ACC}>
        {!reduce && <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />}
      </rect>
    </svg>
  );
}

/* 5. Latency ------------------------------------------------------------- */

export function LatencyGauge() {
  const cx = 160;
  const cy = 112;
  const R = 70;
  // 0 s .. 3 s along a 180° arc; p95 = 1.4 s
  const round = (v: number) => Math.round(v * 100) / 100;
  const at = (s: number) => {
    const a = Math.PI - (s / 3) * Math.PI;
    return [round(cx + R * Math.cos(a)), round(cy - R * Math.sin(a))] as const;
  };
  const [px, py] = at(1.4);
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden="true">
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke={LINE} strokeWidth="1.2" />
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${px} ${py}`} fill="none" stroke={ACC} strokeWidth="1.6" />
      <circle cx={px} cy={py} r="3.5" fill={ACC} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fill="#ffffff" style={{ fontFamily: "var(--font-display)" }}>
        1.4s
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7.5" fill={DIM} style={mono}>
        p95
      </text>
      <text x={cx - R} y={cy + 18} textAnchor="middle" fontSize="7.5" fill={DIM} style={mono}>0</text>
      <text x={cx + R} y={cy + 18} textAnchor="middle" fontSize="7.5" fill={DIM} style={mono}>3s</text>
      <text x={cx} y="150" textAnchor="middle" fontSize="7.5" fill={DIM} style={mono}>
        p50 496ms · mean 605ms
      </text>
    </svg>
  );
}
