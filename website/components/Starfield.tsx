"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; depth: number; tw: number; speed: number; tint: number };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

/** Fixed, full-viewport starfield behind the whole page: three depth layers
 *  with scroll parallax, gentle twinkle and an occasional meteor. Static for
 *  reduced-motion users; pauses when the tab is hidden. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteor = performance.now() + 5000;
    let raf = 0;

    const tints = ["255,255,255", "199,203,255", "160,236,225"];

    const seed = () => {
      const count = Math.round(Math.min(340, (w * h) / 5200));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: depth > 0.975 ? 1.1 + Math.random() * 0.4 : 0.3 + depth * 0.75,
          depth,
          tw: Math.random() * Math.PI * 2,
          speed: 0.6 + Math.random() * 1.6,
          tint: Math.random() < 0.7 ? 0 : Math.random() < 0.6 ? 1 : 2,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const scroll = window.scrollY;
      for (const s of stars) {
        // nearer stars (higher depth) drift more with scroll
        const y = (((s.y - scroll * (0.02 + s.depth * 0.12)) % h) + h) % h;
        const twinkle = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(s.tw + (t / 1000) * s.speed);
        ctx.globalAlpha = (0.16 + s.depth * 0.5) * twinkle;
        ctx.fillStyle = `rgb(${tints[s.tint]})`;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.1) {
          ctx.globalAlpha *= 0.18;
          ctx.beginPath();
          ctx.arc(s.x, y, s.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (meteor) {
        const m = meteor;
        const tail = 90;
        const len = Math.hypot(m.vx, m.vy);
        const g = ctx.createLinearGradient(m.x, m.y, m.x - (m.vx / len) * tail, m.y - (m.vy / len) * tail);
        g.addColorStop(0, `rgba(220,230,255,${0.9 * m.life})`);
        g.addColorStop(1, "rgba(220,230,255,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - (m.vx / len) * tail, m.y - (m.vy / len) * tail);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      if (!document.hidden) {
        if (!meteor && t > nextMeteor) {
          meteor = { x: w * (0.3 + Math.random() * 0.7), y: h * Math.random() * 0.4, vx: -7 - Math.random() * 4, vy: 3 + Math.random() * 2, life: 1 };
        }
        if (meteor) {
          meteor.x += meteor.vx;
          meteor.y += meteor.vy;
          meteor.life -= 0.018;
          if (meteor.life <= 0) {
            meteor = null;
            nextMeteor = t + 6000 + Math.random() * 6000;
          }
        }
        draw(t);
      }
      raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);

    const onResize = () => {
      resize();
      if (reduce) draw(0);
    };
    const onScroll = () => reduce && draw(0);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {/* nebula wash: static gradients, cheap to composite */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_10%,rgba(91,95,240,0.16),transparent_70%),radial-gradient(45%_40%_at_10%_60%,rgba(94,234,212,0.07),transparent_70%),radial-gradient(50%_45%_at_90%_90%,rgba(143,151,255,0.08),transparent_70%)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
