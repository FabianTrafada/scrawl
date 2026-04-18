import katex from "katex";

export const KATEX_MACROS: Record<string, string> = {
  "\\answer": "\\underline{\\underline{#1}}",
};

/**
 * Detect if text contains any LaTeX that should be rendered.
 * Returns true for:
 *  - Pure math: "x^2", "\frac{a}{b}"
 *  - Mixed content with $delimiters$: "the answer is $x^2$"
 *  - Backslash commands: "\sqrt{2}"
 */
export function containsLatex(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // Has $...$ delimited math
  if (/\$[^$]+\$/.test(t)) return true;

  // Has backslash commands (\frac, \sqrt, etc.)
  if (/\\[a-zA-Z]{2,}/.test(t)) return true;

  // Pure short math expression with ^ or _ (no long plain words)
  if (/[\^_]/.test(t)) {
    const words = t.split(/\s+/);
    const longPlainWords = words.filter(
      (w) => w.length > 3 && !/[\^_{}\\]/.test(w)
    );
    if (longPlainWords.length >= 2) return false;
    if (/[a-zA-Z0-9][\^_][{0-9a-zA-Z]/.test(t)) return true;
  }

  return false;
}

/**
 * Check if the ENTIRE string is a pure math expression
 * (no plain text words mixed in). Used to decide whether to
 * render everything as math or use mixed mode.
 */
function isPureMath(text: string): boolean {
  const t = text.trim();

  // Wrapped in $ delimiters -- the whole thing is one expression
  if (/^\$[^$]+\$$/.test(t)) return true;

  // If it has backslash commands, check if there are plain words before/after
  if (/\\[a-zA-Z]{2,}/.test(t)) {
    // Split by LaTeX commands and operators, see if leftover is plain text
    const withoutMath = t
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "") // remove \cmd{...}
      .replace(/\\[a-zA-Z]+/g, "")            // remove \cmd
      .replace(/\{[^}]*\}/g, "")              // remove {...}
      .replace(/[\^_=+\-*/()[\]0-9.,|<>!]/g, "") // remove math symbols/numbers
      .trim();

    // If leftover contains words longer than 2 chars, it's mixed content
    const plainWords = withoutMath.split(/\s+/).filter((w) => w.length > 2);
    if (plainWords.length > 0) return false;
    return true;
  }

  // Simple expressions like x^2, a_1
  if (/[\^_]/.test(t)) {
    const words = t.split(/\s+/);
    const longPlainWords = words.filter(
      (w) => w.length > 3 && !/[\^_{}\\]/.test(w)
    );
    return longPlainWords.length === 0;
  }

  return false;
}

export function stripDollarDelimiters(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("$") && trimmed.endsWith("$") && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function renderMixedSingleLine(text: string, displayMode: boolean): string {
  const t = text.trim();
  if (!t) return "";

  // If it's pure math, render everything with KaTeX
  if (isPureMath(t)) {
    return renderKatex(stripDollarDelimiters(t), displayMode);
  }

  // Mixed content: split by $...$ delimiters and render each part
  const parts: string[] = [];
  const regex = /\$([^$]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(t)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      const plain = t.slice(lastIndex, match.index);
      parts.push(`<span style="font-style:normal">${escapeHtml(plain)}</span>`);
    }
    // Math part
    parts.push(renderKatex(match[1], false));
    lastIndex = regex.lastIndex;
  }

  // Remaining plain text after last match
  if (lastIndex < t.length) {
    const remaining = t.slice(lastIndex);
    // If remaining has backslash commands, render as math
    if (/\\[a-zA-Z]{2,}/.test(remaining)) {
      parts.push(renderKatex(remaining.trim(), displayMode));
    } else {
      parts.push(`<span style="font-style:normal">${escapeHtml(remaining)}</span>`);
    }
  }

  // If no $...$ were found but it contains LaTeX commands,
  // the whole thing is math (already handled by isPureMath above,
  // but as fallback render it all)
  if (parts.length === 0) {
    return renderKatex(t, displayMode);
  }

  return parts.join("");
}

/**
 * Render content that may contain mixed text and math.
 * Math is delimited by $...$ for inline math.
 * If the entire string is pure math, renders it all as LaTeX.
 */
export function renderMixedContent(text: string, displayMode: boolean): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (!normalized.includes("\n")) {
    return renderMixedSingleLine(normalized, displayMode);
  }
  return normalized
    .split("\n")
    .map((line) => renderMixedSingleLine(line, displayMode))
    .join("<br/>");
}

function renderKatex(expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expression, {
      throwOnError: false,
      displayMode,
      output: "html",
      macros: KATEX_MACROS,
    });
  } catch {
    return `<span style="color:red">${escapeHtml(expression)}</span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/ {2,}/g, (m) => "&nbsp;".repeat(m.length));
}

// Keep these for backward compatibility
export function renderLatexToHTML(tex: string): string {
  return renderMixedContent(tex, false);
}

export function renderLatexToDisplayHTML(tex: string): string {
  return renderMixedContent(tex, true);
}
