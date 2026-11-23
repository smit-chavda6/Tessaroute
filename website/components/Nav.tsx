"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUICKSTART, REPO_URL } from "@/lib/data";
import { Icon, Logo } from "./ui";

const SECTIONS = [
  { id: "aliases", label: "Aliases" },
  { id: "how", label: "How it works" },
  { id: "simulator", label: "Failover" },
  { id: "dashboard", label: "Dashboard" },
  { id: "cost", label: "Cost" },
  { id: "build", label: "Build log" },
];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      if (next === "light") document.documentElement.dataset.theme = "light";
      else delete document.documentElement.dataset.theme;
      try {
        localStorage.setItem("im-theme", next);
      } catch {
        /* storage blocked: theme still applies for this visit */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

export function Nav() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, toggle } = useTheme();

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
        className={`sticky top-0 z-40 transition-colors duration-300 ${
          scrolled ? "border-b border-line bg-bg/75 backdrop-blur-xl" : "border-b border-transparent"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="wrap flex h-16 items-center gap-6">
          <a href="#top" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
            <Logo />
            InferMesh
          </a>
          <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 lg:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`relative rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active === s.id ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {active === s.id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-accent-soft ring-1 ring-accent/25"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                {s.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-line bg-panel/60 px-3 py-1.5 text-sm text-muted transition hover:border-line-2 hover:text-ink sm:flex"
            >
              <Icon name="search" className="h-3.5 w-3.5" />
              Jump to
              <kbd className="rounded border border-line-2 px-1.5 font-mono text-[0.68rem]">Ctrl K</kbd>
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel/60 text-muted transition hover:text-ink"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon name={theme === "dark" ? "sun" : "moon"} />
                </motion.span>
              </AnimatePresence>
            </button>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener"
              className="btn-primary shine flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium"
            >
              <Icon name="github" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
        <motion.div
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-accent via-signal to-accent"
          style={{ scaleX: progress }}
        />
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onToggleTheme={toggle} />
    </>
  );
}

type Cmd = { id: string; label: string; hint: string; run: () => void };

function CommandPalette({
  open,
  onClose,
  onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
}) {
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
      { id: "theme", label: "Toggle light / dark theme", hint: "Action", run: onToggleTheme },
      { id: "gh", label: "Open the GitHub repository", hint: "Link", run: () => window.open(REPO_URL, "_blank", "noopener") },
    ],
    [onToggleTheme],
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
            className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-line-2 bg-panel shadow-2xl shadow-black/40"
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
