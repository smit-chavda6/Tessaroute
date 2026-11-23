"use client";

import { useReducedMotion } from "motion/react";
import { useId } from "react";

/*
  Small animated SVG scenes for the feature bento. Everything is drawn from the
  theme tokens so the scenes work in dark and light. SMIL animation is omitted
  entirely for reduced-motion users (CSS media queries can't stop SMIL).
*/

const mono = { fontFamily: "var(--font-mono)" } as const;

function useIds(...names: string[]) {
  const id = useId().replace(/:/g, "");
  return Object.fromEntries(names.map((n) => [n, `${n}${id}`])) as Record<string, string>;
}

function Grad({ id, a = "var(--accent)", b = "var(--signal)", o1 = 1, o2 = 1, vertical = false }: { id: string; a?: string; b?: string; o1?: number; o2?: number; vertical?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? "0" : "1"} y2={vertical ? "1" : "0"}>
      <stop offset="0" stopColor={a} stopOpacity={o1} />
      <stop offset="1" stopColor={b} stopOpacity={o2} />
    </linearGradient>
  );
}

/** Three isometric slabs: smart / balanced / fast, with balanced lit. */
export function TierStack() {
  const reduce = useReducedMotion();
  const ids = useIds("lit", "litSide", "glow");
  const slabs = [
    { y: 46, label: "smart", model: "claude-opus-5-5", lit: false, phase: "0s" },
    { y: 86, label: "balanced", model: "gpt-6.1-terra", lit: true, phase: "0.4s" },
    { y: 126, label: "fast", model: "gemini-3.5-flash-lite", lit: false, phase: "0.8s" },
  ];
  return (
    <svg viewBox="0 0 340 176" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Grad id={ids.lit!} o1={0.95} o2={0.85} />
        <Grad id={ids.litSide!} o1={0.55} o2={0.4} vertical />
        <radialGradient id={ids.glow!}>
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="104" cy="90" rx="96" ry="42" fill={`url(#${ids.glow})`} />
      {slabs
        .slice()
        .reverse()
        .map((s) => (
          <g key={s.label}>
            {!reduce && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 0 -4; 0 0"
                dur="3.6s"
                begin={s.phase}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
              />
            )}
            {/* side faces */}
            <path
              d={`M24 ${s.y} L104 ${s.y + 24} L104 ${s.y + 34} L24 ${s.y + 10} Z`}
              fill={s.lit ? `url(#${ids.litSide})` : "var(--panel-2)"}
              stroke="var(--line-2)"
              strokeWidth="1"
            />
            <path
              d={`M104 ${s.y + 24} L184 ${s.y} L184 ${s.y + 10} L104 ${s.y + 34} Z`}
              fill={s.lit ? `url(#${ids.litSide})` : "var(--bg-2)"}
              stroke="var(--line-2)"
              strokeWidth="1"
            />
            {/* top face */}
            <path
              d={`M104 ${s.y - 24} L184 ${s.y} L104 ${s.y + 24} L24 ${s.y} Z`}
              fill={s.lit ? `url(#${ids.lit})` : "var(--panel)"}
              stroke={s.lit ? "var(--signal)" : "var(--line-2)"}
              strokeWidth="1"
            />
            {!s.lit && (
              <path d={`M64 ${s.y - 12} L144 ${s.y + 12}`} stroke="var(--line-2)" strokeWidth="1" strokeDasharray="2 5" />
            )}
            {/* leader + label */}
            <path d={`M184 ${s.y} H206`} stroke={s.lit ? "var(--signal)" : "var(--line-2)"} strokeWidth="1" />
            <circle cx="206" cy={s.y} r="2.5" fill={s.lit ? "var(--signal)" : "var(--line-2)"} />
            <text x="214" y={s.y - 2} fontSize="11.5" fontWeight="600" fill={s.lit ? "var(--ink)" : "var(--muted)"} style={mono}>
              {`"${s.label}"`}
            </text>
            <text x="214" y={s.y + 12} fontSize="9.5" fill={s.lit ? "var(--signal)" : "var(--faint)"} style={mono}>
              {s.model}
            </text>
          </g>
        ))}
    </svg>
  );
}

/** Request → hub → failed provider (✕) → same-tier provider (✓), with a packet. */
export function FallbackPath() {
  const reduce = useReducedMotion();
  const ids = useIds("ok", "path");
  const okPath = "M30 92 H112 C150 92 160 134 206 134";
  return (
    <svg viewBox="0 0 340 176" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Grad id={ids.ok!} />
      </defs>
      <path d="M30 92 H112" stroke="var(--line-2)" strokeWidth="1.5" />
      <path d="M112 92 C150 92 160 46 206 46" fill="none" stroke="var(--err)" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 5" />
      <path d="M112 92 C150 92 160 134 206 134" fill="none" stroke={`url(#${ids.ok})`} strokeWidth="2" className={reduce ? undefined : "flow"} />

      {/* client */}
      <rect x="6" y="80" width="40" height="24" rx="7" fill="var(--panel-2)" stroke="var(--line-2)" />
      <text x="26" y="95.5" fontSize="8.5" textAnchor="middle" fill="var(--muted)" style={mono}>
        req
      </text>
      {/* hub */}
      <circle cx="112" cy="92" r="17" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M112 93V85M112 93l-6 5M112 93l6 5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="112" cy="93" r="2.4" fill="var(--accent)" />

      {/* failed provider */}
      <g>
        <rect x="206" y="30" width="122" height="32" rx="9" fill="var(--panel-2)" stroke="var(--err)" strokeOpacity="0.6" />
        <circle cx="222" cy="46" r="7" fill="var(--err)" fillOpacity="0.15" />
        <path d="m219 43 6 6m0-6-6 6" stroke="var(--err)" strokeWidth="1.6" strokeLinecap="round" />
        <text x="236" y="43" fontSize="9" fill="var(--ink)" style={mono}>anthropic</text>
        <text x="236" y="55" fontSize="8" fill="var(--err)" style={mono}>timeout ×2</text>
      </g>
      {/* serving provider */}
      <g>
        <rect x="206" y="118" width="122" height="32" rx="9" fill="var(--panel-2)" stroke="var(--signal)" />
        <circle cx="222" cy="134" r="7" fill="var(--signal)" fillOpacity="0.18" />
        <path d="m218.5 134 2.5 2.6 4.6-5" stroke="var(--signal)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="236" y="131" fontSize="9" fill="var(--ink)" style={mono}>openai</text>
        <text x="236" y="143" fontSize="8" fill="var(--signal)" style={mono}>gpt-6.2-sol</text>
      </g>
      <text x="122" y="132" fontSize="8" fill="var(--signal)" fillOpacity="0.8" style={mono}>same tier</text>

      {!reduce && (
        <circle r="4" fill="var(--signal)" style={{ filter: "drop-shadow(0 0 5px var(--signal))" }}>
          <animateMotion dur="2.6s" repeatCount="indefinite" path={okPath} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

/** Spend curve that draws itself, with a per-call price tag. */
export function CostSpark() {
  const reduce = useReducedMotion();
  const ids = useIds("area", "line");
  const pts = [8, 120, 46, 112, 84, 116, 122, 96, 160, 102, 198, 78, 236, 84, 274, 58, 312, 48];
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) {
    const [px, py, x, y] = [pts[i - 2]!, pts[i - 1]!, pts[i]!, pts[i + 1]!];
    const cx = (px + x) / 2;
    d += ` C${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }
  const area = `${d} L312 150 L8 150 Z`;
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id={ids.area} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.38" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
        <Grad id={ids.line!} />
      </defs>
      {[60, 90, 120, 150].map((y) => (
        <line key={y} x1="8" x2="312" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#${ids.area})`} />
      <path d={d} fill="none" stroke={`url(#${ids.line})`} strokeWidth="2.4" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset="0">
        {!reduce && <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.55;1" dur="5s" repeatCount="indefinite" />}
      </path>
      <circle cx="312" cy="48" r="4" fill="var(--signal)" />
      {!reduce && (
        <circle cx="312" cy="48" r="4" fill="none" stroke="var(--signal)">
          <animate attributeName="r" values="4;13" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <g>
        <rect x="186" y="12" width="112" height="24" rx="12" fill="var(--panel-2)" stroke="var(--line-2)" />
        <circle cx="200" cy="24" r="3" fill="var(--ok)" />
        <text x="209" y="27.5" fontSize="10" fill="var(--ink)" style={mono}>$0.002120</text>
        <text x="266" y="27.5" fontSize="8" fill="var(--faint)" style={mono}>/call</text>
      </g>
    </svg>
  );
}

/** Tokens arriving as SSE chunks. */
export function StreamTokens() {
  const reduce = useReducedMotion();
  const ids = useIds("tok");
  const rows = [
    [38, 54, 30, 62],
    [46, 28, 70, 40],
    [58, 36, 24],
  ];
  let n = 0;
  const total = rows.flat().length;
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Grad id={ids.tok!} o1={0.9} o2={0.7} />
      </defs>
      <text x="12" y="24" fontSize="10" fill="var(--faint)" style={mono}>
        data: {"{"}&quot;delta&quot;: …{"}"}
      </text>
      {rows.map((row, r) => {
        let x = 12;
        return row.map((w, i) => {
          const k = n++;
          const el = (
            <rect key={`${r}-${i}`} x={x} y={44 + r * 32} width={w} height="18" rx="9" fill={`url(#${ids.tok})`} opacity={reduce ? 1 : 0}>
              {!reduce && (
                <animate
                  attributeName="opacity"
                  values="0;0;1;1;0"
                  keyTimes={`0;${(k / total) * 0.6};${(k / total) * 0.6 + 0.04};0.92;1`}
                  dur="4.5s"
                  repeatCount="indefinite"
                />
              )}
            </rect>
          );
          x += w + 8;
          return el;
        });
      })}
      <rect x="148" y="108" width="2" height="18" fill="var(--signal)">
        {!reduce && <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />}
      </rect>
      <text x="12" y="150" fontSize="9" fill="var(--faint)" style={mono}>
        data: [DONE]
      </text>
    </svg>
  );
}

/** Latency histogram with a p95 marker, as scraped from /metrics. */
export function LatencyBars() {
  const reduce = useReducedMotion();
  const ids = useIds("bar");
  const hs = [22, 48, 86, 104, 92, 70, 50, 34, 22, 14, 9, 6];
  return (
    <svg viewBox="0 0 320 160" className="h-auto w-full" aria-hidden="true">
      <defs>
        <Grad id={ids.bar!} a="var(--accent)" b="var(--signal)" vertical o1={0.95} o2={0.35} />
      </defs>
      <line x1="10" x2="310" y1="136" y2="136" stroke="var(--line-2)" />
      {hs.map((h, i) => {
        const x = 14 + i * 24.5;
        return (
          <rect key={i} x={x} y={136 - h} width="17" height={h} rx="4" fill={`url(#${ids.bar})`} opacity={i > 8 ? 0.55 : 1}>
            {!reduce && (
              <animate
                attributeName="height"
                values={`${h};${h * 0.72};${h}`}
                dur={`${2.4 + (i % 4) * 0.3}s`}
                repeatCount="indefinite"
              />
            )}
            {!reduce && (
              <animate
                attributeName="y"
                values={`${136 - h};${136 - h * 0.72};${136 - h}`}
                dur={`${2.4 + (i % 4) * 0.3}s`}
                repeatCount="indefinite"
              />
            )}
          </rect>
        );
      })}
      <line x1="232" x2="232" y1="22" y2="140" stroke="var(--warn)" strokeDasharray="3 4" />
      <rect x="238" y="16" width="62" height="20" rx="10" fill="var(--panel-2)" stroke="var(--line-2)" />
      <text x="248" y="29.5" fontSize="9.5" fill="var(--warn)" style={mono}>
        p95 1.4s
      </text>
      <text x="10" y="154" fontSize="8.5" fill="var(--faint)" style={mono}>
        gateway_request_latency_seconds
      </text>
    </svg>
  );
}
