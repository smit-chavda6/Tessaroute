"use client";

import { useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";

/*
  Animated SVG scenes for the Drop-in feature bento. Shared language:
  dot-grid backdrop, accent→signal gradients, soft glow filters, small glass
  tags in Geist Mono. SMIL animation loops are omitted for reduced-motion
  users (CSS media queries can't stop SMIL).
*/

const mono = { fontFamily: "var(--font-mono)" } as const;
const sans = { fontFamily: "var(--font-sans)" } as const;
const ACC = "#8f97ff";
const SIG = "#5eead4";
const ERR = "#f87171";

function useIds<T extends string>(...names: T[]) {
  const id = useId().replace(/:/g, "");
  return Object.fromEntries(names.map((n) => [n, `${n}${id}`])) as Record<T, string>;
}

/** Shared <defs>: dot grid, brand gradient, glow filter. */
function Defs({ ids }: { ids: { dots: string; brand: string; glow: string } }) {
  return (
    <>
      <pattern id={ids.dots} width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.7" fill="#ffffff" fillOpacity="0.07" />
      </pattern>
      <linearGradient id={ids.brand} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={ACC} />
        <stop offset="1" stopColor={SIG} />
      </linearGradient>
      <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </>
  );
}

function Tag({ x, y, children, tone = "#a4aac3", w }: { x: number; y: number; children: ReactNode; tone?: string; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="16" rx="8" fill="#0b0d18" stroke="#ffffff" strokeOpacity="0.1" />
      <text x={x + w / 2} y={y + 11} textAnchor="middle" fontSize="7.5" fill={tone} style={mono}>
        {children}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------------- */
/* 1. Tier matrix                                                              */
/* ------------------------------------------------------------------------- */

const TIERS = [
  { alias: "smart", models: ["gpt-6.2-sol", "claude-opus-5-5", "gemini-4-argon"] },
  { alias: "balanced", models: ["gpt-6.1-terra", "claude-sonnet-5-5", "gemini-3.8-flash"] },
  { alias: "fast", models: ["gpt-6-luna", "claude-haiku-5-5", "gemini-3.5-flash-lite"] },
];

export function TierMatrix() {
  const reduce = useReducedMotion();
  const ids = useIds("dots", "brand", "glow", "beam", "row", "clip");
  const X0 = 92;
  const COL = 108;
  const ROW_Y = [74, 112, 150];
  return (
    <svg viewBox="0 0 420 200" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Defs ids={ids} />
        <linearGradient id={ids.beam} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={SIG} stopOpacity="0" />
          <stop offset="0.5" stopColor={SIG} stopOpacity="0.35" />
          <stop offset="1" stopColor={SIG} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={ids.row} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={ACC} stopOpacity="0.22" />
          <stop offset="1" stopColor={SIG} stopOpacity="0.12" />
        </linearGradient>
        <clipPath id={ids.clip}>
          <rect x="14" y={ROW_Y[1]! - 15} width="392" height="30" rx="10" />
        </clipPath>
      </defs>
      <rect width="420" height="200" fill={`url(#${ids.dots})`} />

      {/* request chip */}
      <g>
        <rect x="14" y="10" width="118" height="22" rx="11" fill="#0b0d18" stroke={ACC} strokeOpacity="0.5" />
        <circle cx="27" cy="21" r="3" fill={ACC} filter={`url(#${ids.glow})`} />
        <text x="36" y="24.5" fontSize="8.5" fill="#eef0fb" style={mono}>
          model: &quot;balanced&quot;
        </text>
      </g>
      <path d={`M14 21 H11 Q7 21 7 25 V${ROW_Y[1]! - 4} Q7 ${ROW_Y[1]} 11 ${ROW_Y[1]} H14`} fill="none" stroke={`url(#${ids.brand})`} strokeWidth="1.2" strokeDasharray="3 4" className={reduce ? undefined : "flow"} />

      {/* column headers */}
      {["OpenAI", "Anthropic", "Gemini"].map((h, i) => (
        <text key={h} x={X0 + i * COL + COL / 2 - 4} y="56" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#a4aac3" style={sans}>
          {h}
        </text>
      ))}

      {/* highlighted row backplate */}
      <rect x="14" y={ROW_Y[1]! - 15} width="392" height="30" rx="10" fill={`url(#${ids.row})`} stroke={SIG} strokeOpacity="0.45" />
      {!reduce && (
        <g clipPath={`url(#${ids.clip})`}>
          <rect x="-80" y={ROW_Y[1]! - 15} width="80" height="30" fill={`url(#${ids.beam})`}>
            <animate attributeName="x" values="-80;420" dur="2.8s" repeatCount="indefinite" />
          </rect>
        </g>
      )}

      {TIERS.map((t, r) => {
        const y = ROW_Y[r]!;
        const lit = t.alias === "balanced";
        return (
          <g key={t.alias}>
            <text x="22" y={y + 3} fontSize="9" fontWeight={lit ? 700 : 500} fill={lit ? "#ffffff" : "#727a96"} style={mono}>
              &quot;{t.alias}&quot;
            </text>
            {t.models.map((m, c) => {
              const cx = X0 + c * COL;
              return (
                <g key={m}>
                  <rect
                    x={cx}
                    y={y - 10}
                    width={COL - 8}
                    height="20"
                    rx="6"
                    fill={lit ? "#0b0d18" : "#ffffff"}
                    fillOpacity={lit ? 0.9 : 0.025}
                    stroke={lit ? (c === 0 ? SIG : ACC) : "#ffffff"}
                    strokeOpacity={lit ? (c === 0 ? 0.9 : 0.35) : 0.07}
                  />
                  {lit && c === 0 && <circle cx={cx + 9} cy={y} r="2.6" fill={SIG} filter={`url(#${ids.glow})`} />}
                  <text x={lit && c === 0 ? cx + 16 : cx + (COL - 8) / 2} y={y + 3} textAnchor={lit && c === 0 ? "start" : "middle"} fontSize="7.6" fill={lit ? (c === 0 ? SIG : "#d9dcef") : "#6b7288"} style={mono}>
                    {m}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      <text x="406" y="190" textAnchor="end" fontSize="7.5" fill="#727a96" style={mono}>
        backend/models.yaml
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. Same-tier fallback route                                                 */
/* ------------------------------------------------------------------------- */

export function FallbackRoute() {
  const reduce = useReducedMotion();
  const ids = useIds("dots", "brand", "glow", "orb", "fail");
  const IN = "M44 104 H140";
  const UP = "M172 104 C220 104 230 54 286 54";
  const DOWN = "M172 104 C220 104 230 154 286 154";
  return (
    <svg viewBox="0 0 420 200" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Defs ids={ids} />
        <radialGradient id={ids.orb}>
          <stop offset="0" stopColor="#c7cbff" />
          <stop offset="0.55" stopColor={ACC} stopOpacity="0.55" />
          <stop offset="1" stopColor={ACC} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.fail}>
          <stop offset="0" stopColor={ERR} stopOpacity="0.5" />
          <stop offset="1" stopColor={ERR} stopOpacity="0" />
        </radialGradient>
        <path id={`${ids.brand}-ok`} d="M44 104 H172 C220 104 230 154 286 154" />
        <path id={`${ids.brand}-up`} d="M156 104 H172 C220 104 230 54 286 54" />
      </defs>
      <rect width="420" height="200" fill={`url(#${ids.dots})`} />

      {/* links */}
      <path d={IN} stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.4" />
      <path d={UP} fill="none" stroke={ERR} strokeOpacity="0.45" strokeWidth="1.4" strokeDasharray="3 5" />
      <path d={DOWN} fill="none" stroke={`url(#${ids.brand})`} strokeWidth="2" filter={`url(#${ids.glow})`} />

      {/* client */}
      <g>
        <circle cx="30" cy="104" r="14" fill="#0b0d18" stroke="#ffffff" strokeOpacity="0.15" />
        <text x="30" y="107" textAnchor="middle" fontSize="7.5" fill="#a4aac3" style={mono}>app</text>
      </g>

      {/* router orb */}
      <g>
        <circle cx="156" cy="104" r="30" fill={`url(#${ids.orb})`} opacity="0.55" />
        <circle cx="156" cy="104" r="17" fill="#0b0d18" stroke={ACC} strokeWidth="1.4" />
        <circle cx="156" cy="104" r="23" fill="none" stroke={ACC} strokeOpacity="0.4" strokeDasharray="2 5">
          {!reduce && <animateTransform attributeName="transform" type="rotate" from="0 156 104" to="360 156 104" dur="14s" repeatCount="indefinite" />}
        </circle>
        <path d="M156 105 V97 M156 105 l-6 5 M156 105 l6 5" stroke="#c7cbff" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="156" cy="105" r="2.4" fill="#ffffff" />
      </g>

      {/* failed provider */}
      <g>
        <circle cx="300" cy="54" r="26" fill={`url(#${ids.fail})`}>
          {!reduce && <animate attributeName="r" values="14;30;14" dur="1.8s" repeatCount="indefinite" />}
        </circle>
        <circle cx="300" cy="54" r="13" fill="#140b10" stroke={ERR} strokeOpacity="0.8" />
        <path d="m295.5 49.5 9 9m0-9-9 9" stroke={ERR} strokeWidth="1.7" strokeLinecap="round" />
        <text x="320" y="51" fontSize="9" fontWeight="600" fill="#eef0fb" style={sans}>Anthropic</text>
        <text x="320" y="63" fontSize="7.5" fill={ERR} style={mono}>claude-opus-5-5</text>
      </g>
      <Tag x={200} y={22} w={84} tone={ERR}>timeout ×2</Tag>

      {/* serving provider */}
      <g>
        <circle cx="300" cy="154" r="13" fill="#08161a" stroke={SIG} strokeWidth="1.4" filter={`url(#${ids.glow})`} />
        <path d="m294.5 154 3.6 3.6 6.4-7" stroke={SIG} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {!reduce && (
          <circle cx="300" cy="154" r="13" fill="none" stroke={SIG}>
            <animate attributeName="r" values="13;24" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}
        <text x="320" y="151" fontSize="9" fontWeight="600" fill="#eef0fb" style={sans}>OpenAI</text>
        <text x="320" y="163" fontSize="7.5" fill={SIG} style={mono}>gpt-6.2-sol</text>
      </g>
      <Tag x={192} y={170} w={92} tone={SIG}>same tier · 918 ms</Tag>

      {/* comet packet on the success path, red probe on the failed branch */}
      {!reduce && (
        <>
          {[0, 0.04, 0.08, 0.12].map((lag, i) => (
            <circle key={i} r={3.6 - i * 0.7} fill={SIG} opacity={1 - i * 0.22} filter={i === 0 ? `url(#${ids.glow})` : undefined}>
              <animateMotion dur="2.4s" begin={`-${lag}s`} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear">
                <mpath href={`#${ids.brand}-ok`} />
              </animateMotion>
            </circle>
          ))}
          <circle r="3" fill={ERR}>
            <animateMotion dur="2.4s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.45;1" calcMode="linear">
              <mpath href={`#${ids.brand}-up`} />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.42;0.47;1" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Cost chart                                                               */
/* ------------------------------------------------------------------------- */

export function CostChart() {
  const reduce = useReducedMotion();
  const ids = useIds("dots", "brand", "glow", "area");
  const xs = [28, 74, 120, 166, 212, 258, 304];
  const ys = [118, 104, 110, 86, 92, 66, 52];
  let d = `M${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1]! + xs[i]!) / 2;
    d += ` C${cx} ${ys[i - 1]} ${cx} ${ys[i]} ${xs[i]} ${ys[i]}`;
  }
  return (
    <svg viewBox="0 0 320 170" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Defs ids={ids} />
        <linearGradient id={ids.area} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ACC} stopOpacity="0.35" />
          <stop offset="1" stopColor={ACC} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="170" fill={`url(#${ids.dots})`} />
      {[52, 85, 118].map((y) => (
        <line key={y} x1="20" x2="312" y1={y} y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeDasharray="2 4" />
      ))}
      <path d={`${d} L304 140 L28 140 Z`} fill={`url(#${ids.area})`} />
      <path d={d} fill="none" stroke={`url(#${ids.brand})`} strokeWidth="2.2" strokeLinecap="round" filter={`url(#${ids.glow})`} pathLength={1} strokeDasharray="1" strokeDashoffset="0">
        {!reduce && <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.5;1" dur="6s" repeatCount="indefinite" />}
      </path>
      {xs.map((x, i) => (
        <text key={x} x={x} y="156" textAnchor="middle" fontSize="7" fill="#6b7288" style={mono}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
        </text>
      ))}
      {/* endpoint + tooltip */}
      <line x1="304" x2="304" y1="52" y2="140" stroke={SIG} strokeOpacity="0.35" strokeDasharray="2 3" />
      <circle cx="304" cy="52" r="4" fill={SIG} filter={`url(#${ids.glow})`} />
      {!reduce && (
        <circle cx="304" cy="52" r="4" fill="none" stroke={SIG}>
          <animate attributeName="r" values="4;12" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <g>
        <rect x="186" y="10" width="106" height="34" rx="9" fill="#0b0d18" stroke="#ffffff" strokeOpacity="0.12" />
        <text x="196" y="24" fontSize="8.5" fontWeight="600" fill="#eef0fb" style={mono}>$0.002120</text>
        <text x="250" y="24" fontSize="7" fill="#727a96" style={mono}>/ call</text>
        <circle cx="198" cy="34" r="2.4" fill="#4ade80" />
        <text x="204" y="36.5" fontSize="7" fill="#4ade80" style={mono}>cache hits: $0</text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* 4. Streaming tokens into a chat bubble                                      */
/* ------------------------------------------------------------------------- */

const STREAM_LINES = [
  ["Routed", "to", "openai", "on", "the"],
  ["balanced", "tier.", "Streaming", "via", "SSE"],
  ["with", "usage", "recorded", "at", "close."],
];

export function StreamChat() {
  const reduce = useReducedMotion();
  const ids = useIds("dots", "brand", "glow");
  const words = STREAM_LINES.flat();
  const total = words.length;
  const CHAR = 5.15; // 8.5px Geist Mono advance
  let k = 0;
  return (
    <svg viewBox="0 0 320 170" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Defs ids={ids} />
      </defs>
      <rect width="320" height="170" fill={`url(#${ids.dots})`} />

      {/* SSE frame rail */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="14" y={26 + i * 26} width="70" height="16" rx="5" fill="#0b0d18" stroke={ACC} strokeOpacity={0.15 + i * 0.1} />
          <text x="21" y={37 + i * 26} fontSize="6.8" fill="#8f97ff" style={mono}>
            data: {"{"}δ{"}"}
          </text>
        </g>
      ))}
      <text x="14" y="140" fontSize="6.8" fill="#727a96" style={mono}>
        data: [DONE]
      </text>
      <path d="M88 76 H104" stroke={`url(#${ids.brand})`} strokeWidth="1.2" className={reduce ? undefined : "flow"} />

      {/* bubble */}
      <rect x="108" y="22" width="198" height="104" rx="14" fill="#0b0d18" stroke="#ffffff" strokeOpacity="0.1" />
      <circle cx="124" cy="38" r="5" fill={`url(#${ids.brand})`} />
      <text x="134" y="41" fontSize="7.5" fill="#a4aac3" style={sans}>
        assistant
      </text>
      {STREAM_LINES.map((line, r) => {
        let x = 119;
        return line.map((w) => {
          const i = k++;
          const start = (i / total) * 0.62;
          const el = (
            <text key={`${r}-${w}-${i}`} x={x} y={64 + r * 17} fontSize="8.5" fill="#d9dcef" style={mono} opacity={reduce ? 1 : 0}>
              {w}
              {!reduce && (
                <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${start.toFixed(3)};${(start + 0.03).toFixed(3)};0.93;1`} dur="5s" repeatCount="indefinite" />
              )}
            </text>
          );
          x += (w.length + 1) * CHAR;
          return el;
        });
      })}
      <rect x="120" y="106" width="34" height="10" rx="5" fill={SIG} fillOpacity="0.15" />
      <text x="137" y="113.5" textAnchor="middle" fontSize="6.5" fill={SIG} style={mono}>
        live
      </text>
      <text x="306" y="150" textAnchor="end" fontSize="7" fill="#727a96" style={mono}>
        text/event-stream
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------------- */
/* 5. Latency gauge                                                            */
/* ------------------------------------------------------------------------- */

export function LatencyGauge() {
  const reduce = useReducedMotion();
  const ids = useIds("dots", "brand", "glow", "arc");
  const cx = 160;
  const cy = 118;
  const R = 78;
  // 0 s .. 3 s mapped onto a 180° arc; p95 = 1.4 s
  const angle = (s: number) => Math.PI - (s / 3) * Math.PI;
  // rounded so server and browser render identical attributes (no hydration mismatch)
  const round = (v: number) => Math.round(v * 100) / 100;
  const pt = (s: number, r = R) => [round(cx + r * Math.cos(angle(s))), round(cy - r * Math.sin(angle(s)))] as const;
  const needleDeg = -90 + (1.4 / 3) * 180;
  return (
    <svg viewBox="0 0 320 170" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Defs ids={ids} />
        <linearGradient id={ids.arc} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={SIG} />
          <stop offset="0.55" stopColor={ACC} />
          <stop offset="1" stopColor={ERR} />
        </linearGradient>
      </defs>
      <rect width="320" height="170" fill={`url(#${ids.dots})`} />
      {/* track + value arc */}
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="10" strokeLinecap="round" />
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke={`url(#${ids.arc})`} strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      {/* ticks */}
      {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((s) => {
        const [x1, y1] = pt(s, R - 12);
        const [x2, y2] = pt(s, R - 18);
        const [tx, ty] = pt(s, R + 14);
        return (
          <g key={s}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.25" />
            <text x={tx} y={ty + 3} textAnchor="middle" fontSize="6.8" fill="#6b7288" style={mono}>
              {s}s
            </text>
          </g>
        );
      })}
      {/* needle */}
      <g transform={`rotate(${needleDeg} ${cx} ${cy})`}>
        {!reduce && (
          <animateTransform attributeName="transform" type="rotate" values={`${needleDeg - 6} ${cx} ${cy};${needleDeg + 4} ${cx} ${cy};${needleDeg - 6} ${cx} ${cy}`} dur="3.2s" repeatCount="indefinite" />
        )}
        <path d={`M${cx - 2.4} ${cy} L${cx} ${cy - R + 20} L${cx + 2.4} ${cy} Z`} fill="#eef0fb" />
      </g>
      <circle cx={cx} cy={cy} r="7" fill="#0b0d18" stroke={ACC} strokeWidth="1.6" filter={`url(#${ids.glow})`} />
      {/* readouts */}
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize="15" fontWeight="600" fill="#eef0fb" style={sans}>
        1.4 s
      </text>
      <text x={cx} y={cy + 38} textAnchor="middle" fontSize="7" fill="#727a96" style={mono}>
        p95 latency
      </text>
      <Tag x={14} y={14} w={74} tone={SIG}>p50 490 ms</Tag>
      <Tag x={232} y={14} w={74} tone="#a4aac3">mean 605 ms</Tag>
    </svg>
  );
}
