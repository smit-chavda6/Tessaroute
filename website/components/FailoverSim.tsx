"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Glyph } from "./Glyphs";
import { Reveal, SectionHead } from "./ui";

/*
  Failover, live. Follows the gateway's router rules: try providers in
  FALLBACK_CHAIN order; 5 consecutive failures open a provider's circuit;
  after a cooldown one probe is let through (half-open); a success closes it.
  The cooldown is shortened to 6 s for the demo.

  Layout: client → router orb → provider cards. Cards are real HTML; the SVG
  link layer is drawn from their measured positions, so lines always meet the
  cards exactly at every width. Below md the link layer is hidden and the
  cards stack.
*/

const THRESHOLD = 5;
const COOLDOWN_MS = 6000;
const TICK_MS = 1100;
const FLIGHT_MS = 950;

type Circuit = "closed" | "open" | "half";
type Prov = { id: string; name: string; model: string; up: boolean; fails: number; circuit: Circuit; openedAt: number };
type Outcome = { id: number; served: number | null; failed: number[]; skipped: number[]; ms: number };
type Geo = { client: { x: number; y: number }; hub: { x: number; y: number; r: number }; cards: { x: number; y: number }[] } | null;

const INITIAL: Prov[] = [
  { id: "openai", name: "OpenAI", model: "gpt-6.1-terra", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-5-5", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "gemini", name: "Gemini", model: "gemini-3.8-flash", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "azure_foundry", name: "Azure Foundry", model: "deployment default", up: true, fails: 0, circuit: "closed", openedAt: 0 },
];

/* ------------------------------------------------------------------------ */

export function FailoverSim() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const inView = useInView(section, { margin: "-15%" });

  const [provs, setProvs] = useState<Prov[]>(INITIAL);
  const provRef = useRef(provs);
  provRef.current = provs;
  const [running, setRunning] = useState(true);
  const [history, setHistory] = useState<Outcome[]>([]);
  const [flights, setFlights] = useState<{ id: number; to: number; ok: boolean }[]>([]);
  const [pulses, setPulses] = useState<Record<number, { kind: "ok" | "fail"; n: number }>>({});
  const seq = useRef(0);

  const tick = useCallback(
    (silent = false) => {
      const now = Date.now();
      const next = provRef.current.map((p) => ({ ...p }));
      const failed: number[] = [];
      const skipped: number[] = [];
      let served: number | null = null;
      for (let i = 0; i < next.length; i++) {
        const p = next[i]!;
        if (p.circuit === "open") {
          if (now - p.openedAt >= COOLDOWN_MS) p.circuit = "half";
          else {
            skipped.push(i);
            continue;
          }
        }
        if (!p.up) {
          p.fails += 1;
          failed.push(i);
          if (p.circuit === "half" || p.fails >= THRESHOLD) {
            p.circuit = "open";
            p.openedAt = now;
          }
          continue;
        }
        p.fails = 0;
        p.circuit = "closed";
        served = i;
        break;
      }
      const id = ++seq.current;
      provRef.current = next;
      setProvs(next);
      setHistory((h) => [{ id, served, failed, skipped, ms: 280 + Math.round(Math.random() * 640) }, ...h].slice(0, 60));
      if (silent || reduce) return;
      setFlights((f) => [
        ...f.slice(-10),
        ...failed.map((to) => ({ id: id * 10 + to, to, ok: false })),
        ...(served !== null ? [{ id: id * 10 + 9, to: served, ok: true }] : []),
      ]);
      window.setTimeout(() => {
        setPulses((ps) => {
          const n = { ...ps };
          failed.forEach((i) => (n[i] = { kind: "fail", n: id }));
          if (served !== null) n[served] = { kind: "ok", n: id };
          return n;
        });
      }, FLIGHT_MS * 0.9);
    },
    [reduce],
  );

  useEffect(() => {
    if (!running || !inView || reduce) return;
    const t = setInterval(() => tick(), TICK_MS);
    return () => clearInterval(t);
  }, [running, inView, reduce, tick]);

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    for (let i = 0; i < 6; i++) tick(true);
  }, [tick]);

  const toggle = (i: number) =>
    setProvs((ps) => {
      const next = ps.map((p, j) => (j === i ? { ...p, up: !p.up } : p));
      provRef.current = next;
      return next;
    });
  const chaos = () =>
    setProvs((ps) => {
      const ups = ps.map((p, i) => (p.up ? i : -1)).filter((i) => i >= 0);
      const pick = ups.length ? ups[Math.floor(Math.random() * ups.length)]! : Math.floor(Math.random() * ps.length);
      const next = ps.map((p, i) => (i === pick ? { ...p, up: !p.up } : p));
      provRef.current = next;
      return next;
    });
  const reset = () => {
    provRef.current = INITIAL;
    setProvs(INITIAL);
    setHistory([]);
    setFlights([]);
    setPulses({});
  };

  const stats = useMemo(() => {
    const total = history.length;
    const ok = history.filter((h) => h.served !== null).length;
    const fb = history.filter((h) => h.served !== null && h.served > 0).length;
    return { total, ok, fb, fail: total - ok, rate: total ? Math.round((ok / total) * 100) : 100 };
  }, [history]);

  return (
    <section className="rule relative py-28" id="simulator">
      <div className="wrap" ref={section}>
        <SectionHead
          eyebrow="Failover, live"
          title={
            <>
              Take a provider down. <span className="text-muted">Watch traffic move.</span>
            </>
          }
          lede="A live model of the router: providers are tried in order, five straight failures open a provider's circuit, and after a cooldown one probe tests whether it has recovered. Flip the switches or hit Chaos."
        />

        <Reveal>
          <div className="glass overflow-hidden rounded-[28px]">
            <StatsStrip stats={stats} history={history} />
            <Stage
              provs={provs}
              flights={flights}
              pulses={pulses}
              onToggle={toggle}
              onFlightDone={(id) => setFlights((f) => f.filter((x) => x.id !== id))}
              reduce={!!reduce}
            />
            <div className="grid gap-3 border-t border-white/[0.06] p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {!reduce && (
                    <CtlButton onClick={() => setRunning((r) => !r)} glyph={running ? "pause" : "play"}>
                      {running ? "Pause" : "Run"}
                    </CtlButton>
                  )}
                  <CtlButton onClick={() => tick()} glyph="bolt">
                    Send one
                  </CtlButton>
                  <CtlButton onClick={chaos} glyph="route" accent>
                    Chaos
                  </CtlButton>
                  <CtlButton onClick={reset} glyph="reset">
                    Reset
                  </CtlButton>
                </div>
                <ul className="flex flex-wrap gap-4 font-mono text-[0.68rem] text-faint" aria-label="Legend">
                  <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-signal" />served</li>
                  <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-err" />failed attempt</li>
                  <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/25" />skipped (circuit open)</li>
                </ul>
              </div>
              <Log history={history} provs={provs} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function CtlButton({
  children,
  onClick,
  glyph,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  glyph: "play" | "pause" | "bolt" | "route" | "reset";
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5 ${
        accent ? "border-err/40 bg-err/10 text-ink hover:border-err/70" : "border-white/10 bg-white/[0.04] hover:border-white/25"
      }`}
    >
      <Glyph name={glyph} className="h-4 w-4" />
      {children}
    </button>
  );
}

function StatsStrip({ stats, history }: { stats: { total: number; ok: number; fb: number; fail: number; rate: number }; history: Outcome[] }) {
  // rolling success rate over the last 8 requests, oldest → newest
  const series = useMemo(() => {
    const h = [...history].reverse();
    return h.map((_, i) => {
      const win = h.slice(Math.max(0, i - 7), i + 1);
      return win.filter((x) => x.served !== null).length / win.length;
    });
  }, [history]);
  const W = 180;
  const H = 40;
  const pts = series.slice(-40);
  const d = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / Math.max(1, pts.length - 1)) * W).toFixed(1)} ${(H - 4 - v * (H - 16)).toFixed(1)}`)
    .join(" ");
  const items: [string, number, string][] = [
    ["Requests", stats.total, "text-ink"],
    ["Served", stats.ok, "text-ink"],
    ["Via fallback", stats.fb, stats.fb ? "text-warn" : "text-ink"],
    ["Failed", stats.fail, stats.fail ? "text-err" : "text-ink"],
  ];
  return (
    <div className="grid grid-cols-2 gap-px border-b border-white/[0.06] bg-white/[0.05] sm:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.6fr)]">
      {items.map(([label, v, tone]) => (
        <div key={label} className="bg-[rgb(10,12,22)] px-5 py-4">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">{label}</p>
          <p className={`mt-1 font-display text-2xl font-semibold tabular-nums transition-colors ${tone}`}>{v}</p>
        </div>
      ))}
      <div className="col-span-2 flex items-center justify-between gap-4 bg-[rgb(10,12,22)] px-5 py-4 sm:col-span-4 lg:col-span-1">
        <div className="shrink-0">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">Success rate</p>
          <p
            className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
              stats.rate >= 95 ? "text-signal" : stats.rate >= 70 ? "text-warn" : "text-err"
            }`}
          >
            {stats.rate}%
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full max-w-[200px]" aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sim-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5eead4" stopOpacity="0.18" />
              <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {pts.length > 1 && (
            <>
              <line x1="0" x2={W} y1={H - 4} y2={H - 4} stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              <path d={`${d} L${W} ${H - 4} L0 ${H - 4} Z`} fill="url(#sim-spark)" />
              <path d={d} fill="none" stroke="#5eead4" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function Stage({
  provs,
  flights,
  pulses,
  onToggle,
  onFlightDone,
  reduce,
}: {
  provs: Prov[];
  flights: { id: number; to: number; ok: boolean }[];
  pulses: Record<number, { kind: "ok" | "fail"; n: number }>;
  onToggle: (i: number) => void;
  onFlightDone: (id: number) => void;
  reduce: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<Geo>(null);

  const measure = useCallback(() => {
    const s = stage.current?.getBoundingClientRect();
    const c = clientRef.current?.getBoundingClientRect();
    const h = hubRef.current?.getBoundingClientRect();
    if (!s || !c || !h || cardRefs.current.some((el) => !el)) return;
    const cards = cardRefs.current.map((el) => {
      // offsetTop/Left ignore the transient shake transform on cards
      const r = el!.getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top + r.height / 2 };
    });
    setGeo({
      client: { x: c.right - s.left, y: c.top - s.top + c.height / 2 },
      hub: { x: h.left - s.left + h.width / 2, y: h.top - s.top + h.height / 2, r: h.width / 2 },
      cards,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stage.current) ro.observe(stage.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  const inPath = () => {
    if (!geo) return "";
    const { client, hub } = geo;
    const hl = hub.x - hub.r;
    const mid = (client.x + hl) / 2;
    return `M${client.x} ${client.y} C${mid} ${client.y} ${mid} ${hub.y} ${hl} ${hub.y}`;
  };
  const outPath = (i: number) => {
    if (!geo) return "";
    const { hub, cards } = geo;
    const card = cards[i]!;
    const hr = hub.x + hub.r;
    const k = (card.x - hr) * 0.55;
    return `M${hr} ${hub.y} C${hr + k} ${hub.y} ${card.x - k} ${card.y} ${card.x} ${card.y}`;
  };
  // one continuous route for a packet: client → through the orb → card
  const route = (i: number) => {
    if (!geo) return "";
    const hr = geo.hub.x + geo.hub.r;
    return `${inPath()} L${hr} ${geo.hub.y} ${outPath(i).replace(/^M[^C]+/, "")}`;
  };

  return (
    <div
      ref={stage}
      className="relative grid gap-6 p-5 sm:p-8 md:grid-cols-[104px_minmax(0,1fr)_minmax(0,330px)] md:items-center md:gap-10"
    >
      <div
        className="grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        aria-hidden="true"
      />

      {/* link + packet layer (md and up) */}
      {geo && (
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" aria-hidden="true">
          <defs>
            <linearGradient id="sim-link" gradientUnits="userSpaceOnUse" x1={geo.hub.x} y1="0" x2={geo.cards[0]?.x ?? 0} y2="0">
              <stop offset="0" stopColor="#8f97ff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#5eead4" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <path d={inPath()} fill="none" stroke="#8f97ff" strokeOpacity="0.55" strokeWidth="1.5" />
          {provs.map((p, i) => {
            const open = p.circuit === "open";
            const half = p.circuit === "half";
            const down = !p.up;
            return (
              <path
                key={p.id}
                d={outPath(i)}
                fill="none"
                stroke={open || down ? "#f87171" : half ? "#fbbf24" : "url(#sim-link)"}
                strokeOpacity={open ? 0.35 : down ? 0.7 : 1}
                strokeWidth="1.5"
                strokeDasharray={open ? "3 6" : down ? "6 5" : undefined}
                style={{ transition: "stroke 0.3s, stroke-opacity 0.3s" }}
              />
            );
          })}
          {!reduce && flights.map((f) => <Packet key={f.id} d={route(f.to)} ok={f.ok} onDone={() => onFlightDone(f.id)} />)}
        </svg>
      )}

      {/* client */}
      <div className="relative z-10 flex items-center justify-center gap-4 md:flex-col md:gap-3">
        <div
          ref={clientRef}
          className="relative grid h-[84px] w-[84px] place-items-center rounded-2xl border border-white/10 bg-[rgb(12,14,26)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          {!reduce && <span className="pulse-ring absolute inset-0 rounded-2xl border border-accent/40" />}
          <div>
            <Glyph name="mesh" className="mx-auto h-6 w-6" />
            <p className="mt-1 font-mono text-[0.68rem] text-muted">your app</p>
          </div>
        </div>
        <p className="font-mono text-[0.66rem] text-faint md:text-center">POST /v1/chat</p>
      </div>

      {/* router orb */}
      <div className="relative z-10 flex flex-col items-center">
        <div ref={hubRef} className="relative grid h-[132px] w-[132px] place-items-center">
          <div
            className="absolute inset-[-28px] rounded-full bg-[radial-gradient(closest-side,rgba(91,95,240,0.45),transparent)] blur-xl"
            aria-hidden="true"
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent, rgba(143,151,255,0.95), rgba(94,234,212,0.95), transparent 55%)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
            }}
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 6, ease: "linear", repeat: Infinity }}
          />
          <div className="absolute inset-[10px] rounded-full border border-dashed border-white/10" />
          <div className="relative grid h-[92px] w-[92px] place-items-center rounded-full border border-accent/40 bg-[radial-gradient(circle_at_35%_30%,#2b2f6b,#0b0d18_70%)] shadow-[0_0_40px_-6px_rgba(91,95,240,0.7)]">
            <div className="text-center">
              <Glyph name="route" className="mx-auto h-6 w-6" />
              <p className="mt-1 font-display text-[0.8rem] font-semibold">router</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center font-mono text-[0.64rem] leading-relaxed text-faint">
          breaker opens at {THRESHOLD} failures
          <br />
          probe after {COOLDOWN_MS / 1000}s cooldown
        </p>
      </div>

      {/* provider cards */}
      <div className="relative z-10 grid gap-3">
        {provs.map((p, i) => (
          <ProviderCard
            key={p.id}
            cardRef={(el) => {
              cardRefs.current[i] = el;
            }}
            index={i}
            prov={p}
            pulse={pulses[i]}
            onToggle={() => onToggle(i)}
            reduce={reduce}
          />
        ))}
      </div>
    </div>
  );
}

/** A packet with a short comet trail travelling along an SVG path. */
function Packet({ d, ok, onDone }: { d: string; ok: boolean; onDone: () => void }) {
  const pathRef = useRef<SVGPathElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / FLIGHT_MS);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const fade = t > 0.9 ? (1 - t) / 0.1 : t < 0.06 ? t / 0.06 : 1;
      dots.current.forEach((el, k) => {
        if (!el) return;
        const pt = path.getPointAtLength(Math.max(0, ease - k * 0.03) * len);
        el.setAttribute("cx", pt.x.toFixed(1));
        el.setAttribute("cy", pt.y.toFixed(1));
        el.setAttribute("opacity", ((1 - k * 0.24) * fade).toFixed(2));
      });
      if (t < 1) raf = requestAnimationFrame(frame);
      else done.current();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color = ok ? "#5eead4" : "#f87171";
  return (
    <g>
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      {[0, 1, 2, 3].map((k) => (
        <circle
          key={k}
          ref={(el) => {
            dots.current[k] = el;
          }}
          r={4.2 - k * 0.8}
          fill={color}
          opacity="0"
          style={k === 0 ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------------ */

function ProviderCard({
  cardRef,
  index,
  prov,
  pulse,
  onToggle,
  reduce,
}: {
  cardRef: (el: HTMLDivElement | null) => void;
  index: number;
  prov: Prov;
  pulse?: { kind: "ok" | "fail"; n: number };
  onToggle: () => void;
  reduce: boolean;
}) {
  const shaker = useRef<HTMLDivElement | null>(null);
  const [glow, setGlow] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    if (!pulse || reduce) return;
    setGlow(pulse.kind);
    // shake the inner content, not the measured outer box, so links stay put
    if (pulse.kind === "fail" && shaker.current) animate(shaker.current, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.4 });
    const t = setTimeout(() => setGlow(null), 450);
    return () => clearTimeout(t);
  }, [pulse, reduce]);

  const fails = Math.min(prov.fails, THRESHOLD);
  const state = prov.circuit === "open" ? "open" : prov.circuit === "half" ? "half" : prov.up ? "healthy" : "failing";
  const chip = {
    healthy: { text: "circuit closed", cls: "bg-ok/10 text-ok border-ok/25" },
    failing: { text: `failing · ${fails}/${THRESHOLD}`, cls: "bg-err/10 text-err border-err/25" },
    open: { text: "circuit open", cls: "bg-err/15 text-err border-err/30" },
    half: { text: "half-open · probing", cls: "bg-warn/10 text-warn border-warn/25" },
  }[state];

  return (
    <div ref={cardRef}>
      <div
        ref={shaker}
        className={`relative rounded-2xl border bg-[rgb(12,14,26)] px-4 py-3 transition-[border-color,box-shadow] duration-300 ${
          glow === "ok"
            ? "border-signal/60 shadow-[0_0_0_1px_rgba(94,234,212,0.35),0_12px_40px_-12px_rgba(94,234,212,0.55)]"
            : glow === "fail"
              ? "border-err/60 shadow-[0_0_0_1px_rgba(248,113,113,0.3),0_12px_40px_-12px_rgba(248,113,113,0.5)]"
              : state === "open"
                ? "border-err/30"
                : "border-white/[0.08]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 font-mono text-[0.7rem] text-faint">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{prov.name}</p>
              {state === "open" && <CooldownRing key={prov.openedAt} />}
            </div>
            <p className="truncate font-mono text-[0.7rem] text-faint">{prov.model}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prov.up}
            aria-label={`${prov.name}: ${prov.up ? "up, switch to take it down" : "down, switch to bring it back"}`}
            onClick={onToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
              prov.up ? "border-ok/40 bg-ok/20" : "border-err/40 bg-err/20"
            }`}
          >
            <motion.span
              className={`absolute top-[2px] h-[18px] w-[18px] rounded-full shadow ${prov.up ? "bg-ok" : "bg-err"}`}
              initial={false}
              animate={{ left: prov.up ? 22 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
            />
          </button>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.64rem] ${chip.cls}`}>{chip.text}</span>
          {/* failure meter toward the breaker threshold */}
          <div className="flex gap-1" role="img" aria-label={`${fails} of ${THRESHOLD} failures`}>
            {Array.from({ length: THRESHOLD }, (_, k) => (
              <span
                key={k}
                className={`h-1.5 w-4 rounded-full transition-colors duration-300 ${
                  k < fails ? (prov.circuit === "open" ? "bg-err" : "bg-warn") : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ring that empties over the breaker cooldown. Restarted via key. */
function CooldownRing() {
  const C = 2 * Math.PI * 6;
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 -rotate-90" role="img" aria-label="cooling down">
      <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(248,113,113,0.2)" strokeWidth="2" />
      <motion.circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="#f87171"
        strokeWidth="2"
        strokeDasharray={C}
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: C }}
        transition={{ duration: COOLDOWN_MS / 1000, ease: "linear" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------------ */

function Log({ history, provs }: { history: Outcome[]; provs: Prov[] }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-term px-4 py-3 font-mono text-[0.72rem]" aria-live="off">
      <div className="mb-2 flex items-center gap-2 text-term-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
        router log
      </div>
      <div className="grid content-start gap-1.5 overflow-hidden" style={{ height: 5 * 22 }}>
          {history.slice(0, 5).map((h, row) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 - row * 0.12 }}
              transition={{ duration: 0.3 }}
              className="flex h-[20px] min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap"
            >
              <span className="mr-1 shrink-0 text-term-muted">req_{(4096 + h.id).toString(16)}</span>
              {h.skipped.map((i) => (
                <span key={`s${i}`} className="shrink-0 rounded-md border border-white/10 px-1.5 text-term-muted">
                  {provs[i]!.id} skip
                </span>
              ))}
              {h.failed.map((i) => (
                <span key={`f${i}`} className="shrink-0 rounded-md border border-err/30 bg-err/10 px-1.5 text-err">
                  {provs[i]!.id} ✕
                </span>
              ))}
              {h.served !== null ? (
                <span className="shrink-0 rounded-md border border-signal/30 bg-signal/10 px-1.5 text-signal">
                  {provs[h.served]!.id} ✓ {h.ms} ms
                </span>
              ) : (
                <span className="shrink-0 rounded-md border border-err/40 bg-err/15 px-1.5 text-err">502 all providers failed</span>
              )}
            </motion.div>
          ))}
      </div>
    </div>
  );
}
