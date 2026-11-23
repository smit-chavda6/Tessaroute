"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useState, type ReactNode } from "react";

type Tone = "ok" | "warn" | "err" | "acc" | "dim" | undefined;
type Line = { k: string; parts: [string, Tone][] };
type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

type Scenario = { id: string; label: string; body: string; lines: Line[]; gateway: Json };

// Costs follow pricing.yaml: gpt-6.1-terra $0.001/$0.005 per 1k, gpt-6.2-sol $0.002/$0.01.
const SCENARIOS: Scenario[] = [
  {
    id: "alias",
    label: "alias",
    body: '"model": "balanced"',
    lines: [
      { k: "→ request", parts: [["req_c402e9", "acc"], ["  model=balanced  project=support-bot", undefined]] },
      { k: "middleware", parts: [["auth ok", "ok"], ["  ·  rate limit ok", "dim"]] },
      { k: "cache", parts: [["MISS", "warn"], ["  exact + semantic", "dim"]] },
      { k: "catalog", parts: [["balanced", "acc"], [" → openai:gpt-6.1-terra", undefined]] },
      { k: "openai", parts: [["success", "ok"], ["   641 ms", undefined], ["   640 in / 296 out", "dim"]] },
      { k: "recorder", parts: [["$0.002120", "ok"], ["  ·  row written", "dim"]] },
    ],
    gateway: {
      provider: "openai",
      model: "gpt-6.1-terra",
      requested_model: "balanced",
      cache: { status: "MISS" },
      fallback: { used: false },
      retries: 0,
      latency_ms: 652.1,
      cost_usd: 0.00212,
    },
  },
  {
    id: "fallback",
    label: "fallback",
    body: '"model": "claude-opus-5-5"',
    lines: [
      { k: "→ request", parts: [["req_7f3a2c", "acc"], ["  model=claude-opus-5-5", undefined]] },
      { k: "router", parts: [["claude-* → anthropic first", "dim"]] },
      { k: "anthropic", parts: [["timeout", "err"], ["   attempt 1", "dim"]] },
      { k: "anthropic", parts: [["timeout", "err"], ["   attempt 2  (backoff 400 ms)", "dim"]] },
      { k: "router", parts: [["fallback", "warn"], [" same tier → openai:gpt-6.2-sol", undefined]] },
      { k: "openai", parts: [["success", "ok"], ["   918 ms", undefined], ["   812 in / 392 out", "dim"]] },
      { k: "recorder", parts: [["$0.005544", "ok"], ["  ·  row written", "dim"]] },
    ],
    gateway: {
      provider: "openai",
      model: "gpt-6.2-sol",
      requested_model: "claude-opus-5-5",
      fallback: {
        used: true,
        chain: [
          { provider: "anthropic", outcome: "timeout", retries: 1 },
          { provider: "openai", outcome: "success", retries: 0 },
        ],
      },
      retries: 1,
      cost_usd: 0.005544,
    },
  },
  {
    id: "cache",
    label: "cache hit",
    body: '"model": "fast"',
    lines: [
      { k: "→ request", parts: [["req_91bd04", "acc"], ["  model=fast  project=docs-search", undefined]] },
      { k: "middleware", parts: [["auth ok", "ok"], ["  ·  rate limit ok", "dim"]] },
      { k: "cache", parts: [["HIT", "ok"], ["  semantic match in pgvector", "dim"]] },
      { k: "router", parts: [["skipped", "dim"], ["  served from cache", "dim"]] },
      { k: "recorder", parts: [["$0.000000", "ok"], ["  ·  saving recorded", "dim"]] },
    ],
    gateway: {
      provider: "gemini",
      model: "gemini-3.5-flash-lite",
      requested_model: "fast",
      cache: { status: "HIT", kind: "semantic" },
      latency_ms: 6.3,
      cost_usd: 0,
    },
  },
];

const tone: Record<NonNullable<Tone>, string> = {
  ok: "text-[#4ade80]",
  warn: "text-[#fbbf24]",
  err: "text-[#f87171]",
  acc: "text-[#a5acff]",
  dim: "text-term-muted",
};

function JsonView({ v, indent = 0 }: { v: Json; indent?: number }): ReactNode {
  const pad = "  ".repeat(indent);
  if (Array.isArray(v)) {
    return (
      <>
        {"[\n"}
        {v.map((x, i) => (
          <Fragment key={i}>
            {pad + "  "}
            <JsonInline v={x} />
            {i < v.length - 1 ? ",\n" : "\n"}
          </Fragment>
        ))}
        {pad + "]"}
      </>
    );
  }
  if (v && typeof v === "object") {
    const ks = Object.keys(v);
    return (
      <>
        {"{\n"}
        {ks.map((k, i) => {
          const val = v[k]!;
          const nested = val && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length > 2;
          return (
            <Fragment key={k}>
              {pad + "  "}
              <span className="text-[#a5acff]">&quot;{k}&quot;</span>
              {": "}
              {nested || Array.isArray(val) ? <JsonView v={val} indent={indent + 1} /> : <JsonInline v={val} />}
              {i < ks.length - 1 ? ",\n" : "\n"}
            </Fragment>
          );
        })}
        {pad + "}"}
      </>
    );
  }
  return <JsonInline v={v} />;
}

function JsonInline({ v }: { v: Json }): ReactNode {
  if (Array.isArray(v)) return <>[{v.map((x, i) => <Fragment key={i}>{i ? ", " : ""}<JsonInline v={x} /></Fragment>)}]</>;
  if (v && typeof v === "object")
    return (
      <>
        {"{ "}
        {Object.entries(v).map(([k, x], i) => (
          <Fragment key={k}>
            {i ? ", " : ""}
            <span className="text-[#a5acff]">&quot;{k}&quot;</span>: <JsonInline v={x} />
          </Fragment>
        ))}
        {" }"}
      </>
    );
  if (typeof v === "string") return <span className="text-[#e9c58a]">&quot;{v}&quot;</span>;
  return <span className="text-[#7dd3c0]">{String(v)}</span>;
}

export function TraceTerminal() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const sc = SCENARIOS[i]!;

  useEffect(() => {
    if (!auto || reduce) return;
    const t = setTimeout(() => setI((x) => (x + 1) % SCENARIOS.length), 7500);
    return () => clearTimeout(t);
  }, [i, auto, reduce]);

  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-term font-mono text-[0.78rem] text-term-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-[#f87171]/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#4ade80]/70" />
          </div>
          <span className="text-term-muted">
            <span className="text-[#a5acff]">POST</span> /v1/chat/completions
          </span>
          <div role="tablist" aria-label="Example requests" className="ml-auto flex gap-1">
            {SCENARIOS.map((s, idx) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={idx === i}
                onClick={() => {
                  setI(idx);
                  setAuto(false);
                }}
                className={`relative rounded-md px-2 py-0.5 text-[0.7rem] transition-colors ${
                  idx === i ? "text-term-ink" : "text-term-muted hover:text-term-ink"
                }`}
              >
                {idx === i && (
                  <motion.span layoutId="trace-tab" className="absolute inset-0 -z-0 rounded-md bg-white/[0.08] ring-1 ring-white/10" />
                )}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-[392px] overflow-x-auto px-4 pb-4 pt-3">
          <p className="mb-2 text-term-muted">
            {"{ "}
            <span className="text-[#e9c58a]">{sc.body}</span>
            {", \"messages\": [ … ] }"}
          </p>
          <AnimatePresence mode="wait">
            <motion.div key={sc.id} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              {sc.lines.map((l, idx) => (
                <motion.div
                  key={idx}
                  className="grid grid-cols-[88px_minmax(0,1fr)] gap-2.5 whitespace-pre py-[1px]"
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.15 + idx * 0.32, duration: 0.25 }}
                >
                  <span className="text-term-muted">{l.k}</span>
                  <span>
                    {l.parts.map(([t, tn], j) => (
                      <span key={j} className={tn ? tone[tn] : undefined}>
                        {t}
                      </span>
                    ))}
                  </span>
                </motion.div>
              ))}
              <motion.pre
                className="mt-3 whitespace-pre border-t border-dashed border-white/10 pt-3 leading-[1.55]"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.25 + sc.lines.length * 0.32, duration: 0.35 }}
              >
                <span className="text-term-muted">{"// response.gateway\n"}</span>
                <JsonView v={sc.gateway} />
              </motion.pre>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
