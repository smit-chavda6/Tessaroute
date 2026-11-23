import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "InferMesh · Multi-provider LLM gateway",
  description:
    "One OpenAI-compatible endpoint in front of OpenAI, Anthropic, Gemini and Azure. Model aliases, same-tier fallback, circuit breakers, caching, rate limits, cost tracking and an observability dashboard.",
  openGraph: {
    title: "InferMesh",
    description: "One endpoint in front of every model you call.",
    images: ["/screenshots/overview.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07080d",
  viewportFit: "cover",
};

// Runs before paint so a stored light-theme choice never flashes dark.
const themeScript = `try{var t=localStorage.getItem("im-theme");if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
