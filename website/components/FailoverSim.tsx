"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Reveal, SectionHead } from "./ui";

/*
  Failover, live (minimal). Follows the gateway's router rules: try providers
  in FALLBACK_CHAIN order; 5 consecutive failures open a provider's circuit;
  after a cooldown one probe is let through (half-open); a success closes it.
  The cooldown is shortened to 6 s for the demo.

  Visual rules: hairlines, monochrome, cyan only for "served", red only for
  failure. Provider rows are real HTML; the link layer is drawn from their
  measured positions so lines meet the rows exactly at every width.
*/

const THRESHOLD = 5;
const COOLDOWN_MS = 6000;
const TICK_MS = 1100;
const FLIGHT_MS = 900;
const ACC = "#5eead4";
const ERR = "#f87171";

type Circuit = "closed" | "open" | "half";
type Prov = { id: string; name: string; model: string; up: boolean; fails: number; circuit: Circuit; openedAt: number };
type Outcome = { id: number; served: number | null; failed: number[]; skipped: number[]; ms: number };
type Geo = { client: { x: number; y: number }; hub: { x: number; y: number; r: number }; rows: { x: number; y: number }[] } | null;

const INITIAL: Prov[] = [
  { id: "openai", name: "OpenAI", model: "gpt-6.1-terra", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-5-5", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "gemini", name: "Gemini", model: "gemini-3.8-flash", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "azure_foundry", name: "Azure Foundry", model: "deployment default", up: true, fails: 0, circuit: "closed", openedAt: 0 },
];

export function FailoverSim() {
  const reduce = useReducedMotion();
  const section = useRef<HTMLDivElement>(null);
  const inView = useInView(section, { margin: "-15%" });

  const [provs, setProvs] = useState<Prov[]>(INITIAL);
  const provRef = useRef(provs);
  const [running, setRunning] = useState(true);
  const [history, setHistory] = useState<Outcome[]>([]);
  const [flights, setFlights] = useState<{ id: number; to: number; ok: boolean }[]>([]);
  const seq = useRef(0);

  const commit = (next: Prov[]) => {
    provRef.current = next;
    setProvs(next);
  };

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
        ...f.slice(-8),
        ...failed.map((to) => ({ id: id * 10 + to, to, ok: false })),
        ...(served !== null ? [{ id: id * 10 + 9, to: served, ok: true }] : []),
      ]);
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

  const toggle = (i: number) => commit(provRef.current.map((p, j) => (j === i ? { ...p, up: !p.up } : p)));
  const chaos = () => {
    const ps = provRef.current;
    const ups = ps.map((p, i) => (p.up ? i : -1)).filter((i) => i >= 0);
    const pick = ups.length ? ups[Math.floor(Math.random() * ups.length)]! : Math.floor(Math.random() * ps.length);
    commit(ps.map((p, i) => (i === pick ? { ...p, up: !p.up } : p)));
  };
  const reset = () => {
    commit(INITIAL);
    setHistory([]);
    setFlights([]);
  };

  const stats = useMemo(() => {
    const total = history.length;
    const ok = history.filter((h) => h.served !== null).length;
    const fb = history.filter((h) => h.served !== null && h.served > 0).length;
    return { total, ok, fb, fail: total - ok, rate: total ? Math.round((ok / total) * 100) : 100 };
  }, [history]);
  const lastServed = history[0]?.served ?? null;

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
          lede="Providers are tried in order. Five straight failures open a provider's circuit; after a cooldown, one probe checks whether it has recovered."
        />

        <Reveal>
          <div className="rounded-2xl border border-white/[0.07] bg-[rgb(9,11,20)]">
            {/* figures */}
            <dl className="grid grid-cols-2 gap-y-5 border-b border-white/[0.06] px-6 py-5 sm:grid-cols-5">
              {(
                [
                  ["requests", stats.total, ""],
                  ["served", stats.ok, ""],
                  ["via fallback", stats.fb, ""],
                  ["failed", stats.fail, stats.fail ? "text-err" : ""],
                  ["success", `${stats.rate}%`, stats.rate < 100 ? "text-warn" : "text-signal"],
                ] as const
              ).map(([label, v, tone]) => (
                <div key={label}>
                  <dt className="font-mono text-[0.68rem] text-faint">{label}</dt>
                  <dd className={`mt-1 text-xl font-medium tabular-nums tracking-tight ${tone || "text-ink"}`}>{v}</dd>
                </div>
              ))}
            </dl>

            <Stage provs={provs} flights={flights} lastServed={lastServed} onToggle={toggle} onFlightDone={(id) => setFlights((f) => f.filter((x) => x.id !== id))} reduce={!!reduce} />

            {/* controls + log */}
            <div className="grid gap-5 border-t border-white/[0.06] px-6 py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Log history={history} provs={provs} />
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                {!reduce && <Btn onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Run"}</Btn>}
                <Btn onClick={() => tick()}>Send one</Btn>
                <Btn onClick={chaos}>Chaos</Btn>
                <Btn onClick={reset}>Reset</Btn>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-muted transition-colors hover:border-white/25 hover:text-ink"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------------ */

function Stage({
  provs,
  flights,
  lastServed,
  onToggle,
  onFlightDone,
  reduce,
}: {
  provs: Prov[];
  flights: { id: number; to: number; ok: boolean }[];
  lastServed: number | null;
  onToggle: (i: number) => void;
  onFlightDone: (id: number) => void;
  reduce: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLSpanElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<Geo>(null);

  const measure = useCallback(() => {
    const s = stage.current?.getBoundingClientRect();
    const c = clientRef.current?.getBoundingClientRect();
    const h = hubRef.current?.getBoundingClientRect();
    if (!s || !c || !h || rowRefs.current.some((el) => !el)) return;
    setGeo({
      // start after the "your app" label so the line never crosses it
      client: { x: (clientRef.current?.parentElement?.getBoundingClientRect().right ?? c.right) - s.left + 10, y: c.top - s.top + c.height / 2 },
      hub: { x: h.left - s.left + h.width / 2, y: h.top - s.top + h.height / 2, r: h.width / 2 },
      rows: rowRefs.current.map((el) => {
        const r = el!.getBoundingClientRect();
        return { x: r.left - s.left, y: r.top - s.top + r.height / 2 };
      }),
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
    return `M${client.x} ${client.y} L${hub.x - hub.r} ${hub.y}`;
  };
  const outPath = (i: number) => {
    if (!geo) return "";
    const { hub, rows } = geo;
    const row = rows[i]!;
    const hr = hub.x + hub.r;
    const k = (row.x - hr) * 0.5;
    return `M${hr} ${hub.y} C${hr + k} ${hub.y} ${row.x - k} ${row.y} ${row.x} ${row.y}`;
  };
  const route = (i: number) => {
    if (!geo) return "";
    return `${inPath()} L${geo.hub.x + geo.hub.r} ${geo.hub.y} ${outPath(i).replace(/^M[^C]+/, "")}`;
  };

  return (
    <div ref={stage} className="relative grid gap-8 px-6 py-10 md:grid-cols-[96px_minmax(0,1fr)_minmax(0,340px)] md:items-center md:gap-12">
      {geo && (
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" aria-hidden="true">
          <path d={inPath()} stroke="rgba(255,255,255,0.14)" />
          {provs.map((p, i) => {
            const down = !p.up || p.circuit === "open";
            const live = lastServed === i && !down;
            return (
              <path
                key={p.id}
                d={outPath(i)}
                fill="none"
                stroke={down ? ERR : live ? ACC : "rgba(255,255,255,0.14)"}
                strokeOpacity={down ? 0.45 : live ? 0.7 : 1}
                strokeDasharray={down ? "3 5" : undefined}
                style={{ transition: "stroke 0.4s, stroke-opacity 0.4s" }}
              />
            );
          })}
          {!reduce && flights.map((f) => <Packet key={f.id} d={route(f.to)} ok={f.ok} onDone={() => onFlightDone(f.id)} />)}
        </svg>
      )}

      {/* client */}
      <div className="relative z-10 flex items-center gap-2">
        <span ref={clientRef} className="h-2 w-2 rounded-full bg-ink" />
        <span className="font-mono text-[0.7rem] text-faint">your app</span>
      </div>

      {/* router */}
      <div className="relative z-10 flex justify-center">
        <div ref={hubRef} className="grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-[rgb(9,11,20)]">
          <span className="font-mono text-[0.66rem] text-muted">router</span>
        </div>
      </div>

      {/* providers */}
      <div className="relative z-10 grid gap-2">
        {provs.map((p, i) => (
          <ProviderRow
            key={p.id}
            rowRef={(el) => {
              rowRefs.current[i] = el;
            }}
            prov={p}
            serving={lastServed === i}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  );
}

function Packet({ d, ok, onDone }: { d: string; ok: boolean; onDone: () => void }) {
  const pathRef = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const path = pathRef.current;
    const el = dot.current;
    if (!path || !el) return;
    const len = path.getTotalLength();
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / FLIGHT_MS);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const pt = path.getPointAtLength(e * len);
      el.setAttribute("cx", pt.x.toFixed(1));
      el.setAttribute("cy", pt.y.toFixed(1));
      el.setAttribute("opacity", (t > 0.88 ? (1 - t) / 0.12 : 1).toFixed(2));
      if (t < 1) raf = requestAnimationFrame(frame);
      else done.current();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <g>
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      <circle ref={dot} r="2.5" fill={ok ? "#ffffff" : ERR} opacity="0" />
    </g>
  );
}

function ProviderRow({ rowRef, prov, serving, onToggle }: { rowRef: (el: HTMLDivElement | null) => void; prov: Prov; serving: boolean; onToggle: () => void }) {
  const fails = Math.min(prov.fails, THRESHOLD);
  const state = prov.circuit === "open" ? "open" : prov.circuit === "half" ? "half" : prov.up ? "ok" : "failing";
  const status = { ok: serving ? "serving" : "standby", failing: `failing ${fails}/${THRESHOLD}`, open: "circuit open", half: "probing" }[state];
  const tone = { ok: serving ? "text-signal" : "text-faint", failing: "text-err", open: "text-err", half: "text-warn" }[state];
  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors duration-300 ${
        state === "open" || state === "failing" ? "border-err/25" : serving ? "border-signal/30" : "border-white/[0.07]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{prov.name}</p>
        <p className="truncate font-mono text-[0.68rem] text-faint">{prov.model}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className={`flex items-center gap-1.5 font-mono text-[0.68rem] ${tone}`}>
          {state === "open" && <CooldownRing key={prov.openedAt} />}
          {status}
        </span>
        <span className="flex gap-1" role="img" aria-label={`${fails} of ${THRESHOLD} failures`}>
          {Array.from({ length: THRESHOLD }, (_, k) => (
            <span key={k} className={`h-1 w-1 rounded-full transition-colors ${k < fails ? "bg-err" : "bg-white/15"}`} />
          ))}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={prov.up}
        aria-label={`${prov.name}: ${prov.up ? "up, switch to take it down" : "down, switch to bring it back"}`}
        onClick={onToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${prov.up ? "border-white/20 bg-white/10" : "border-err/40 bg-err/15"}`}
      >
        <motion.span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full ${prov.up ? "bg-ink" : "bg-err"}`}
          initial={false}
          animate={{ left: prov.up ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        />
      </button>
    </div>
  );
}

function CooldownRing() {
  const C = 2 * Math.PI * 4.5;
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 -rotate-90" role="img" aria-label="cooling down">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(248,113,113,0.25)" strokeWidth="1.5" />
      <motion.circle
        cx="6"
        cy="6"
        r="4.5"
        fill="none"
        stroke={ERR}
        strokeWidth="1.5"
        strokeDasharray={C}
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: C }}
        transition={{ duration: COOLDOWN_MS / 1000, ease: "linear" }}
      />
    </svg>
  );
}

function Log({ history, provs }: { history: Outcome[]; provs: Prov[] }) {
  return (
    <div className="grid min-w-0 content-start gap-1 font-mono text-[0.72rem]" style={{ height: 5 * 22 }} aria-live="off">
      {history.slice(0, 5).map((h, row) => (
        <motion.p
          key={h.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 - row * 0.16 }}
          transition={{ duration: 0.3 }}
          className="h-[20px] overflow-hidden text-ellipsis whitespace-pre"
        >
          <span className="text-faint">req_{(4096 + h.id).toString(16)}</span>
          {h.skipped.map((i) => (
            <span key={`s${i}`} className="text-faint">
              {"  "}
              {provs[i]!.id} skipped
            </span>
          ))}
          {h.failed.map((i) => (
            <span key={`f${i}`} className="text-err">
              {"  "}
              {provs[i]!.id} ✕
            </span>
          ))}
          {h.served !== null ? (
            <span className="text-signal">
              {"  "}
              {provs[h.served]!.id} ✓ <span className="text-faint">{h.ms}ms</span>
            </span>
          ) : (
            <span className="text-err">{"  "}502 all providers failed</span>
          )}
        </motion.p>
      ))}
    </div>
  );
}
