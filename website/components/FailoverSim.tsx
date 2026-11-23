"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Glyph } from "./Glyphs";
import { Reveal, SectionHead } from "./ui";

// Mirrors the gateway: try providers in FALLBACK_CHAIN order; 5 consecutive
// failures open a provider's circuit; after a cooldown one probe is let through
// (half-open); a success closes it again. Cooldown is shortened for the demo.
const THRESHOLD = 5;
const COOLDOWN_MS = 6000;
const TICK_MS = 950;

type Circuit = "closed" | "open" | "half";
type Prov = { id: string; name: string; model: string; up: boolean; fails: number; circuit: Circuit; openedAt: number };

const INITIAL: Prov[] = [
  { id: "openai", name: "OpenAI", model: "gpt-6.1-terra", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "anthropic", name: "Anthropic", model: "claude-sonnet-5-5", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "gemini", name: "Gemini", model: "gemini-3.8-flash", up: true, fails: 0, circuit: "closed", openedAt: 0 },
  { id: "azure_foundry", name: "Foundry", model: "deployment default", up: true, fails: 0, circuit: "closed", openedAt: 0 },
];

const VB = { w: 600, h: 380 };
const CLIENT = { x: 62, y: 190 };
const HUB = { x: 262, y: 190 };
const PX = 500;
const PY = [62, 148, 234, 320];

type Packet = { id: number; to: number | null };
type LogRow = { id: number; parts: { t: string; c: string }[] };

export function FailoverSim() {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: "-15%" });
  const [provs, setProvs] = useState<Prov[]>(INITIAL);
  const provRef = useRef(provs);
  provRef.current = provs;
  const [running, setRunning] = useState(true);
  const [stats, setStats] = useState({ ok: 0, fb: 0, fail: 0 });
  const [log, setLog] = useState<LogRow[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [flash, setFlash] = useState<Record<number, number>>({});
  const seq = useRef(0);

  const tick = useCallback(() => {
    const now = Date.now();
    const next = provRef.current.map((p) => ({ ...p }));
    const parts: LogRow["parts"] = [];
    const failedIdx: number[] = [];
    let served: number | null = null;

    for (let i = 0; i < next.length; i++) {
      const p = next[i]!;
      if (p.circuit === "open") {
        if (now - p.openedAt >= COOLDOWN_MS) p.circuit = "half";
        else {
          parts.push({ t: `${p.id} skip`, c: "text-term-muted" });
          continue;
        }
      }
      if (!p.up) {
        p.fails += 1;
        failedIdx.push(i);
        parts.push({ t: `${p.id} ✕`, c: "text-[#f87171]" });
        if (p.circuit === "half" || p.fails >= THRESHOLD) {
          p.circuit = "open";
          p.openedAt = now;
        }
        continue;
      }
      p.fails = 0;
      p.circuit = "closed";
      served = i;
      parts.push({ t: `${p.id} ✓ ${280 + Math.round(Math.random() * 600)} ms`, c: "text-[#5eead4]" });
      break;
    }
    if (served === null) parts.push({ t: "502 all providers failed", c: "text-[#f87171]" });

    const id = ++seq.current;
    setProvs(next);
    setStats((s) => ({
      ok: s.ok + (served !== null ? 1 : 0),
      fb: s.fb + (served !== null && served > 0 ? 1 : 0),
      fail: s.fail + (served === null ? 1 : 0),
    }));
    setLog((l) => [{ id, parts }, ...l].slice(0, 9));
    if (failedIdx.length) {
      setFlash((f) => {
        const n = { ...f };
        failedIdx.forEach((i) => (n[i] = id));
        return n;
      });
    }
    if (!reduce) setPackets((ps) => [...ps.slice(-6), { id, to: served }]);
  }, [reduce]);

  useEffect(() => {
    if (!running || !inView || reduce) return;
    const t = setInterval(tick, TICK_MS);
    return () => clearInterval(t);
  }, [running, inView, reduce, tick]);

  // seed a few rows so the panel isn't empty before it scrolls into view
  useEffect(() => {
    for (let i = 0; i < 4; i++) tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (i: number) =>
    setProvs((ps) => ps.map((p, j) => (j === i ? { ...p, up: !p.up } : p)));

  const reset = () => {
    setProvs(INITIAL);
    setStats({ ok: 0, fb: 0, fail: 0 });
    setLog([]);
    setPackets([]);
  };

  const total = stats.ok + stats.fail;
  const rate = total ? Math.round((stats.ok / total) * 100) : 100;

  return (
    <section className="rule relative bg-bg-2/50 py-28" id="simulator">
      <div className="wrap">
        <SectionHead
          eyebrow="Failover, live"
          title="Take a provider down and watch traffic move"
          lede="This runs in your browser and follows the router's rules: try providers in order, open a provider's circuit after five straight failures, then let one probe through after a cooldown to see whether it has recovered."
        />

        <div ref={box} className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Reveal className="min-w-0">
            <div className="ring-glow relative rounded-2xl border border-line bg-panel">
              <div className="grid-bg absolute inset-0 rounded-2xl opacity-60" aria-hidden="true" />
              <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="relative block h-auto w-full" role="img" aria-label="Gateway routing diagram">
                {/* client -> hub */}
                <line x1={CLIENT.x} y1={CLIENT.y} x2={HUB.x} y2={HUB.y} stroke="var(--line-2)" strokeWidth="1.5" strokeDasharray="4 5" />
                {provs.map((p, i) => {
                  const red = flash[i] !== undefined && seq.current - flash[i]! < 1;
                  const color =
                    p.circuit === "open" ? "var(--err)" : red ? "var(--err)" : p.circuit === "half" ? "var(--warn)" : "var(--line-2)";
                  return (
                    <motion.path
                      key={p.id}
                      d={`M${HUB.x} ${HUB.y} C ${HUB.x + 110} ${HUB.y}, ${PX - 120} ${PY[i]}, ${PX - 26} ${PY[i]}`}
                      fill="none"
                      animate={{ stroke: color, opacity: p.circuit === "open" ? 0.45 : 1 }}
                      strokeWidth={1.5}
                      strokeDasharray={p.circuit === "open" ? "3 6" : undefined}
                    />
                  );
                })}

                {/* packets */}
                <AnimatePresence>
                  {packets.map((pk) => {
                    const ty = pk.to === null ? HUB.y : PY[pk.to]!;
                    const tx = pk.to === null ? HUB.x : PX - 26;
                    return (
                      <motion.circle
                        key={pk.id}
                        r={5}
                        fill={pk.to === null ? "var(--err)" : "var(--signal)"}
                        style={{ filter: "drop-shadow(0 0 6px var(--signal))" }}
                        initial={{ cx: CLIENT.x, cy: CLIENT.y, opacity: 0 }}
                        animate={{
                          cx: [CLIENT.x, HUB.x, HUB.x + 110, tx],
                          cy: [CLIENT.y, HUB.y, (HUB.y + ty) / 2, ty],
                          opacity: [0, 1, 1, 0],
                        }}
                        transition={{ duration: 1.15, times: [0, 0.38, 0.7, 1], ease: "easeInOut" }}
                        onAnimationComplete={() => setPackets((ps) => ps.filter((x) => x.id !== pk.id))}
                      />
                    );
                  })}
                </AnimatePresence>

                {/* client */}
                <g>
                  <rect x={CLIENT.x - 42} y={CLIENT.y - 20} width="84" height="40" rx="10" fill="var(--panel-2)" stroke="var(--line-2)" />
                  <text x={CLIENT.x} y={CLIENT.y + 4} textAnchor="middle" fontSize="12" fill="var(--muted)" fontFamily="var(--font-mono)">
                    client
                  </text>
                </g>

                {/* hub */}
                <g>
                  <circle cx={HUB.x} cy={HUB.y} r="40" fill="var(--accent-soft)" className="pulse-ring" style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }} />
                  <circle cx={HUB.x} cy={HUB.y} r="34" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.5" />
                  <text x={HUB.x} y={HUB.y - 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-display)">
                    InferMesh
                  </text>
                  <text x={HUB.x} y={HUB.y + 13} textAnchor="middle" fontSize="9" fill="var(--faint)" fontFamily="var(--font-mono)">
                    router
                  </text>
                </g>

                {/* providers */}
                {provs.map((p, i) => {
                  const y = PY[i]!;
                  const stroke = p.circuit === "open" ? "var(--err)" : p.circuit === "half" ? "var(--warn)" : !p.up ? "var(--err)" : "var(--line-2)";
                  return (
                    <g key={p.id} onClick={() => toggle(i)} style={{ cursor: "pointer" }} role="button" aria-label={`Toggle ${p.name}`}>
                      <rect x={PX - 26} y={y - 22} width="112" height="44" rx="11" fill="var(--panel-2)" stroke={stroke} strokeWidth="1.5" />
                      <circle cx={PX - 10} cy={y} r="4" fill={p.up ? "var(--ok)" : "var(--err)"} />
                      <text x={PX + 2} y={y - 3} fontSize="12" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-sans)">
                        {p.name}
                      </text>
                      <text x={PX + 2} y={y + 11} fontSize="9" fill="var(--faint)" fontFamily="var(--font-mono)">
                        {p.circuit === "closed" ? "circuit closed" : p.circuit === "open" ? "circuit open" : "half-open"}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <p className="relative border-t border-line px-4 py-2.5 text-xs text-faint">
                Click a provider in the diagram, or use the switches, to take it down.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="grid min-w-0 content-start gap-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                [stats.ok, "served"],
                [stats.fb, "via fallback"],
                [`${rate}%`, "success rate"],
              ].map(([v, l]) => (
                <div key={l as string} className="rounded-xl border border-line bg-panel px-4 py-3">
                  <motion.b key={String(v)} initial={{ y: -4, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="block font-display text-2xl tabular-nums">
                    {v}
                  </motion.b>
                  <span className="text-xs text-faint">{l}</span>
                </div>
              ))}
            </div>

            <ul className="grid gap-2">
              {provs.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2.5">
                  <span className="font-mono text-xs text-faint">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="truncate font-mono text-[0.7rem] text-faint">{p.model}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[0.66rem] ${
                      p.circuit === "closed" ? "bg-ok/15 text-ok" : p.circuit === "open" ? "bg-err/15 text-err" : "bg-warn/15 text-warn"
                    }`}
                  >
                    {p.circuit === "half" ? "half-open" : p.circuit}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.up}
                    aria-label={`${p.name} ${p.up ? "up" : "down"}`}
                    onClick={() => toggle(i)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${p.up ? "bg-ok" : "bg-err"}`}
                  >
                    <motion.span
                      className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow"
                      animate={{ left: p.up ? 23 : 3 }}
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  </button>
                </li>
              ))}
            </ul>

            <div className="h-[214px] overflow-hidden rounded-xl border border-white/10 bg-term px-4 py-3 font-mono text-[0.72rem] text-term-ink" aria-live="off">
              <AnimatePresence initial={false}>
                {log.map((row) => (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3 truncate py-[2px]"
                  >
                    <span className="text-term-muted">req_{(4096 + row.id).toString(16)}</span>
                    <span className="truncate">
                      {row.parts.map((p, j) => (
                        <span key={j} className={p.c}>
                          {j ? " → " : ""}
                          {p.t}
                        </span>
                      ))}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap gap-2">
              {!reduce && (
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm transition hover:border-line-2"
                >
                  <Glyph name={running ? "pause" : "play"} className="h-4 w-4" />
                  {running ? "Pause" : "Run"}
                </button>
              )}
              <button
                type="button"
                onClick={tick}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm transition hover:border-line-2"
              >
                <Glyph name="bolt" className="h-4 w-4" />
                Send one request
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm transition hover:border-line-2"
              >
                <Glyph name="reset" className="h-4 w-4" />
                Reset
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
