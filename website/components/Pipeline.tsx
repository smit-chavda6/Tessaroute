"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PIPELINE } from "@/lib/data";
import { Reveal, SectionHead } from "./ui";

export function Pipeline() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20%" });
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? active;

  useEffect(() => {
    if (reduce || !inView || hover !== null) return;
    const t = setInterval(() => setActive((a) => (a + 1) % PIPELINE.length), 1500);
    return () => clearInterval(t);
  }, [reduce, inView, hover]);

  const pct = (shown / (PIPELINE.length - 1)) * 100;

  return (
    <section className="rule relative py-28" id="how">
      <div className="wrap">
        <SectionHead
          eyebrow="How it works"
          title="Five stages between your request and the model"
          lede="Each stage is a small, separately tested module in the FastAPI backend. Hover a stage to stop the tour on it."
        />

        <div ref={ref} className="relative">
          {/* rail + travelling packet (desktop) */}
          <div className="absolute left-[10%] right-[10%] top-[38px] hidden h-px bg-line-2 lg:block" aria-hidden="true">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-signal"
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
            <motion.div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_18px_4px_var(--signal)]"
              animate={{ left: `${pct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>

          <ol className="relative grid gap-4 lg:grid-cols-5">
            {PIPELINE.map((s, i) => {
              const on = i === shown;
              const passed = i < shown;
              return (
                <li
                  key={s.name}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  className="group h-full list-none rounded-2xl"
                >
                  <Reveal delay={i * 0.06} className="h-full">
                    <div className="mb-5 hidden justify-center lg:flex">
                      <motion.span
                        className="relative grid h-[22px] w-[22px] place-items-center rounded-full border bg-bg font-mono text-[0.6rem]"
                        animate={{
                          borderColor: on ? "var(--signal)" : passed ? "var(--accent)" : "var(--line-2)",
                          scale: on ? 1.25 : 1,
                        }}
                        style={{ marginTop: 27 }}
                      >
                        <span className={on ? "text-signal" : passed ? "text-accent" : "text-faint"}>{i + 1}</span>
                      </motion.span>
                    </div>
                    <motion.div
                      animate={{ y: on ? -6 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className={`h-full rounded-2xl border p-5 transition-colors duration-300 ${
                        on
                          ? "border-signal/40 bg-panel shadow-[0_24px_60px_-28px_var(--signal)]"
                          : "border-line bg-panel/70"
                      }`}
                    >
                      <p className="font-mono text-[0.7rem] text-accent lg:hidden">0{i + 1}</p>
                      <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                      <ul className="mt-3 grid gap-1.5 text-sm text-muted">
                        {s.points.map((p) => (
                          <li key={p} className="flex gap-2">
                            <span className={`mt-[0.55em] h-1 w-1 shrink-0 rounded-full ${on ? "bg-signal" : "bg-line-2"}`} />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 border-t border-dashed border-line pt-3 font-mono text-[0.7rem] text-faint">
                        {s.file}
                      </p>
                    </motion.div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
