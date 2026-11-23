"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal, SectionHead } from "./ui";

/*
  Failover, live: traffic lanes.

  One lane per provider, in FALLBACK_CHAIN order. Requests enter the top lane
  and travel to that provider's gate, where the router rules decide:
    - success → the particle turns cyan and exits the lane
    - failure → red burst, the particle drops to the next lane's gate
    - circuit open → the gate is a red barrier; the particle slides past
    - every provider failed → the particle falls out as a 502
  A provider's breaker opens after THRESHOLD consecutive failures, stays open
  for COOLDOWN_MS, then lets one probe through (half-open).

  The simulation lives in refs and runs in one requestAnimationFrame loop that
  draws to a canvas; React only re-renders a throttled snapshot for the
  labels, sliders and figures. Lane rows in HTML use the same fixed height as
  the canvas lanes, so text and lanes always line up.
*/

const THRESHOLD = 5;
const COOLDOWN_MS = 6000;
const LANE_H = 88;
const GATES = [0.34, 0.5, 0.66, 0.82]; // gate x as a fraction of lane width
const SPAWN_MS = 380;
const TRAVERSE_MS = 2600; // time to cross the full width
const BASE_MS = [420, 560, 720, 650];

const ACC = "#c7cbff";
const SIG = "#5eead4";
const ERR = "#f87171";
const WARN = "#fbbf24";

type Circuit = "closed" | "open" | "half";
type ProvState = { fails: number; circuit: Circuit; openedAt: number; lastServedAt: number };
type Particle = {
  lane: number;
  x: number;
  y: number;
  phase: "toGate" | "drop" | "toEnd" | "fall";
  from: { x: number; y: number };
  to: { x: number; y: number };
  t: number;
  dur: number;
  color: string;
  trail: { x: number; y: number }[];
  failed: number;
  dead: boolean;
};
type Burst = { x: number; y: number; color: string; t: number };
type Snapshot = {
  now: number; // simulation clock (performance.now) when the snapshot was taken
  provs: ProvState[];
  total: number;
  served: number;
  fallback: number;
  failed: number;
  p95: number;
  rpm: number;
};

const PROVIDERS = [
  { id: "openai", name: "OpenAI", model: "gpt-6.1-terra" },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-5-5" },
  { id: "gemini", name: "Gemini", model: "gemini-3.8-flash" },
  { id: "azure_foundry", name: "Azure Foundry", model: "deployment default" },
];

const PRESETS: { label: string; err: number[] }[] = [
  { label: "Healthy", err: [0, 0, 0, 0] },
  { label: "OpenAI outage", err: [1, 0, 0, 0] },
  { label: "Flaky", err: [0.35, 0.2, 0.05, 0] },
  { label: "Meltdown", err: [1, 1, 0.9, 0.6] },
];

const freshProvs = (): ProvState[] => PROVIDERS.map(() => ({ fails: 0, circuit: "closed", openedAt: 0, lastServedAt: 0 }));
const emptySnap = (): Snapshot => ({ now: 0, provs: freshProvs(), total: 0, served: 0, fallback: 0, failed: 0, p95: 0, rpm: 0 });

export function FailoverSim() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(box, { margin: "-10%" });

  const [err, setErr] = useState<number[]>([0, 0, 0, 0]);
  const errRef = useRef(err);
  errRef.current = err;
  const [running, setRunning] = useState(true);
  const runRef = useRef(running);
  runRef.current = running && inView;
  const [snap, setSnap] = useState<Snapshot>(emptySnap);

  // mutable simulation state
  const sim = useRef({
    provs: freshProvs(),
    particles: [] as Particle[],
    bursts: [] as Burst[],
    glow: [0, 0, 0, 0],
    lat: [] as number[],
    done: [] as number[], // completion timestamps, for req/min
    total: 0,
    served: 0,
    fallback: 0,
    failed: 0,
    lastSpawn: 0,
    w: 0,
  });

  const resetSim = useCallback(() => {
    const s = sim.current;
    s.provs = freshProvs();
    s.particles = [];
    s.bursts = [];
    s.glow = [0, 0, 0, 0];
    s.lat = [];
    s.done = [];
    s.total = s.served = s.fallback = s.failed = 0;
    setSnap(emptySnap());
  }, []);

  useEffect(() => {
    if (reduce) setRunning(false);
  }, [reduce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const s = sim.current;
    const H = LANE_H * PROVIDERS.length;
    const lineY = (lane: number) => lane * LANE_H + LANE_H * 0.64;
    const gate = (lane: number) => ({ x: GATES[lane]! * s.w, y: lineY(lane) });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = canvas.getBoundingClientRect().width;
      canvas.width = Math.round(s.w * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const nextHop = (p: Particle) => {
      if (p.lane < PROVIDERS.length - 1) {
        p.phase = "drop";
        p.from = { x: p.x, y: p.y };
        p.to = gate(p.lane + 1);
        p.t = 0;
        p.dur = 420;
      } else {
        p.phase = "fall";
        p.from = { x: p.x, y: p.y };
        p.to = { x: p.x + 40, y: H + 12 };
        p.t = 0;
        p.dur = 520;
        p.color = ERR;
      }
    };

    // the router decision at a provider's gate
    const resolve = (p: Particle, now: number) => {
      const pr = s.provs[p.lane]!;
      if (pr.circuit === "open") {
        if (now - pr.openedAt < COOLDOWN_MS) {
          p.color = "#6b7288"; // skipped: circuit open
          nextHop(p);
          return;
        }
        pr.circuit = "half"; // this request is the probe
      }
      if (Math.random() < errRef.current[p.lane]!) {
        pr.fails += 1;
        if (pr.circuit === "half" || pr.fails >= THRESHOLD) {
          pr.circuit = "open";
          pr.openedAt = now;
        }
        p.failed += 1;
        p.color = ERR;
        s.bursts.push({ x: p.x, y: p.y, color: ERR, t: 0 });
        nextHop(p);
        return;
      }
      pr.fails = 0;
      pr.circuit = "closed";
      pr.lastServedAt = now;
      p.color = SIG;
      p.phase = "toEnd";
      s.glow[p.lane] = Math.min(1, s.glow[p.lane]! + 0.35);
      s.bursts.push({ x: p.x, y: p.y, color: SIG, t: 0 });
    };

    const finish = (p: Particle, ok: boolean, now: number) => {
      p.dead = true;
      s.total += 1;
      s.done.push(now);
      if (ok) {
        s.served += 1;
        if (p.lane > 0) s.fallback += 1;
        s.lat.push(BASE_MS[p.lane]! + Math.random() * 260 + p.failed * 320);
        if (s.lat.length > 200) s.lat.shift();
      } else {
        s.failed += 1;
      }
    };

    const draw = (now: number) => {
      const W = s.w;
      ctx.clearRect(0, 0, W, H);
      for (let lane = 0; lane < PROVIDERS.length; lane++) {
        const y0 = lane * LANE_H;
        const ly = lineY(lane);
        const pr = s.provs[lane]!;
        const g = gate(lane);
        if (lane > 0) {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(0, y0, W, 1);
        }
        // track
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(0, ly - 0.5, W, 1);
        // served glow after the gate
        if (s.glow[lane]! > 0.01) {
          const grad = ctx.createLinearGradient(g.x, 0, W, 0);
          grad.addColorStop(0, `rgba(94,234,212,${0.55 * s.glow[lane]!})`);
          grad.addColorStop(1, "rgba(94,234,212,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(g.x, ly - 1, W - g.x, 2);
        }
        // gate
        const open = pr.circuit === "open";
        const half = pr.circuit === "half";
        if (open) {
          const left = Math.max(0, 1 - (now - pr.openedAt) / COOLDOWN_MS);
          ctx.fillStyle = ERR;
          ctx.fillRect(g.x - 1.5, ly - 22, 3, 44);
          // cooldown arc
          ctx.strokeStyle = ERR;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(g.x + 16, ly - 18, 6, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = half ? WARN : pr.fails > 0 ? "rgba(248,113,113,0.8)" : "rgba(255,255,255,0.35)";
          ctx.fillRect(g.x - 1, ly - 12, 2, 24);
        }
      }
      // bursts
      for (const b of s.bursts) {
        const k = b.t / 450;
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4 + k * 14, 0, Math.PI * 2);
        ctx.stroke();
        if (b.color === ERR && k < 0.6) {
          ctx.beginPath();
          ctx.moveTo(b.x - 4, b.y - 4);
          ctx.lineTo(b.x + 4, b.y + 4);
          ctx.moveTo(b.x + 4, b.y - 4);
          ctx.lineTo(b.x - 4, b.y + 4);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // particles with trails
      for (const p of s.particles) {
        for (let i = 0; i < p.trail.length; i++) {
          const tp = p.trail[i]!;
          ctx.globalAlpha = ((i + 1) / p.trail.length) * 0.45;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 1.2 + (i / p.trail.length) * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.color === SIG || p.color === ERR ? 10 : 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    let raf = 0;
    let last = performance.now();
    let lastSnap = 0;
    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (runRef.current && !document.hidden && s.w > 0) {
        const v = s.w / TRAVERSE_MS;
        if (now - s.lastSpawn > SPAWN_MS) {
          s.lastSpawn = now;
          s.particles.push({
            lane: 0,
            x: -6,
            y: lineY(0),
            phase: "toGate",
            from: { x: 0, y: 0 },
            to: { x: 0, y: 0 },
            t: 0,
            dur: 0,
            color: ACC,
            trail: [],
            failed: 0,
            dead: false,
          });
        }
        for (const p of s.particles) {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 7) p.trail.shift();
          if (p.phase === "toGate") {
            p.x += v * dt;
            if (p.x >= gate(p.lane).x) {
              p.x = gate(p.lane).x;
              resolve(p, now);
            }
          } else if (p.phase === "toEnd") {
            p.x += v * dt;
            if (p.x > s.w + 8) finish(p, true, now);
          } else {
            p.t += dt;
            const k = Math.min(1, p.t / p.dur);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            p.x = p.from.x + (p.to.x - p.from.x) * e;
            p.y = p.from.y + (p.to.y - p.from.y) * e;
            if (k >= 1) {
              if (p.phase === "drop") {
                p.lane += 1;
                resolve(p, now);
              } else finish(p, false, now);
            }
          }
        }
        s.particles = s.particles.filter((p) => !p.dead);
        for (const b of s.bursts) b.t += dt;
        s.bursts = s.bursts.filter((b) => b.t < 450);
        s.glow = s.glow.map((g) => g * Math.pow(0.5, dt / 900));
      }
      // circuits can move from open to half-open while idle; keep drawing
      draw(now);

      if (now - lastSnap > 220) {
        lastSnap = now;
        const sorted = [...s.lat].sort((a, b) => a - b);
        s.done = s.done.filter((t) => now - t < 60000);
        const windowS = Math.min(60, Math.max(1, (now - (s.done[0] ?? now)) / 1000));
        setSnap({
          now,
          provs: s.provs.map((p) => ({ ...p })),
          total: s.total,
          served: s.served,
          fallback: s.fallback,
          failed: s.failed,
          p95: sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1]!) : 0,
          rpm: s.done.length ? Math.round((s.done.length / windowS) * 60) : 0,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const applyPreset = (values: number[]) => setErr([...values]);
  const success = snap.total ? Math.round((snap.served / snap.total) * 100) : 100;
  const fbShare = snap.served ? Math.round((snap.fallback / snap.served) * 100) : 0;
  const now = snap.now;

  return (
    <section className="rule relative py-28" id="simulator">
      <div className="wrap" ref={box}>
        <SectionHead
          eyebrow="Failover, live"
          title={
            <>
              Break a provider. <span className="text-muted">Watch traffic change lanes.</span>
            </>
          }
          lede="Each lane is a provider, tried top to bottom. Drag a lane's error rate up: failed requests drop to the next lane, and after five straight failures the breaker closes that lane's gate until a probe gets through."
        />

        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[rgb(8,10,19)]">
            {/* toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
              <span className="mr-1 font-mono text-[0.68rem] text-faint">scenario</span>
              {PRESETS.map((p) => {
                const active = p.err.every((v, i) => v === err[i]);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.err)}
                    aria-pressed={active}
                    className={`relative rounded-full px-3.5 py-1.5 text-[0.8rem] transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {active && <motion.span layoutId="preset-pill" className="absolute inset-0 rounded-full border border-white/15 bg-white/[0.06]" />}
                    <span className="relative">{p.label}</span>
                  </button>
                );
              })}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className="rounded-full border border-white/10 px-3.5 py-1.5 text-[0.8rem] text-muted transition-colors hover:border-white/25 hover:text-ink"
                >
                  {running ? "Pause" : "Run"}
                </button>
                <button
                  type="button"
                  onClick={resetSim}
                  className="rounded-full border border-white/10 px-3.5 py-1.5 text-[0.8rem] text-muted transition-colors hover:border-white/25 hover:text-ink"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_288px]">
              {/* lanes */}
              <div className="relative" style={{ height: LANE_H * PROVIDERS.length }}>
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
                {PROVIDERS.map((p, i) => (
                  <div key={p.id} className="pointer-events-none absolute left-5 flex items-baseline gap-2.5" style={{ top: i * LANE_H + 14 }}>
                    <span className="font-mono text-[0.68rem] text-faint">{i + 1}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="hidden font-mono text-[0.68rem] text-faint sm:inline">{p.model}</span>
                  </div>
                ))}
                <span className="pointer-events-none absolute right-4 font-mono text-[0.64rem] text-faint" style={{ top: 14 }}>
                  served →
                </span>
                <p className="sr-only">
                  Animated lanes showing requests flowing through providers. Use the error-rate sliders to make providers fail.
                </p>
              </div>

              {/* per-lane controls */}
              <div className="grid border-t border-white/[0.06] sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-t-0">
                {PROVIDERS.map((p, i) => (
                  <LaneControl
                    key={p.id}
                    index={i}
                    name={p.name}
                    state={snap.provs[i]!}
                    now={now}
                    value={err[i]!}
                    onChange={(v) => setErr((e) => e.map((x, j) => (j === i ? v : x)))}
                  />
                ))}
              </div>
            </div>

            {/* figures */}
            <dl className="grid grid-cols-2 gap-y-4 border-t border-white/[0.06] px-5 py-4 sm:grid-cols-5">
              {(
                [
                  ["success", `${success}%`, success >= 99 ? "text-signal" : success >= 90 ? "text-warn" : "text-err"],
                  ["via fallback", `${fbShare}%`, fbShare ? "text-warn" : "text-ink"],
                  ["failed (502)", snap.failed, snap.failed ? "text-err" : "text-ink"],
                  ["p95 latency", snap.p95 ? `${snap.p95} ms` : "–", "text-ink"],
                  ["throughput", snap.rpm ? `${snap.rpm} rpm` : "–", "text-ink"],
                ] as const
              ).map(([label, v, tone]) => (
                <div key={label}>
                  <dt className="font-mono text-[0.66rem] text-faint">{label}</dt>
                  <dd className={`mt-0.5 text-lg font-medium tabular-nums tracking-tight ${tone}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LaneControl({
  index,
  name,
  state,
  now,
  value,
  onChange,
}: {
  index: number;
  name: string;
  state: ProvState;
  now: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  const open = state.circuit === "open";
  const half = state.circuit === "half";
  const serving = !open && now - state.lastServedAt < 1200 && state.lastServedAt > 0;
  const status = open
    ? `open · ${Math.max(0, Math.ceil((COOLDOWN_MS - (now - state.openedAt)) / 1000))}s`
    : half
      ? "probing"
      : state.fails > 0
        ? `failing ${Math.min(state.fails, THRESHOLD)}/${THRESHOLD}`
        : serving
          ? "serving"
          : "standby";
  const tone = open || state.fails > 0 ? "text-err border-err/30 bg-err/10" : half ? "text-warn border-warn/30 bg-warn/10" : serving ? "text-signal border-signal/30 bg-signal/10" : "text-faint border-white/10";
  const id = `err-${index}`;
  return (
    <div className="flex flex-col justify-center gap-2.5 border-b border-white/[0.06] px-5 py-4 last:border-b-0 lg:py-0" style={{ minHeight: LANE_H }}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-mono text-[0.68rem] text-faint">
          <span className="lg:hidden">{name} · </span>error rate <span className="text-ink tabular-nums">{pct}%</span>
        </label>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.64rem] tabular-nums ${tone}`}>{status}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={{ background: `linear-gradient(to right, ${pct ? ERR : "rgba(255,255,255,0.1)"} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
        aria-label={`${name} error rate`}
      />
    </div>
  );
}
