"use client";

import { animate, motion, useInView, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PHASES, QUICKSTART, REPO_URL, STACK, STATS } from "@/lib/data";
import { CopyButton, Icon, Logo, Reveal, SectionHead } from "./ui";

function CountUp({ value, decimals, suffix }: { value: number; decimals: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [v, setV] = useState(value); // real number at rest (SSR, no-JS, reduced motion)
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, reduce, value]);
  return (
    <span ref={ref} className="tabular-nums">
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="rule py-20" aria-label="Project in numbers">
      <div className="wrap">
        <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-line bg-panel lg:grid-cols-5">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 0.06}
              className={`grid gap-2 border-line p-6 sm:p-8 ${i > 0 ? "lg:border-l" : ""} ${i % 2 === 1 ? "border-l lg:border-l" : ""} ${
                i >= 2 ? "border-t lg:border-t-0" : ""
              } ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}
            >
              <b className="font-display text-[clamp(2rem,3.6vw,2.8rem)] font-bold leading-none tracking-tight">
                <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} />
              </b>
              <span className="text-sm text-muted">{s.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BuildLog() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  return (
    <section className="rule relative bg-bg-2/50 py-28" id="build">
      <div className="wrap grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <SectionHead
            eyebrow="Build log"
            title="Twelve phases, each verified before the next"
            lede="Every phase had a written definition of done, passed lint, type checks and tests, and landed as one commit. Model aliases and same-tier fallback came after phase 12."
          />
          <div className="grid gap-6">
            {Object.entries(STACK).map(([group, items], gi) => (
              <Reveal key={group} delay={gi * 0.06}>
                <h3 className="mb-2.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint">{group}</h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((t) => (
                    <span key={t} className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-[0.75rem] text-muted transition hover:border-accent/40 hover:text-ink">
                      {t}
                    </span>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <ol ref={listRef} className="relative ml-3 grid gap-3 border-l border-line pl-8">
          <motion.span
            aria-hidden="true"
            className="absolute -left-px top-0 w-px origin-top bg-gradient-to-b from-accent to-signal"
            style={{ scaleY: fill, height: "100%" }}
          />
          {PHASES.map(([title, text], i) => (
            <li key={title} className="relative">
              <span className="absolute -left-[41px] top-4 grid h-[18px] w-[18px] place-items-center rounded-full border border-accent/50 bg-bg">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <Reveal delay={0.02} y={10}>
                <div className="group rounded-xl border border-line bg-panel px-5 py-4 transition hover:-translate-y-0.5 hover:border-line-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-accent">Phase {i + 1}</span>
                    <h3 className="font-display font-semibold">{title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
          <li className="relative">
            <span className="absolute -left-[41px] top-4 grid h-[18px] w-[18px] place-items-center rounded-full border border-signal bg-bg">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            <Reveal y={10}>
              <div className="rounded-xl border border-signal/40 bg-panel px-5 py-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-signal">Nov 2026</span>
                  <h3 className="font-display font-semibold">Model catalog</h3>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Current models and prices, aliases, model-to-provider routing, same-tier fallback, GET /v1/models.
                </p>
              </div>
            </Reveal>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function Quickstart() {
  const reduce = useReducedMotion();
  return (
    <section className="rule relative overflow-hidden py-28" id="quickstart">
      <div className="pointer-events-none absolute -right-40 top-10 h-[500px] w-[700px] rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] opacity-70 blur-3xl" />
      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <SectionHead
            eyebrow="Quickstart"
            title="Running on your machine in four commands"
            lede="You only need Docker. This starts the gateway, the dashboard, Postgres and Redis, then fills the database with about 100k demo requests. Add your provider keys to backend/.env to send real traffic."
          />
          <Reveal className="flex flex-wrap gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener"
              className="btn-primary shine group inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition hover:-translate-y-0.5"
            >
              <Icon name="github" />
              Star it on GitHub
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="min-w-0">
          <div className="ring-glow rounded-2xl border border-white/10 bg-term text-term-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-2.5">
              <span className="font-mono text-xs text-term-muted">bash</span>
              <CopyButton text={QUICKSTART.join("\n")} label="Copy all" className="ml-auto" />
            </div>
            <div className="overflow-x-auto p-5 font-mono text-[0.8rem] leading-[2]">
              {QUICKSTART.map((line, i) => (
                <motion.div
                  key={line}
                  className="whitespace-pre"
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.25 }}
                >
                  <span className="select-none text-[#5eead4]">$ </span>
                  {line}
                </motion.div>
              ))}
              <div className="text-term-muted">
                <span className="select-none text-[#5eead4]">$ </span>
                open http://localhost:8080 <span className="caret">▍</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="wrap flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <div>
            <p className="font-display font-semibold">InferMesh</p>
            <p className="text-xs text-faint">Multi-provider LLM gateway and observability dashboard</p>
          </div>
        </div>
        <p className="font-mono text-xs text-faint">FastAPI · React · Postgres · Redis</p>
        <a href={REPO_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
          <Icon name="github" />
          smit-chavda6/InferMesh
        </a>
      </div>
    </footer>
  );
}
