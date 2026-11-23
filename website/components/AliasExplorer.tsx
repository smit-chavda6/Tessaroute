"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { ALIASES, PRICES, type AliasId } from "@/lib/data";
import { Icon, Reveal, SectionHead } from "./ui";

const ORDER = ["openai", "anthropic", "gemini"] as const;
type P = (typeof ORDER)[number];
const LABEL: Record<P, string> = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini" };

const perM = (v: number) => `$${(v * 1000).toFixed(v * 1000 < 1 ? 2 : 2).replace(/\.00$/, "")}`;

export function AliasExplorer() {
  const [alias, setAlias] = useState<AliasId>("balanced");
  const [down, setDown] = useState<Record<P, boolean>>({ openai: false, anthropic: false, gemini: false });
  const a = ALIASES.find((x) => x.id === alias)!;
  const served = ORDER.find((p) => !down[p]) ?? null;
  const servedModel = served ? a.models[served] : null;
  const skipped = served ? ORDER.slice(0, ORDER.indexOf(served)) : [...ORDER];

  return (
    <section className="rule relative bg-bg-2/50 py-28" id="aliases">
      <div className="wrap">
        <SectionHead
          eyebrow="Model catalog"
          title={
            <>
              Ask for <span className="text-gradient">balanced</span>. Get the best model that&apos;s up.
            </>
          }
          lede="Clients send an alias. The gateway maps it to a concrete model on each provider, and when one provider fails the next hop stays in the same tier. A new model release means editing one YAML file, not your code."
        />

        <Reveal>
          <div className="flex flex-wrap items-center gap-4">
            <LayoutGroup id="alias">
              <div role="radiogroup" aria-label="Alias" className="inline-flex rounded-xl border border-line bg-panel p-1">
                {ALIASES.map((x) => (
                  <button
                    key={x.id}
                    role="radio"
                    aria-checked={x.id === alias}
                    onClick={() => setAlias(x.id)}
                    className={`relative rounded-lg px-4 py-2 font-mono text-sm transition-colors ${
                      x.id === alias ? "text-accent-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {x.id === alias && (
                      <motion.span
                        layoutId="alias-pill"
                        className="btn-primary absolute inset-0 rounded-lg"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className={`relative ${x.id === alias ? "text-white" : ""}`}>&quot;{x.id}&quot;</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <AnimatePresence mode="wait">
              <motion.p
                key={alias}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-muted"
              >
                {a.blurb}
              </motion.p>
            </AnimatePresence>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ORDER.map((p, i) => {
            const model = a.models[p];
            const price = PRICES[model]!;
            const isServing = served === p;
            const isDown = down[p];
            return (
              <Reveal key={p} delay={i * 0.07}>
                <motion.button
                  type="button"
                  onClick={() => setDown((d) => ({ ...d, [p]: !d[p] }))}
                  aria-pressed={isDown}
                  aria-label={`${LABEL[p]}: ${isDown ? "down, click to restore" : "up, click to take down"}`}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative block w-full overflow-hidden rounded-2xl border p-5 text-left transition-colors ${
                    isServing
                      ? "border-signal/50 bg-panel shadow-[0_0_0_1px_var(--signal),0_20px_60px_-25px_var(--signal)]"
                      : isDown
                        ? "border-err/40 bg-panel/60"
                        : "border-line bg-panel"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-faint">hop {i + 1}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[0.68rem] ${
                        isServing
                          ? "bg-signal/15 text-signal"
                          : isDown
                            ? "bg-err/15 text-err"
                            : "bg-line text-muted"
                      }`}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        {isServing && <span className="pulse-ring absolute inset-0 rounded-full bg-signal" />}
                        <span className={`relative h-1.5 w-1.5 rounded-full ${isServing ? "bg-signal" : isDown ? "bg-err" : "bg-faint"}`} />
                      </span>
                      {isServing ? "serving" : isDown ? "down" : "standby"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-muted">{LABEL[p]}</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={model}
                      initial={{ opacity: 0, filter: "blur(6px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(6px)" }}
                      transition={{ duration: 0.25 }}
                      className={`font-mono text-lg ${isDown ? "text-faint line-through" : "text-ink"}`}
                    >
                      {model}
                    </motion.p>
                  </AnimatePresence>
                  <p className="mt-3 font-mono text-xs text-faint tabular-nums">
                    {perM(price.in)} in · {perM(price.out)} out <span className="text-faint/70">/ 1M tokens</span>
                  </p>
                  <p className="mt-4 text-[0.72rem] text-faint opacity-0 transition-opacity group-hover:opacity-100">
                    Click to {isDown ? "restore" : "take down"}
                  </p>
                </motion.button>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-term px-5 py-4 font-mono text-[0.8rem] text-term-ink">
            <div className="flex min-w-max flex-wrap items-center gap-2">
              <span className="text-term-muted">plan</span>
              <span className="text-[#e9c58a]">&quot;{alias}&quot;</span>
              {ORDER.map((p) => (
                <span key={p} className="inline-flex items-center gap-2">
                  <Icon name="arrow" className="h-3.5 w-3.5 text-term-muted" />
                  <span
                    className={
                      served === p ? "text-[#5eead4]" : skipped.includes(p) ? "text-[#f87171] line-through" : "text-term-muted"
                    }
                  >
                    {p}:{a.models[p]}
                  </span>
                </span>
              ))}
            </div>
            <div className="mt-2 text-term-muted">
              {served ? (
                <>
                  gateway → {"{ "}
                  <span className="text-[#a5acff]">&quot;provider&quot;</span>: <span className="text-[#e9c58a]">&quot;{served}&quot;</span>,{" "}
                  <span className="text-[#a5acff]">&quot;model&quot;</span>: <span className="text-[#e9c58a]">&quot;{servedModel}&quot;</span>,{" "}
                  <span className="text-[#a5acff]">&quot;requested_model&quot;</span>: <span className="text-[#e9c58a]">&quot;{alias}&quot;</span>,{" "}
                  <span className="text-[#a5acff]">&quot;fallback&quot;</span>: {"{ "}
                  <span className="text-[#a5acff]">&quot;used&quot;</span>: <span className="text-[#7dd3c0]">{String(skipped.length > 0)}</span>
                  {" } }"}
                </>
              ) : (
                <span className="text-[#f87171]">502 all_providers_failed: every hop in the plan is down</span>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-faint">
            Click a provider to take it down. Prices from <code className="font-mono">pricing.yaml</code>, checked
            against each provider&apos;s official pricing page on 23 Nov 2026.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
