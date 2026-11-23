"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUICKSTART, REPO_URL } from "@/lib/data";
import { Icon, Logo } from "./ui";

const SECTIONS = [
  { id: "trace", label: "Trace" },
  { id: "aliases", label: "Aliases" },
  { id: "how", label: "How it works" },
  { id: "simulator", label: "Failover" },
  { id: "dashboard", label: "Dashboard" },
  { id: "cost", label: "Cost" },
  { id: "build", label: "Build log" },
];

export function Nav() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div
          className={`relative mx-auto flex h-14 max-w-[1120px] items-center gap-4 overflow-hidden rounded-full border pl-4 pr-2 backdrop-blur-xl transition-all duration-500 ${
            scrolled
              ? "border-white/10 bg-[rgba(8,10,20,0.72)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]"
              : "border-white/[0.06] bg-[rgba(8,10,20,0.35)]"
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5 font-display text-[1.05rem] font-semibold tracking-tight">
            <Logo size={26} />
            Tessaroute
          </a>
          <nav aria-label="Sections" className="mx-auto hidden items-center gap-0.5 lg:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`relative rounded-full px-3.5 py-1.5 text-[0.85rem] transition-colors ${
                  active === s.id ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {active === s.id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-white/[0.07] ring-1 ring-white/10"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                {s.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.8rem] text-muted transition hover:text-ink sm:flex"
            >
              <Icon name="search" className="h-3.5 w-3.5" />
              <kbd className="font-mono text-[0.68rem]">Ctrl K</kbd>
            </button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener"
              className="btn-primary shine flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            >
              <Icon name="github" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
          <motion.div
            className="absolute inset-x-6 bottom-0 h-px origin-left bg-gradient-to-r from-accent via-signal to-accent"
            style={{ scaleX: progress }}
          />
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

type Cmd = { id: string; label: string; hint: string; run: () => void };

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Cmd[]>(
    () => [
      ...SECTIONS.map((s) => ({
        id: s.id,
        label: s.label,
        hint: "Section",
        run: () => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }),
      })),
      {
        id: "quickstart",
        label: "Quickstart",
        hint: "Section",
        run: () => document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" }),
      },
      {
        id: "copy",
        label: "Copy quickstart commands",
        hint: "Action",
        run: () => void navigator.clipboard?.writeText(QUICKSTART.join("\n")).catch(() => {}),
      },
      { id: "gh", label: "Open the GitHub repository", hint: "Link", run: () => window.open(REPO_URL, "_blank", "noopener") },
    ],
    [],
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const choose = (c: Cmd | undefined) => {
    if (!c) return;
    onClose();
    setTimeout(c.run, 60);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start bg-black/50 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/12 bg-[rgba(10,12,24,0.92)] shadow-2xl shadow-black/60 backdrop-blur-xl"
            initial={{ y: -12, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Icon name="search" className="h-4 w-4 text-faint" />
              <input
                id="palette-q"
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIdx((i) => Math.min(i + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    choose(filtered[idx]);
                  } else if (e.key === "Escape") {
                    onClose();
                  }
                }}
                placeholder="Jump to a section or run an action…"
                className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
                aria-label="Search commands"
              />
              <kbd className="rounded border border-line-2 px-1.5 font-mono text-[0.68rem] text-faint">Esc</kbd>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-faint">No matches</li>}
              {filtered.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === idx}>
                  <button
                    type="button"
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => choose(c)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      i === idx ? "bg-accent-soft text-ink" : "text-muted"
                    }`}
                  >
                    {c.label}
                    <span className="font-mono text-[0.68rem] text-faint">{c.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
