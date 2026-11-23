"use client";

import { motion, useReducedMotion } from "motion/react";
import { MARQUEE_MODELS, REPO_URL } from "@/lib/data";
import { MeshCanvas } from "./MeshCanvas";
import { TraceTerminal } from "./TraceTerminal";
import { Icon } from "./ui";

const WORDS: { w: string; accent?: boolean }[] = [
  { w: "One" },
  { w: "endpoint" },
  { w: "in" },
  { w: "front" },
  { w: "of" },
  { w: "every", accent: true },
  { w: "model", accent: true },
  { w: "you" },
  { w: "call." },
];

export function Hero() {
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="noise relative overflow-hidden" id="top">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
      <MeshCanvas className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-3xl" />

      <div className="wrap relative grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:pb-28 lg:pt-24">
        <div className="min-w-0">
          <motion.a
            href="#aliases"
            {...fade(0)}
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 py-1 pl-1 pr-3 text-[0.8rem] text-muted backdrop-blur transition hover:border-accent/50"
          >
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[0.68rem] text-accent ring-1 ring-accent/30">
              New
            </span>
            Model aliases and same-tier fallback
            <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </motion.a>

          <h1 className="mt-6 font-display text-[clamp(2.7rem,6.4vw,4.9rem)] font-bold leading-[0.98] tracking-[-0.045em]">
            {WORDS.map((x, i) => (
              <motion.span
                key={i}
                className={`mr-[0.22em] inline-block ${x.accent ? "text-gradient" : ""}`}
                initial={reduce ? false : { opacity: 0, y: "0.45em", filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {x.w}
              </motion.span>
            ))}
          </h1>

          <motion.p {...fade(0.55)} className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-muted">
            InferMesh is an OpenAI-compatible gateway for OpenAI, Anthropic, Gemini and Azure. It picks the
            right provider for each model, retries and falls back at the same quality tier, caches and
            rate-limits, and records the cost of every call in a dashboard you can actually read.
          </motion.p>

          <motion.div {...fade(0.7)} className="mt-9 flex flex-wrap gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener"
              className="btn-primary group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[0.95rem] font-medium transition hover:-translate-y-0.5"
            >
              <Icon name="github" />
              View the source
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel/70 px-5 py-3 text-[0.95rem] font-medium backdrop-blur transition hover:-translate-y-0.5 hover:border-line-2"
            >
              Run it locally
            </a>
          </motion.div>

          <motion.dl {...fade(0.85)} className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {[
              ["4", "providers"],
              ["3", "model aliases"],
              ["268", "tests"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums">{n}</dd>
                <dd className="text-xs text-faint">{l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          className="min-w-0"
          initial={reduce ? false : { opacity: 0, y: 24, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 1200 }}
        >
          <TraceTerminal />
        </motion.div>
      </div>

      <div className="relative border-y border-line bg-bg-2/60 py-4 backdrop-blur [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee flex w-max gap-3">
          {[...MARQUEE_MODELS, ...MARQUEE_MODELS].map((m, i) => (
            <span
              key={i}
              aria-hidden={i >= MARQUEE_MODELS.length}
              className="whitespace-nowrap rounded-full border border-line bg-panel px-3.5 py-1.5 font-mono text-[0.75rem] text-muted"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
