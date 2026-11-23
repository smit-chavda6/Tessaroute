"use client";

import { useEffect, useRef, useState } from "react";

/*
  WebGL dotted globe (cobe). The Tessaroute gateway sits in Mumbai; client
  cities send arcs into it and it routes out to provider regions. Markers,
  arcs and labels all come from the same projection inside cobe, so labels
  can never drift off their points: they hang off CSS anchors that cobe
  places on each marker and fade out when the point turns behind the globe.

  Locations were chosen far apart so labels never collide.
*/

type LatLng = [number, number];

const HUB: LatLng = [19.076, 72.8777]; // Mumbai

const PROVIDERS: { id: string; name: string; region: string; at: LatLng }[] = [
  { id: "p-openai", name: "OpenAI", region: "East US", at: [37.4316, -78.6569] },
  { id: "p-anthropic", name: "Anthropic", region: "US West", at: [45.5152, -122.6784] },
  { id: "p-gemini", name: "Gemini", region: "Europe West", at: [53.4386, 6.8355] },
  { id: "p-foundry", name: "Azure Foundry", region: "Australia East", at: [-33.8688, 151.2093] },
];

const CLIENTS: LatLng[] = [
  [35.6762, 139.6503], // Tokyo
  [1.3521, 103.8198], // Singapore
  [51.5072, -0.1276], // London
  [-23.5505, -46.6333], // São Paulo
  [6.5244, 3.3792], // Lagos
  [25.2048, 55.2708], // Dubai
  [12.9716, 77.5946], // Bengaluru
  [40.7128, -74.006], // New York
];

// label fade by distance from the globe centre (fraction of the box width)
const EDGE_HIDE = 0.34;
const EDGE_SOFT = 0.07;

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const CYAN = rgb("#5eead4");
const INDIGO = rgb("#8f97ff");

export function Globe({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = wrap.current;
    if (!canvas || !box) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let destroyed = false;
    let raf = 0;
    let visible = true;
    let globe: import("cobe").Globe | null = null;

    // start with the hub's longitude facing the viewer, tilted toward the north
    let phi = -((HUB[1] * Math.PI) / 180) + Math.PI / 2 - 0.9;
    let dragPhi = 0;
    let targetDrag = 0;
    let pointerX: number | null = null;
    const theta = 0.28;

    const size = () => box.getBoundingClientRect().width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    (async () => {
      const { default: createGlobe } = await import("cobe");
      if (destroyed) return;
      const s = size();
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: s * dpr,
        height: s * dpr,
        phi,
        theta,
        dark: 1,
        diffuse: 1.25,
        mapSamples: 24000,
        mapBrightness: 7.5,
        mapBaseBrightness: 0.02,
        baseColor: [0.14, 0.15, 0.27],
        markerColor: CYAN,
        glowColor: [0.2, 0.21, 0.5],
        opacity: 0.92,
        markerElevation: 0.015,
        arcColor: INDIGO,
        arcWidth: 0.55,
        arcHeight: 0.28,
        markers: [
          { location: HUB, size: 0.09, color: [0.66, 0.69, 1], id: "hub" },
          ...PROVIDERS.map((p) => ({ location: p.at, size: 0.06, color: CYAN, id: p.id })),
          ...CLIENTS.map((c) => ({ location: c, size: 0.028, color: [0.85, 0.87, 1] as [number, number, number] })),
        ],
        arcs: [
          ...CLIENTS.map((c, i) => ({ from: c, to: HUB, color: INDIGO, id: `in-${i}` })),
          ...PROVIDERS.map((p) => ({ from: HUB, to: p.at, color: CYAN, id: `out-${p.id}` })),
        ],
      });
      setReady(true);

      // Fade each label as its point nears the rim, so labels only appear
      // over the face of the globe and never spill past it or crowd each other.
      const anchors = new Map<string, HTMLElement>();
      // cobe writes ":root{--cobe-visible-<id>:N;...}" into a <style> for points
      // on the front of the globe; read it to know which labels are eligible.
      let visStyle: HTMLStyleElement | null = null;
      const frontIds = () => {
        if (!visStyle || !visStyle.isConnected) {
          visStyle = Array.from(document.head.querySelectorAll("style")).find((st) =>
            (st.textContent ?? "").startsWith(":root{"),
          ) as HTMLStyleElement | null ?? null;
        }
        return visStyle?.textContent ?? "";
      };

      // Fade labels near the rim, then resolve collisions: labels are placed
      // from the centre outward and any label whose box would overlap an
      // already-placed one is faded out until there is room again.
      const fadeLabels = () => {
        const vis = frontIds();
        const bw = box.clientWidth;
        const items: { el: HTMLElement; x: number; y: number; w: number; h: number; edge: number }[] = [];
        box.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => {
          const id = el.dataset.label!;
          let a = anchors.get(id);
          if (!a) {
            // cobe wraps the canvas in its own container and puts anchors there
            a = Array.from(box.querySelectorAll<HTMLElement>("div")).find(
              (c) => c.style.cssText.includes(`anchor-name: --cobe-${id};`) || c.style.cssText.endsWith(`--cobe-${id}`),
            );
            if (a) anchors.set(id, a);
          }
          if (!a) return;
          const fx = parseFloat(a.style.left) / 100;
          const fy = parseFloat(a.style.top) / 100;
          const r = Math.hypot(fx - 0.5, fy - 0.5);
          let edge = Math.max(0, Math.min(1, (EDGE_HIDE - r) / EDGE_SOFT));
          if (!vis.includes(`--cobe-visible-${id}:`)) edge = 0;
          items.push({ el, x: fx * bw, y: fy * bw, w: el.offsetWidth, h: el.offsetHeight, edge });
        });
        items.sort((p, q) => q.edge - p.edge);
        const placed: { l: number; r: number; t: number; b: number }[] = [];
        const GAP = 10;
        const clash = (r: { l: number; r: number; t: number; b: number }) =>
          placed.some((q) => r.l < q.r && q.l < r.r && r.t < q.b && q.t < r.b);
        for (const it of items) {
          // try above the point first, then below; hide only if both collide
          const l = it.x - it.w / 2 - GAP;
          const r = it.x + it.w / 2 + GAP;
          const above = { l, r, t: it.y - 10 - it.h - GAP, b: it.y - 10 + GAP };
          const below = { l, r, t: it.y + 10 - GAP, b: it.y + 10 + it.h + GAP };
          let side: "above" | "below" | null = null;
          if (it.edge > 0.02) side = !clash(above) ? "above" : !clash(below) ? "below" : null;
          if (side) placed.push(side === "above" ? above : below);
          if (side && it.el.dataset.side !== side) it.el.dataset.side = side;
          it.el.style.setProperty("--edge", (side ? it.edge : 0).toFixed(3));
        }
      };

      const tick = () => {
        if (destroyed) return;
        if (visible && !document.hidden && globe) {
          if (!reduce && pointerX === null) phi += 0.0028;
          dragPhi += (targetDrag - dragPhi) * 0.12;
          globe.update({ phi: phi + dragPhi, theta });
          fadeLabels();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    const ro = new ResizeObserver(() => {
      const s = size();
      globe?.update({ width: s * dpr, height: s * dpr });
    });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
    io.observe(box);

    const down = (e: PointerEvent) => {
      pointerX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (pointerX === null) return;
      targetDrag += (e.clientX - pointerX) / 180;
      pointerX = e.clientX;
    };
    const up = () => {
      pointerX = null;
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      globe?.destroy();
    };
  }, []);

  return (
    <div ref={wrap} className={`relative aspect-square w-full ${className}`}>
      {/* atmosphere behind the sphere */}
      <div
        aria-hidden="true"
        className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(91,95,240,0.28),rgba(91,95,240,0.08)_55%,transparent_70%)] blur-2xl"
      />
      <canvas
        ref={canvasRef}
        aria-label="Globe showing client traffic routed through the Tessaroute gateway in Mumbai to provider regions"
        role="img"
        className="relative h-full w-full touch-pan-y transition-opacity duration-1000"
        style={{ opacity: ready ? 1 : 0, cursor: "grab", contain: "layout paint size" }}
      />
      <GlobeLabel id="hub" title="Tessaroute gateway" sub="Mumbai" hub />
      {PROVIDERS.map((p) => (
        <GlobeLabel key={p.id} id={p.id} title={p.name} sub={p.region} />
      ))}
    </div>
  );
}

function GlobeLabel({ id, title, sub, hub = false }: { id: string; title: string; sub: string; hub?: boolean }) {
  const v = `var(--cobe-visible-${id}, 0)`;
  // Outer: anchored to cobe's marker; hidden (and blurred) when the point is
  // on the far side. Inner: faded by --edge as the point nears the rim.
  return (
    <div
      data-label={id}
      className="globe-label"
      style={
        {
          positionAnchor: `--cobe-${id}`,
          opacity: v,
          filter: `blur(calc((1 - ${v}) * 8px))`,
        } as React.CSSProperties
      }
    >
      <div
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(8,10,20,0.8)] py-1 pl-1.5 pr-3 text-[11px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] transition-opacity duration-200"
        style={{ opacity: "var(--edge, 0)" }}
      >
        <span
          className={`h-2 w-2 rounded-full ${hub ? "bg-accent shadow-[0_0_10px_var(--accent)]" : "bg-signal shadow-[0_0_10px_var(--signal)]"}`}
        />
        <span className="font-medium text-ink">{title}</span>
        <span className="font-mono text-[10px] text-faint">{sub}</span>
      </div>
    </div>
  );
}
