"use client";

import { useId, type ReactNode } from "react";

/*
  Duotone glyph set. Each glyph is drawn with a gradient stroke (accent → signal)
  over a soft gradient fill, so icons read as part of the brand rather than as
  generic line icons. Gradient ids are per-instance (useId) so many glyphs can
  share a page.
*/

type Draw = (g: { stroke: string; fill: string; solid: string }) => ReactNode;

const GLYPHS: Record<string, Draw> = {
  play: ({ fill, stroke }) => (
    <path d="M8 5.6c0-1 1.1-1.6 2-1.1l9 5.4c.8.5.8 1.7 0 2.2l-9 5.4c-.9.5-2-.1-2-1.1V5.6Z" fill={fill} stroke={stroke} />
  ),
  pause: ({ fill, stroke }) => (
    <>
      <rect x="6" y="4.5" width="4.2" height="15" rx="1.6" fill={fill} stroke={stroke} />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.6" fill={fill} stroke={stroke} />
    </>
  ),
  reset: ({ stroke, solid }) => (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" fill="none" stroke={stroke} />
      <path d="M4 4.5v4.2h4.2" fill="none" stroke={stroke} />
      <circle cx="12" cy="12" r="1.8" fill={solid} />
    </>
  ),
  bolt: ({ fill, stroke }) => <path d="M13.2 2.8 5 13.4h6.1l-1.3 7.8 8.2-10.6h-6.1l1.3-7.8Z" fill={fill} stroke={stroke} />,
  mesh: ({ stroke, solid, fill }) => (
    <>
      <circle cx="12" cy="12" r="7.5" fill={fill} stroke="none" />
      <path d="M12 12.6V5.4M12 12.6 6 17.4M12 12.6l6 4.8" fill="none" stroke={stroke} />
      <circle cx="12" cy="12.6" r="2.4" fill={solid} />
      <circle cx="12" cy="5.4" r="1.6" fill={solid} />
      <circle cx="6" cy="17.4" r="1.6" fill={solid} />
      <circle cx="18" cy="17.4" r="1.6" fill={solid} />
    </>
  ),
  tiers: ({ fill, stroke }) => (
    <>
      <path d="m12 3.5 8 4-8 4-8-4 8-4Z" fill={fill} stroke={stroke} />
      <path d="m4 12 8 4 8-4M4 16.5l8 4 8-4" fill="none" stroke={stroke} />
    </>
  ),
  route: ({ stroke, solid, fill }) => (
    <>
      <circle cx="5" cy="12" r="2.4" fill={solid} />
      <path d="M7.4 12h3.2c2 0 2.4-6.5 5.4-6.5M10.6 12c2 0 2.4 6.5 5.4 6.5" fill="none" stroke={stroke} />
      <circle cx="18.2" cy="5.5" r="2.2" fill={fill} stroke={stroke} />
      <circle cx="18.2" cy="18.5" r="2.2" fill={fill} stroke={stroke} />
    </>
  ),
  pulse: ({ stroke, fill }) => (
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" fill={fill} stroke="none" />
      <path d="M3.5 12.5h4l2.2-5 3.6 10 2.4-5h4.8" fill="none" stroke={stroke} />
    </>
  ),
};

export function Glyph({ name, className = "h-5 w-5", title }: { name: keyof typeof GLYPHS; className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const g = `g${id}`;
  const f = `f${id}`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={g} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--signal)" />
        </linearGradient>
        <linearGradient id={f} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--signal)" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {GLYPHS[name]!({ stroke: `url(#${g})`, fill: `url(#${f})`, solid: `url(#${g})` })}
    </svg>
  );
}
