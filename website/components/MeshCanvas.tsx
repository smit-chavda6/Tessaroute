"use client";

import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number; r: number; hub: boolean };
type Packet = { a: number; b: number; t: number; speed: number };

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Ambient routing mesh: drifting nodes, links between neighbours, and
 *  packets travelling along links toward a few hub nodes. Pauses offscreen,
 *  draws a single still frame for reduced-motion users. */
export function MeshCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    const packets: Packet[] = [];
    let raf = 0;
    let visible = true;
    const mouse = { x: -9999, y: -9999 };
    let colors = { accent: "#8b93fb", signal: "#5eead4", line: "#1e2332" };

    const readColors = () => {
      colors = { accent: cssVar("--accent"), signal: cssVar("--signal"), line: cssVar("--line-2") };
    };

    const seed = () => {
      const count = Math.round(Math.min(64, Math.max(26, (w * h) / 22000)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: i % 9 === 0 ? 3.2 : 1.6 + Math.random() * 1.1,
        hub: i % 9 === 0,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const LINK = 150;

    const neighbours = (i: number) => {
      const n = nodes[i]!;
      const out: number[] = [];
      for (let j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        const m = nodes[j]!;
        const d = Math.hypot(n.x - m.x, n.y - m.y);
        if (d < LINK) out.push(j);
      }
      return out;
    };

    const spawnPacket = () => {
      const a = Math.floor(Math.random() * nodes.length);
      const ns = neighbours(a);
      if (!ns.length) return;
      // prefer heading to a hub, like requests converging on the gateway
      const hub = ns.find((j) => nodes[j]!.hub);
      const b = hub ?? ns[Math.floor(Math.random() * ns.length)]!;
      packets.push({ a, b, t: 0, speed: 0.008 + Math.random() * 0.012 });
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // links
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j]!;
          const d = Math.hypot(n.x - m.x, n.y - m.y);
          if (d < LINK) {
            const near = Math.hypot((n.x + m.x) / 2 - mouse.x, (n.y + m.y) / 2 - mouse.y) < 140;
            ctx.globalAlpha = (1 - d / LINK) * (near ? 0.75 : 0.35);
            ctx.strokeStyle = near ? colors.accent : colors.line;
            ctx.lineWidth = near ? 1.1 : 0.8;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        ctx.globalAlpha = n.hub ? 0.95 : 0.55;
        ctx.fillStyle = n.hub ? colors.accent : colors.line;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (n.hub) {
          ctx.globalAlpha = 0.12;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // packets
      for (const p of packets) {
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = colors.signal;
        ctx.shadowColor = colors.signal;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    };

    const step = () => {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
        // gentle pull toward the pointer
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 160 && d > 1) {
          n.x += (dx / d) * 0.25;
          n.y += (dy / d) * 0.25;
        }
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]!;
        p.t += p.speed;
        if (p.t >= 1) packets.splice(i, 1);
      }
      if (packets.length < 14 && Math.random() < 0.12) spawnPacket();
    };

    const loop = () => {
      if (visible && !document.hidden) {
        step();
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    readColors();
    resize();
    if (reduce) {
      for (let i = 0; i < 8; i++) spawnPacket();
      packets.forEach((p) => (p.t = Math.random()));
      draw();
    } else {
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
    io.observe(canvas);
    const mo = new MutationObserver(() => {
      readColors();
      if (reduce) draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
