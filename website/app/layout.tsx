import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { Starfield } from "@/components/Starfield";
import "./globals.css";

const display = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "500", "600", "700"], display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "InferMesh · Multi-provider LLM gateway",
  description:
    "One OpenAI-compatible endpoint in front of OpenAI, Anthropic, Gemini and Azure. Model aliases, same-tier fallback, circuit breakers, caching, rate limits, cost tracking and an observability dashboard.",
  openGraph: {
    title: "InferMesh",
    description: "One endpoint. Every model.",
    images: ["/screenshots/overview.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#03040a",
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Starfield />
        {children}
      </body>
    </html>
  );
}
