"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { INR_PER_USD, PRICES, PRICING_VERSION } from "@/lib/data";
import { money, Reveal, SectionHead } from "./ui";

const MODELS = Object.keys(PRICES);
const reqFromSlider = (v: number) => Math.round(Math.pow(10, 3 + (v / 100) * 3) / 100) * 100; // 1k → 1M, log
const nf = (n: number) => n.toLocaleString("en-US");

function AnimatedMoney({ usd, cur }: { usd: number; cur: "USD" | "INR" }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(usd);
  const [shown, setShown] = useState(usd);
  useEffect(() => {
    if (reduce) {
      setShown(usd);
      return;
    }
    const c = animate(mv, usd, { duration: 0.5, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    return () => c.stop();
  }, [usd, mv, reduce]);
  return <>{money(shown, cur, INR_PER_USD)}</>;
}

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="grid gap-2.5">
      <label htmlFor={id} className="flex justify-between gap-3 text-sm font-medium">
        {label}
        <output htmlFor={id} className="font-mono text-accent tabular-nums">
          {display}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}

export function CostCalculator() {
  const [model, setModel] = useState("claude-sonnet-5-5");
  const [reqV, setReqV] = useState(55);
  const [tin, setTin] = useState(1200);
  const [tout, setTout] = useState(400);
  const [hit, setHit] = useState(30);
  const [cur, setCur] = useState<"USD" | "INR">("USD");

  const req = reqFromSlider(reqV);
  const { direct, gw } = useMemo(() => {
    const p = PRICES[model]!;
    const perReq = (tin / 1000) * p.in + (tout / 1000) * p.out;
    const d = perReq * req * 30;
    return { direct: d, gw: d * (1 - hit / 100) };
  }, [model, req, tin, tout, hit]);

  return (
    <section className="rule relative bg-bg-2/50 py-28" id="cost">
      <div className="wrap">
        <SectionHead
          eyebrow="Cost"
          title="What the cache is worth at your volume"
          lede="Rates come from the gateway's own pricing table. A cache hit costs nothing, because the provider never sees the request. The gateway records the saving on every hit."
        />
        <Reveal>
          <div className="grid overflow-hidden rounded-3xl border border-line bg-panel lg:grid-cols-2">
            <div className="grid gap-7 p-7 sm:p-9">
              <div className="grid gap-2.5">
                <label htmlFor="calc-model" className="text-sm font-medium">
                  Model
                </label>
                <select
                  id="calc-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-xl border border-line bg-bg px-3.5 py-2.5 font-mono text-sm text-ink outline-none transition focus:border-accent"
                >
                  {MODELS.map((m) => (
                    <option key={m} value={m}>
                      {PRICES[m]!.provider} · {m}
                    </option>
                  ))}
                </select>
              </div>
              <Slider id="calc-req" label="Requests per day" value={reqV} display={nf(req)} min={0} max={100} onChange={setReqV} />
              <Slider id="calc-in" label="Average input tokens" value={tin} display={nf(tin)} min={100} max={8000} step={100} onChange={setTin} />
              <Slider id="calc-out" label="Average output tokens" value={tout} display={nf(tout)} min={50} max={4000} step={50} onChange={setTout} />
              <Slider id="calc-hit" label="Cache hit rate" value={hit} display={`${hit}%`} min={0} max={80} onChange={setHit} />
            </div>

            <div className="relative grid content-start gap-7 border-t border-line bg-bg-2/70 p-7 sm:p-9 lg:border-l lg:border-t-0">
              <div role="group" aria-label="Currency" className="inline-flex w-fit rounded-lg border border-line bg-panel p-0.5">
                {(["USD", "INR"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cur === c}
                    onClick={() => setCur(c)}
                    className={`relative rounded-md px-3 py-1 font-mono text-xs transition-colors ${cur === c ? "text-white" : "text-muted"}`}
                  >
                    {cur === c && <motion.span layoutId="cur-pill" className="btn-primary absolute inset-0 rounded-md" />}
                    <span className="relative">{c}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-5">
                {[
                  { label: "Calling the provider directly", v: direct, good: false },
                  { label: "Through InferMesh", v: gw, good: true },
                ].map((row) => (
                  <div key={row.label} className="grid gap-2">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-muted">{row.label}</span>
                      <b className="font-mono font-medium tabular-nums">
                        <AnimatedMoney usd={row.v} cur={cur} />
                      </b>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-line">
                      <motion.div
                        className={`h-full rounded-full ${row.good ? "bg-gradient-to-r from-accent to-signal" : "bg-faint/60"}`}
                        animate={{ width: `${direct ? (row.v / direct) * 100 : 0}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="font-display text-[clamp(2.6rem,6vw,3.8rem)] font-bold leading-none tracking-tight tabular-nums">
                  <span className="text-gradient">
                    <AnimatedMoney usd={direct - gw} cur={cur} />
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted">saved per month, from cache hits alone</p>
              </div>

              <p className="text-xs leading-relaxed text-faint">
                30-day month. Per-token rates from <code className="font-mono">pricing.yaml</code> version {PRICING_VERSION},
                standard tier, shortest-prompt pricing. INR at a fixed ₹{INR_PER_USD} per $1 here; the dashboard fetches a
                daily ECB rate.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
