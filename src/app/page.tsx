"use client";

import Canvas from "@/components/Canvas";
import Toolbar from "@/components/Toolbar";
import LatexCheatsheet from "@/components/LatexCheatsheet";
import Script from "next/script";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Scrawl",
  url: "https://scrawl.app",
  description:
    "Draw, sketch, and write math on a freeform whiteboard. Type LaTeX like \\frac{a}{b} or x^2 and see it rendered instantly.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Freehand drawing",
    "Shape tools (rectangle, ellipse, line, arrow)",
    "Instant LaTeX math rendering",
    "Image paste support",
    "Undo / Redo",
    "Trackpad zoom and pan",
  ],
};

export default function Home() {
  return (
    <>
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="h-screen w-screen relative" role="application" aria-label="Scrawl whiteboard">
        <h1 className="sr-only">Scrawl — Freeform Whiteboard with LaTeX Math Rendering</h1>
        <Canvas />
        <Toolbar />
        <LatexCheatsheet />
        <noscript>
          <div style={{ padding: 32, textAlign: "center", fontFamily: "system-ui" }}>
            <h2>Scrawl requires JavaScript</h2>
            <p>Please enable JavaScript to use the freeform whiteboard with LaTeX math rendering.</p>
          </div>
        </noscript>
        <footer className="fixed bottom-4 left-4 z-50 text-[12px] text-[var(--color-warm-silver)] select-none pointer-events-none tracking-wide">
          <span className="font-semibold text-[var(--color-warm-charcoal)]">Scrawl</span>
          {" · "}
          Type LaTeX in text mode · Pinch to zoom · Two-finger scroll to pan
        </footer>
      </main>
    </>
  );
}
