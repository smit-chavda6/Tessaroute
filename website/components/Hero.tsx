"use client";

import { motion, useReducedMotion } from "motion/react";
import { MARQUEE_MODELS, REPO_URL } from "@/lib/data";
import { Globe } from "./Globe";
import { Icon } from "./ui";

const PROVIDER_STATUS = ["openai", "anthropic", "gemini", "azure_foundry"];

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative flex min-h-[100svh] flex-col pt-24 sm:pt-28 lg:pt-[max(5.25rem,min(7rem,12svh))]" id="top">
      <div className="wrap relative grid flex-1 items-center gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-x-16">
        {/* copy column */}
        <div className="relative z-10 min-w-0 py-6 lg:py-4">
          <motion.a
            href="#aliases"
            {...rise(0.05)}
            className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3.5 text-[0.8rem] text-muted transition hover:border-accent/40 hover:text-ink"
          >
            <span className="rounded-full bg-gradient-to-r from-accent-2 to-accent px-2.5 py-0.5 text-[0.7rem] font-medium text-white">
              New
            </span>
            Model aliases with same-tier fallback
            <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </motion.a>

          <motion.h1
            {...rise(0.15)}
            className="mt-7 font-display text-[clamp(2.7rem,5.4vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.045em] lg:mt-[min(1.75rem,3svh)] lg:text-[clamp(2.5rem,min(5.4vw,8.4svh),4.6rem)]"
          >
            One endpoint.
            <br />
            <span className="text-gradient">Every model.</span>
          </motion.h1>

          <motion.p {...rise(0.3)} className="mt-7 max-w-[34rem] text-[1.1rem] leading-relaxed text-muted lg:mt-[min(1.75rem,3svh)]">
            Tessaroute is an OpenAI-compatible gateway in front of OpenAI, Anthropic, Gemini and Azure. It routes
            each request to the right provider, falls back at the same quality tier, caches, rate-limits and
            prices every call.
          </motion.p>

          <motion.div {...rise(0.45)} className="mt-10 flex flex-wrap gap-3 lg:mt-[min(2.5rem,4svh)]">
            <a
              href="#quickstart"
              className="btn-primary shine group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[0.95rem] font-medium transition hover:-translate-y-0.5"
            >
              Get started
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3.5 text-[0.95rem] font-medium transition hover:-translate-y-0.5 hover:border-white/25"
            >
              <Icon name="github" />
              View on GitHub
            </a>
          </motion.div>

          <motion.ul {...rise(0.6)} className="mt-12 flex flex-wrap gap-x-5 gap-y-2 lg:mt-[min(3rem,4.5svh)]" aria-label="Providers">
            {PROVIDER_STATUS.map((p) => (
              <li key={p} className="flex items-center gap-2 font-mono text-[0.75rem] text-faint">
                <span className="relative flex h-2 w-2">
                  {!reduce && <span className="pulse-ring absolute inset-0 rounded-full bg-signal/70" />}
                  <span className="relative h-2 w-2 rounded-full bg-signal" />
                </span>
                {p}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* globe column */}
        <motion.div
          className="relative mx-auto w-full max-w-[640px] min-w-0 lg:max-w-[min(640px,calc(100svh_-_230px))]"
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Globe />
          <p className="mt-2 text-center font-mono text-[0.68rem] text-faint">drag to rotate</p>
        </motion.div>
      </div>

      {/* model strip */}
      <div className="mt-8 border-y border-white/[0.06] bg-white/[0.015] py-4 [@media(max-height:640px)]:mt-3 [@media(max-height:640px)]:py-2.5 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="marquee flex w-max gap-3">
          {[...MARQUEE_MODELS, ...MARQUEE_MODELS].map((m, i) => (
            <span
              key={i}
              aria-hidden={i >= MARQUEE_MODELS.length}
              className="whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 font-mono text-[0.75rem] text-muted"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
