"use client";

import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TOUR } from "@/lib/data";
import { Reveal, SectionHead } from "./ui";

const DWELL = 6000;

export function DashboardTour() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { margin: "-20%" });
  const cur = TOUR[i]!;

  // pointer-driven 3D tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 150, damping: 18 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["20%", "80%"]);
  const glare = useTransform(glareX, (x) => `radial-gradient(600px circle at ${x} 0%, rgba(255,255,255,0.18), transparent 50%)`);

  useEffect(() => {
    if (reduce || paused || !inView) return;
    const t = setTimeout(() => setI((x) => (x + 1) % TOUR.length), DWELL);
    return () => clearTimeout(t);
  }, [i, reduce, paused, inView]);

  return (
    <section className="rule relative overflow-hidden py-28" id="dashboard">
      <div className="pointer-events-none absolute left-1/2 top-40 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent)] opacity-60 blur-3xl" />
      <div className="wrap relative">
        <SectionHead
          center
          eyebrow="The dashboard"
          title="Eleven pages, all computed from real request rows"
          lede="React 19 and TypeScript, dark and light themes, a ⌘K palette and CSV export. Every chart is a SQL aggregation over the requests table."
        />

        <Reveal>
          <div role="tablist" aria-label="Dashboard pages" className="mx-auto mb-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1 scrollbar-none">
            {TOUR.map((t, idx) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={idx === i}
                onClick={() => {
                  setI(idx);
                  setPaused(true);
                }}
                className={`relative shrink-0 overflow-hidden rounded-lg px-4 py-2 text-sm transition-colors ${
                  idx === i ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {idx === i && (
                  <motion.span layoutId="tour-pill" className="absolute inset-0 rounded-lg bg-accent-soft ring-1 ring-accent/25" />
                )}
                {idx === i && !paused && !reduce && (
                  <motion.span
                    key={`bar-${i}`}
                    className="absolute bottom-0 left-0 h-[2px] bg-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: inView ? "100%" : "0%" }}
                    transition={{ duration: DWELL / 1000, ease: "linear" }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            ref={frame}
            className="mx-auto max-w-5xl"
            style={{ perspective: 1600 }}
            onPointerMove={(e) => {
              if (reduce) return;
              const r = e.currentTarget.getBoundingClientRect();
              mx.set((e.clientX - r.left) / r.width - 0.5);
              my.set((e.clientY - r.top) / r.height - 0.5);
            }}
            onPointerLeave={() => {
              mx.set(0);
              my.set(0);
            }}
          >
            <motion.div
              style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
              className="relative overflow-hidden rounded-2xl border border-line-2 bg-panel shadow-[0_50px_120px_-40px_rgba(0,0,0,0.65)]"
            >
              <div className="flex items-center gap-3 border-b border-line bg-panel-2 px-4 py-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <i className="h-2.5 w-2.5 rounded-full bg-line-2" />
                  <i className="h-2.5 w-2.5 rounded-full bg-line-2" />
                  <i className="h-2.5 w-2.5 rounded-full bg-line-2" />
                </div>
                <div className="mx-auto flex min-w-0 items-center gap-2 rounded-md border border-line bg-bg px-3 py-1 font-mono text-xs text-faint">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />
                  <span className="truncate">localhost:8080{cur.path}</span>
                </div>
              </div>
              <div className="relative aspect-[16/9.6] bg-bg-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={cur.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                  >
                    <Image
                      src={cur.img}
                      alt={`InferMesh dashboard: ${cur.label} page`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 1024px"
                      className="object-cover object-top"
                      priority={i === 0}
                    />
                  </motion.div>
                </AnimatePresence>
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 mix-blend-overlay"
                  style={{ background: glare }}
                />
              </div>
            </motion.div>
          </div>
        </Reveal>

        <div className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
          <AnimatePresence mode="wait">
            <motion.p
              key={cur.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl text-muted"
            >
              {cur.text}
            </motion.p>
          </AnimatePresence>
          <code className="w-fit rounded-md border border-line bg-panel px-2.5 py-1 font-mono text-xs text-faint">{cur.api}</code>
        </div>
      </div>
    </section>
  );
}
