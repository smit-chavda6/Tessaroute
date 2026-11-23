"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { CostChart, FallbackRoute, LatencyGauge, StreamChat, TierMatrix } from "./Illustrations";
import { Glyph } from "./Glyphs";
import { CopyButton, Reveal, SectionHead, SpotlightCard } from "./ui";

const S = ({ children }: { children: ReactNode }) => <span className="text-[#e9c58a]">{children}</span>;
const C = ({ children }: { children: ReactNode }) => <span className="text-term-muted">{children}</span>;
const K = ({ children }: { children: ReactNode }) => <span className="text-[#c4b5fd]">{children}</span>;
const HL = ({ children }: { children: ReactNode }) => (
  <span className="-mx-1 rounded bg-[#a5acff]/15 px-1 text-white ring-1 ring-[#a5acff]/30">{children}</span>
);

const SNIPPETS: { id: string; label: string; raw: string; node: ReactNode }[] = [
  {
    id: "py",
    label: "python",
    raw: `from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="sk-gw-…")

resp = client.chat.completions.create(
    model="balanced",
    messages=[{"role": "user", "content": "Summarise this ticket"}],
)
print(resp.model_extra["gateway"]["model"])  # gpt-6.1-terra`,
    node: (
      <>
        <K>from</K> openai <K>import</K> OpenAI{"\n\n"}
        client = OpenAI({"\n"}
        {"    "}
        <HL>
          base_url=<S>&quot;http://localhost:8000/v1&quot;</S>
        </HL>
        ,{"\n"}
        {"    "}api_key=<S>&quot;sk-gw-…&quot;</S>, <C># an InferMesh project key</C>
        {"\n)\n\n"}
        resp = client.chat.completions.create({"\n"}
        {"    "}
        <HL>
          model=<S>&quot;balanced&quot;</S>
        </HL>
        , <C># or claude-sonnet-5-5, gemini-3.8-flash…</C>
        {"\n"}
        {"    "}messages=[{"{"}
        <S>&quot;role&quot;</S>: <S>&quot;user&quot;</S>, <S>&quot;content&quot;</S>: <S>&quot;Summarise this ticket&quot;</S>
        {"}"}],{"\n)\n\n"}
        print(resp.model_extra[<S>&quot;gateway&quot;</S>][<S>&quot;model&quot;</S>]){"\n"}
        <C># → &quot;gpt-6.1-terra&quot;  (what &quot;balanced&quot; resolved to)</C>
      </>
    ),
  },
  {
    id: "ts",
    label: "typescript",
    raw: `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "http://localhost:8000/v1", apiKey: process.env.INFERMESH_KEY });

const stream = await client.chat.completions.create({
  model: "fast",
  messages: [{ role: "user", content: "Hello" }],
  stream: true,
});
for await (const chunk of stream) process.stdout.write(chunk.choices[0]?.delta?.content ?? "");`,
    node: (
      <>
        <K>import</K> OpenAI <K>from</K> <S>&quot;openai&quot;</S>;{"\n\n"}
        <K>const</K> client = <K>new</K> OpenAI({"{"}
        {"\n  "}
        <HL>
          baseURL: <S>&quot;http://localhost:8000/v1&quot;</S>
        </HL>
        ,{"\n  "}apiKey: process.env.INFERMESH_KEY,{"\n"}
        {"});\n\n"}
        <K>const</K> stream = <K>await</K> client.chat.completions.create({"{"}
        {"\n  "}
        <HL>
          model: <S>&quot;fast&quot;</S>
        </HL>
        ,{"\n  "}messages: [{"{"} role: <S>&quot;user&quot;</S>, content: <S>&quot;Hello&quot;</S> {"}"}],{"\n  "}
        stream: <K>true</K>, <C>// SSE passes straight through</C>
        {"\n});\n\n"}
        <K>for await</K> (<K>const</K> chunk <K>of</K> stream){"\n  "}
        process.stdout.write(chunk.choices[0]?.delta?.content ?? <S>&quot;&quot;</S>);
      </>
    ),
  },
  {
    id: "curl",
    label: "curl",
    raw: `curl http://localhost:8000/v1/models -H "Authorization: Bearer $INFERMESH_KEY" | jq '.data[].id'`,
    node: (
      <>
        <C># list aliases + models, with pricing</C>
        {"\n"}curl <HL>http://localhost:8000/v1/models</HL> \{"\n  "}-H{" "}
        <S>&quot;Authorization: Bearer $INFERMESH_KEY&quot;</S> | jq <S>&apos;.data[].id&apos;</S>
        {"\n\n"}
        <C>&quot;smart&quot;{"\n"}&quot;balanced&quot;{"\n"}&quot;fast&quot;{"\n"}&quot;gpt-6.1-terra&quot;{"\n"}&quot;claude-sonnet-5-5&quot;{"\n"}…</C>
      </>
    ),
  },
];

const BENTO = [
  {
    glyph: "tiers" as const,
    title: "Ask for a tier, not a model",
    text: "smart, balanced and fast resolve per provider from one YAML file. A model release is a config change.",
    art: <TierMatrix />,
    span: "lg:col-span-3",
  },
  {
    glyph: "route" as const,
    title: "Fallback that keeps the quality",
    text: "When a provider fails, the next hop runs the same-tier model, and every attempt is listed in the response.",
    art: <FallbackRoute />,
    span: "lg:col-span-3",
  },
  {
    glyph: "pulse" as const,
    title: "Cost on every call",
    text: "Priced against the model that actually served it, from a versioned table.",
    art: <CostChart />,
    span: "lg:col-span-2",
  },
  {
    glyph: "bolt" as const,
    title: "Streaming passes through",
    text: "Server-sent events end to end. Usage is still recorded when the stream closes.",
    art: <StreamChat />,
    span: "lg:col-span-2",
  },
  {
    glyph: "mesh" as const,
    title: "Latency you can scrape",
    text: "Prometheus /metrics exposes latency histograms, tokens, retries and breaker state.",
    art: <LatencyGauge />,
    span: "lg:col-span-2",
  },
];

export function DropIn() {
  const [tab, setTab] = useState(0);
  const cur = SNIPPETS[tab]!;
  return (
    <section className="rule relative py-28" id="dropin">
      <div className="wrap grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <SectionHead
            eyebrow="Drop-in"
            title={
              <>
                Point your SDK at it. <span className="text-muted">Change nothing else.</span>
              </>
            }
            lede={
              <>
                The gateway speaks the OpenAI chat-completions format, streaming included, so existing clients
                keep working. Every response gains one extra <code className="font-mono text-ink">gateway</code>{" "}
                object that explains how it was served.
              </>
            }
          />
        </div>

        <Reveal delay={0.1} className="min-w-0">
          <div className="ring-glow rounded-2xl border border-white/10 bg-term text-term-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-1 border-b border-white/[0.07] px-2 py-2">
              <div role="tablist" aria-label="Client language" className="flex gap-1">
                {SNIPPETS.map((s, i) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={i === tab}
                    onClick={() => setTab(i)}
                    className={`relative rounded-md px-3 py-1.5 font-mono text-[0.75rem] transition-colors ${
                      i === tab ? "text-term-ink" : "text-term-muted hover:text-term-ink"
                    }`}
                  >
                    {i === tab && <motion.span layoutId="code-tab" className="absolute inset-0 rounded-md bg-white/[0.08]" />}
                    <span className="relative">{s.label}</span>
                  </button>
                ))}
              </div>
              <CopyButton text={cur.raw} className="ml-auto" />
            </div>
            <motion.pre
              key={cur.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="min-h-[340px] overflow-x-auto p-5 font-mono text-[0.8rem] leading-[1.75]"
            >
              {cur.node}
            </motion.pre>
          </div>
        </Reveal>
      </div>

      <div className="wrap mt-16 grid gap-4 lg:grid-cols-6">
        {BENTO.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.06} className={b.span}>
            <SpotlightCard as="article" className="flex h-full flex-col overflow-hidden">
              <div className="relative border-b border-line bg-[radial-gradient(120%_90%_at_50%_0%,var(--accent-soft),transparent_70%)] px-5 pb-3 pt-5">
                {b.art}
              </div>
              <div className="flex gap-3.5 p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line-2 bg-bg-2">
                  <Glyph name={b.glyph} className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[1.05rem] font-semibold leading-snug">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{b.text}</p>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
