"use client";

import { Glyph } from "./Glyphs";
import { TraceTerminal } from "./TraceTerminal";
import { Reveal, SectionHead } from "./ui";

const POINTS = [
  { glyph: "route" as const, title: "Which provider served it", text: "And which model it resolved to, if you sent an alias." },
  { glyph: "pulse" as const, title: "Every attempt in the chain", text: "Timeouts, retries and backoff, in order, with latency." },
  { glyph: "bolt" as const, title: "Cache status and cost", text: "Exact or semantic hit, and the price of the call in USD." },
];

export function TraceSection() {
  return (
    <section className="rule relative py-28" id="trace">
      <div className="wrap grid items-center gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          <SectionHead
            eyebrow="Every response explains itself"
            title={
              <>
                No more guessing <span className="text-muted">what happened to a request.</span>
              </>
            }
            lede="Each completion carries a gateway object next to the OpenAI-shaped body. Pick an example to replay it."
          />
          <ul className="grid gap-5">
            {POINTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <li className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Glyph name={p.glyph} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted">{p.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
        <Reveal delay={0.1} className="min-w-0">
          <TraceTerminal />
        </Reveal>
      </div>
    </section>
  );
}
