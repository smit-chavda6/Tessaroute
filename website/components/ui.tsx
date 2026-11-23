"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Glyph } from "./Glyphs";

/** Fades/slides children in once they scroll into view. Content is in the DOM
 *  from the first render; reduced-motion users get it with no movement. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  center = false,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={`mb-12 grid max-w-2xl gap-4 ${center ? "mx-auto text-center" : ""}`}>
      <p className={`eyebrow flex items-center gap-2 ${center ? "justify-center" : ""}`}>
        <Glyph name="mesh" className="h-4 w-4" />
        {eyebrow}
      </p>
      <h2 className="font-display text-[clamp(2rem,4.2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
        {title}
      </h2>
      {lede ? <p className="text-[1.05rem] leading-relaxed text-muted">{lede}</p> : null}
    </Reveal>
  );
}

/** Card whose border glows where the pointer is. */
export function SpotlightCard({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const onMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);
  return (
    <Tag
      ref={ref as never}
      onPointerMove={onMove}
      className={`spot ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="im-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill="url(#im-logo)" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9">
        <path d="M16 16.6 16 7.6" />
        <path d="M16 16.6 8 23" />
        <path d="M16 16.6 24 23" />
      </g>
      <g fill="#fff">
        <circle cx="16" cy="16.6" r="3.2" />
        <circle cx="16" cy="7.6" r="2.5" />
        <circle cx="8" cy="23" r="2.5" />
        <circle cx="24" cy="23" r="2.5" />
      </g>
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.27 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
    />
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  db: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5.5M4.5 12v6.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V12" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.6 9.2c-.5-.8-1.4-1.2-2.6-1.2-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2c1.7.3 2.8.9 2.8 2.1S13.6 16 12 16c-1.2 0-2.2-.5-2.7-1.3M12 6.5V8m0 8v1.5" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
  play: <path d="M7 5v14l12-7L7 5Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  reset: <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  shield: <path d="M12 3 4.5 6v6c0 4.4 3.2 8.2 7.5 9 4.3-.8 7.5-4.6 7.5-9V6L12 3Z" />,
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          /* clipboard blocked: leave the text visible for manual copy */
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[0.72rem] text-term-ink transition hover:bg-white/10 ${className}`}
      aria-label={done ? "Copied" : label}
    >
      <Icon name={done ? "check" : "copy"} className="h-3.5 w-3.5" />
      {done ? "Copied" : label}
    </button>
  );
}

export function money(usd: number, cur: "USD" | "INR", inr: number) {
  const v = cur === "USD" ? usd : usd * inr;
  const sym = cur === "USD" ? "$" : "₹";
  const small = v < 100;
  return (
    sym +
    v.toLocaleString(cur === "USD" ? "en-US" : "en-IN", {
      minimumFractionDigits: small ? 2 : 0,
      maximumFractionDigits: small ? 2 : 0,
    })
  );
}
