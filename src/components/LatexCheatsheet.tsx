"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import katex from "katex";

interface CheatItem {
  cmd: string;
  desc: string;
  latex: string;
}

const SECTIONS: { title: string; items: CheatItem[] }[] = [
  {
    title: "Basic",
    items: [
      { cmd: "x^2", desc: "Superscript", latex: "x^2" },
      { cmd: "x_1", desc: "Subscript", latex: "x_1" },
      { cmd: "x^{n+1}", desc: "Grouped superscript", latex: "x^{n+1}" },
      { cmd: "x_{ij}", desc: "Grouped subscript", latex: "x_{ij}" },
    ],
  },
  {
    title: "Fractions & Roots",
    items: [
      { cmd: "\\frac{a}{b}", desc: "Fraction", latex: "\\frac{a}{b}" },
      { cmd: "\\sqrt{x}", desc: "Square root", latex: "\\sqrt{x}" },
      { cmd: "\\sqrt[3]{x}", desc: "Cube root", latex: "\\sqrt[3]{x}" },
    ],
  },
  {
    title: "Cancel / Strikethrough",
    items: [
      { cmd: "\\cancel{15}", desc: "Diagonal cancel", latex: "\\cancel{15}" },
      { cmd: "\\bcancel{15}", desc: "Back-diagonal cancel", latex: "\\bcancel{15}" },
      { cmd: "\\xcancel{15}", desc: "X-shaped cancel", latex: "\\xcancel{15}" },
    ],
  },
  {
    title: "Decorations",
    items: [
      { cmd: "\\overline{x}", desc: "Overline", latex: "\\overline{x}" },
      { cmd: "\\underline{x}", desc: "Underline", latex: "\\underline{x}" },
      { cmd: "\\hat{x}", desc: "Hat accent", latex: "\\hat{x}" },
      { cmd: "\\bar{x}", desc: "Bar accent", latex: "\\bar{x}" },
      { cmd: "\\vec{x}", desc: "Vector arrow", latex: "\\vec{x}" },
      { cmd: "\\dot{x}", desc: "Dot accent", latex: "\\dot{x}" },
    ],
  },
  {
    title: "Operators",
    items: [
      { cmd: "\\sum_{i=1}^{n}", desc: "Summation", latex: "\\sum_{i=1}^{n}" },
      { cmd: "\\prod_{i=1}^{n}", desc: "Product", latex: "\\prod_{i=1}^{n}" },
      { cmd: "\\int_{a}^{b}", desc: "Integral", latex: "\\int_{a}^{b}" },
      { cmd: "\\lim_{x \\to 0}", desc: "Limit", latex: "\\lim_{x \\to 0}" },
    ],
  },
  {
    title: "Greek Letters",
    items: [
      { cmd: "\\alpha", desc: "Alpha", latex: "\\alpha" },
      { cmd: "\\beta", desc: "Beta", latex: "\\beta" },
      { cmd: "\\gamma", desc: "Gamma", latex: "\\gamma" },
      { cmd: "\\delta", desc: "Delta", latex: "\\delta" },
      { cmd: "\\theta", desc: "Theta", latex: "\\theta" },
      { cmd: "\\lambda", desc: "Lambda", latex: "\\lambda" },
      { cmd: "\\pi", desc: "Pi", latex: "\\pi" },
      { cmd: "\\sigma", desc: "Sigma", latex: "\\sigma" },
      { cmd: "\\omega", desc: "Omega", latex: "\\omega" },
      { cmd: "\\phi", desc: "Phi", latex: "\\phi" },
      { cmd: "\\Sigma", desc: "Capital Sigma", latex: "\\Sigma" },
      { cmd: "\\Delta", desc: "Capital Delta", latex: "\\Delta" },
      { cmd: "\\Omega", desc: "Capital Omega", latex: "\\Omega" },
    ],
  },
  {
    title: "Relations & Symbols",
    items: [
      { cmd: "\\leq", desc: "Less or equal", latex: "\\leq" },
      { cmd: "\\geq", desc: "Greater or equal", latex: "\\geq" },
      { cmd: "\\neq", desc: "Not equal", latex: "\\neq" },
      { cmd: "\\approx", desc: "Approximately", latex: "\\approx" },
      { cmd: "\\times", desc: "Times", latex: "\\times" },
      { cmd: "\\div", desc: "Division", latex: "\\div" },
      { cmd: "\\pm", desc: "Plus-minus", latex: "\\pm" },
      { cmd: "\\infty", desc: "Infinity", latex: "\\infty" },
      { cmd: "\\cdot", desc: "Center dot", latex: "\\cdot" },
      { cmd: "\\rightarrow", desc: "Right arrow", latex: "\\rightarrow" },
      { cmd: "\\leftarrow", desc: "Left arrow", latex: "\\leftarrow" },
    ],
  },
  {
    title: "Brackets",
    items: [
      { cmd: "\\left( \\right)", desc: "Auto-sized parens", latex: "\\left(\\frac{a}{b}\\right)" },
      { cmd: "\\left[ \\right]", desc: "Auto-sized brackets", latex: "\\left[\\frac{a}{b}\\right]" },
      { cmd: "\\left\\{ \\right\\}", desc: "Auto-sized braces", latex: "\\left\\{\\frac{a}{b}\\right\\}" },
    ],
  },
  {
    title: "Mixed Content",
    items: [
      { cmd: "text $x^2$ more", desc: "Inline math in text", latex: "x^2" },
      { cmd: "$\\frac{a}{b}$", desc: "Wrap in dollar signs", latex: "\\frac{a}{b}" },
    ],
  },
];

function renderKatexSafe(expression: string): string {
  try {
    return katex.renderToString(expression, {
      throwOnError: false,
      displayMode: false,
      trust: true,
      strict: false,
    });
  } catch {
    return expression;
  }
}

function RenderedLatex({ expression }: { expression: string }) {
  const html = useMemo(() => renderKatexSafe(expression), [expression]);
  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ display: "inline-flex", alignItems: "center" }}
    />
  );
}

export default function LatexCheatsheet() {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="LaTeX cheatsheet"
        className="fixed top-4 right-4 sm:top-auto sm:bottom-4 sm:right-4 z-50 w-9 h-9 flex items-center justify-center text-base font-bold transition-all duration-200"
        style={{
          borderRadius: 1584,
          background: "#ffffff",
          border: "1px solid var(--border-oat)",
          boxShadow:
            "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
          cursor: "pointer",
          color: "var(--color-warm-charcoal)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "rotateZ(-8deg) translateY(-20%)";
          e.currentTarget.style.boxShadow = "-7px 7px 0px 0px #000000";
          e.currentTarget.style.background = "var(--color-slushie-500)";
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "var(--color-slushie-500)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow =
            "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px";
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.color = "var(--color-warm-charcoal)";
          e.currentTarget.style.borderColor = "var(--border-oat)";
        }}
      >
        ?
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: "var(--background)",
              border: "1px solid var(--border-oat)",
              borderRadius: 24,
              boxShadow: "rgba(0,0,0,0.15) 0px 20px 60px",
              width: "min(640px, 90vw)",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid var(--border-oat)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px" }}>
                  LaTeX Cheatsheet
                </div>
                <div style={{ fontSize: 13, color: "var(--color-warm-silver)", marginTop: 2 }}>
                  Type these in the text tool to render math
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border-oat)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "var(--color-warm-charcoal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ overflowY: "auto", padding: "16px 24px 24px" }}>
              {SECTIONS.map((section) => (
                <div key={section.title} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "1.08px",
                      color: "var(--color-warm-silver)",
                      marginBottom: 8,
                    }}
                  >
                    {section.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {section.items.map((item) => (
                      <div
                        key={item.cmd}
                        style={{
                          background: "#ffffff",
                          border: "1px solid var(--border-oat)",
                          borderRadius: 10,
                          padding: "8px 12px",
                          fontSize: 13,
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "center",
                          gap: 12,
                          boxShadow: "rgba(0,0,0,0.05) 0px 1px 1px",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <code
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              color: "var(--foreground)",
                              background: "var(--background)",
                              padding: "2px 6px",
                              borderRadius: 6,
                              display: "inline-block",
                              width: "fit-content",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.cmd}
                          </code>
                          <span style={{ color: "var(--color-warm-silver)", fontSize: 11 }}>
                            {item.desc}
                          </span>
                        </div>
                        <div
                          style={{
                            width: 1,
                            alignSelf: "stretch",
                            background: "var(--border-oat-light)",
                          }}
                        />
                        <div style={{ display: "flex", justifyContent: "center", fontSize: 18 }}>
                          <RenderedLatex expression={item.latex} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
