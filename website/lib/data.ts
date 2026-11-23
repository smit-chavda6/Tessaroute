// Every fact on the site lives here, taken from the repo:
// backend/models.yaml, backend/pricing.yaml (version 2026-11-23), PROGRESS.md.

export const REPO_URL = "https://github.com/smit-chavda6/Tessaroute";
export const PRICING_VERSION = "2026-11-23";

export type ProviderId = "openai" | "anthropic" | "gemini" | "azure_foundry";

export const PROVIDERS: { id: ProviderId; name: string; short: string }[] = [
  { id: "openai", name: "OpenAI / Azure OpenAI", short: "OpenAI" },
  { id: "anthropic", name: "Anthropic", short: "Anthropic" },
  { id: "gemini", name: "Google Gemini", short: "Gemini" },
  { id: "azure_foundry", name: "Azure AI Foundry", short: "Foundry" },
];

/** USD per 1k tokens, from pricing.yaml. */
export type Price = { in: number; out: number };

export const PRICES: Record<string, Price & { provider: ProviderId }> = {
  "gpt-6.2-sol": { provider: "openai", in: 0.002, out: 0.01 },
  "gpt-6.1-terra": { provider: "openai", in: 0.001, out: 0.005 },
  "gpt-6-luna": { provider: "openai", in: 0.0001, out: 0.0005 },
  "gpt-5.4": { provider: "openai", in: 0.0025, out: 0.015 },
  "claude-opus-5-5": { provider: "anthropic", in: 0.004, out: 0.02 },
  "claude-sonnet-5-5": { provider: "anthropic", in: 0.002, out: 0.01 },
  "claude-haiku-5-5": { provider: "anthropic", in: 0.0001, out: 0.0005 },
  "gemini-4-argon": { provider: "gemini", in: 0.002, out: 0.01 },
  "gemini-3.8-flash": { provider: "gemini", in: 0.00075, out: 0.00375 },
  "gemini-3.5-flash-lite": { provider: "gemini", in: 0.0003, out: 0.0025 },
};

export type AliasId = "smart" | "balanced" | "fast";

export const ALIASES: {
  id: AliasId;
  blurb: string;
  models: Record<"openai" | "anthropic" | "gemini", string>;
}[] = [
  {
    id: "smart",
    blurb: "Frontier reasoning models for the hardest tasks.",
    models: { openai: "gpt-6.2-sol", anthropic: "claude-opus-5-5", gemini: "gemini-4-argon" },
  },
  {
    id: "balanced",
    blurb: "Strong everyday models. The sensible default.",
    models: { openai: "gpt-6.1-terra", anthropic: "claude-sonnet-5-5", gemini: "gemini-3.8-flash" },
  },
  {
    id: "fast",
    blurb: "Small, cheap, low-latency models for extraction and chat.",
    models: { openai: "gpt-6-luna", anthropic: "claude-haiku-5-5", gemini: "gemini-3.5-flash-lite" },
  },
];

export const MARQUEE_MODELS = [
  "gpt-6.2-sol",
  "claude-opus-5-5",
  "gemini-4-argon",
  "gpt-6.1-terra",
  "claude-sonnet-5-5",
  "gemini-3.8-flash",
  "gpt-6-luna",
  "claude-haiku-5-5",
  "gemini-3.5-flash-lite",
  "gpt-5.4",
  "azure ai foundry",
];

export const PIPELINE = [
  {
    name: "Middleware",
    file: "middleware.py · ratelimit.py",
    points: ["Request id on every call", "Project API key auth", "Redis sliding-window rate limit"],
  },
  {
    name: "Cache",
    file: "cache.py",
    points: ["Exact match in Redis", "Semantic match in pgvector", "Degrades to exact-only without an embeddings key"],
  },
  {
    name: "Router",
    file: "routing.py · model_catalog.py",
    points: ["Aliases and same-tier fallback", "Retry with exponential backoff", "Per-provider circuit breaker"],
  },
  {
    name: "Provider adapter",
    file: "providers/*.py",
    points: ["One adapter per provider", "Normalised to the OpenAI shape", "Server-sent event streaming"],
  },
  {
    name: "Recorder",
    file: "observability.py · metrics.py",
    points: ["One Postgres row per request", "Tokens, cost, latency, fallback chain", "Prometheus /metrics"],
  },
];

export const TOUR = [
  {
    id: "overview",
    label: "Overview",
    img: "/screenshots/overview.png",
    path: "/overview",
    api: "GET /v1/usage/summary",
    text: "Request volume, error rate, p50 / p95 latency and spend for any time range, compared with the previous period.",
  },
  {
    id: "costs",
    label: "Costs",
    img: "/screenshots/costs.png",
    path: "/costs",
    api: "GET /v1/usage/cost-breakdown",
    text: "Spend over time by provider and model, the most expensive projects, and a USD / INR switch.",
  },
  {
    id: "providers",
    label: "Providers",
    img: "/screenshots/providers.png",
    path: "/providers",
    api: "GET /v1/providers",
    text: "Every provider side by side: success rate, latency percentiles, fallback share and circuit-breaker state.",
  },
  {
    id: "requests",
    label: "Request detail",
    img: "/screenshots/requests-drawer.png",
    path: "/requests",
    api: "GET /v1/requests/{id}",
    text: "A searchable, paginated log over 100k+ rows with CSV export. Open any row for its full fallback chain and cost.",
  },
  {
    id: "health",
    label: "System health",
    img: "/screenshots/system-health.png",
    path: "/system-health",
    api: "GET /v1/system/health",
    text: "Postgres, Redis and provider reachability at a glance, with circuit-breaker state per provider.",
  },
];

export const STATS = [
  { value: 4, suffix: "", label: "provider adapters", decimals: 0 },
  { value: 268, suffix: "", label: "automated tests (pytest, Vitest, Playwright)", decimals: 0 },
  { value: 0.55, suffix: " s", label: "to first KPI on a 100k-row seed", decimals: 2 },
  { value: 246, suffix: " kB", label: "gzipped dashboard bundle", decimals: 0 },
  { value: 0, suffix: "", label: "serious axe accessibility issues", decimals: 0 },
];

export const PHASES = [
  ["Basic gateway", "OpenAI-compatible endpoint in front of one provider."],
  ["Multi-provider", "Anthropic and Gemini adapters behind one interface."],
  ["Reliability", "Retries, exponential backoff, ordered fallback chain."],
  ["Persistence & cost", "Postgres request log and a versioned pricing table."],
  ["Streaming", "Server-sent events end to end, usage still recorded."],
  ["Redis", "Sliding-window rate limits and response caching."],
  ["Hardening", "Auth, timeouts, structured logs, readiness checks."],
  ["Dashboard APIs", "SQL aggregation endpoints for every page."],
  ["Seed data", "About 100k realistic historical requests."],
  ["Dashboard UI", "React and TypeScript, eleven pages."],
  ["Azure AI Foundry", "A fourth provider on the unified inference API."],
  ["Polish & testing", "Playwright E2E, accessibility and performance budgets."],
] as const;

export const STACK = {
  Backend: ["Python 3.13", "FastAPI", "SQLAlchemy async", "Alembic", "pgvector", "Redis"],
  Frontend: ["React 19", "TypeScript", "Vite", "Tailwind v4", "TanStack Query", "Recharts"],
  "Ops & testing": ["Docker Compose", "GitHub Actions", "pytest", "Vitest", "Playwright", "Prometheus"],
};

export const QUICKSTART = [
  `git clone ${REPO_URL}`,
  "cd Tessaroute && cp .env.example backend/.env",
  "docker compose --profile full up --build",
  "docker compose --profile seed run --rm seed --rows 100000 --truncate",
];

export const INR_PER_USD = 84;
