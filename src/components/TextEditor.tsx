"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { containsLatex } from "@/lib/latex";
import LatexPreview from "./LatexPreview";

interface Props {
  x: number;
  y: number;
  initialContent?: string;
  editingElementId?: string | null;
  fontSize?: number;
  onCommit: (content: string, isLatex: boolean) => void;
  onCancel: () => void;
  camera: { x: number; y: number; zoom: number };
}

const LATEX_SNIPPETS: { label: string; insert: string; cursorOffset: number }[] = [
  { label: "x²", insert: "x^{}", cursorOffset: 3 },
  { label: "xₙ", insert: "x_{}", cursorOffset: 3 },
  { label: "÷", insert: "\\frac{}{}", cursorOffset: 6 },
  { label: "√", insert: "\\sqrt{}", cursorOffset: 6 },
  { label: "cancel", insert: "\\cancel{}", cursorOffset: 8 },
  { label: "x̄", insert: "\\overline{}", cursorOffset: 10 },
  { label: "Σ", insert: "\\sum_{i=1}^{n}", cursorOffset: 14 },
  { label: "∫", insert: "\\int_{a}^{b}", cursorOffset: 12 },
];

function hasMixedLatexWithoutDollar(input: string): boolean {
  const text = input.trim();
  if (!text) return false;
  if (/\$[^$]+\$/.test(text)) return false;

  const hasLatexToken =
    /\\[a-zA-Z]{2,}/.test(text) || /[a-zA-Z0-9][\^_]\{?[a-zA-Z0-9]/.test(text);
  if (!hasLatexToken) return false;

  const plainTextOnly = text
    .replace(/\\[a-zA-Z]+(?:\[[^\]]*\])?(?:\{[^}]*\})*/g, " ")
    .replace(/[\^_{}\\]/g, " ")
    .replace(/[0-9=+\-*/(),.[\]<>|!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /[a-zA-Z]{2,}/.test(plainTextOnly);
}

export default function TextEditor({
  x,
  y,
  initialContent = "",
  fontSize = 24,
  onCommit,
  onCancel,
  camera,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const contentRef = useRef(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mountedAtRef = useRef<number>(0);
  const committedRef = useRef(false);
  const strokeColor = useCanvasStore((s) => s.strokeColor);

  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.max(ta.scrollHeight, 42)}px`;
  }, []);

  // Keep ref in sync with state so callbacks always see the latest value
  useEffect(() => {
    contentRef.current = content;
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  useEffect(() => {
    mountedAtRef.current = Date.now();
    committedRef.current = false;
    const timer = setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        adjustTextareaHeight();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [adjustTextareaHeight]);

  const dismiss = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;

    const trimmed = contentRef.current.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onCommit(trimmed, containsLatex(trimmed));
  }, [onCommit, onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      committedRef.current = true;
      onCancel();
      return;
    }
    if (e.key === "Enter" && e.shiftKey) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      dismiss();
    }
  }, [dismiss, onCancel]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (Date.now() - mountedAtRef.current < 200) return;
    const container = e.currentTarget.closest("[data-text-editor]");
    if (container && e.relatedTarget && container.contains(e.relatedTarget as Node)) return;
    dismiss();
  }, [dismiss]);

  const insertSnippet = useCallback((insert: string, cursorOffset: number) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const current = contentRef.current;
    const selected = current.slice(start, end);

    if (selected && insert.includes("{}")) {
      const braceIdx = insert.indexOf("{}");
      const wrapped = insert.slice(0, braceIdx + 1) + selected + insert.slice(braceIdx + 1);
      const newContent = current.slice(0, start) + wrapped + current.slice(end);
      setContent(newContent);
      setTimeout(() => {
        ta.focus();
        const newPos = start + braceIdx + 1 + selected.length;
        ta.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      const newContent = current.slice(0, start) + insert + current.slice(end);
      setContent(newContent);
      setTimeout(() => {
        ta.focus();
        const newPos = start + cursorOffset;
        ta.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }, []);

  const screenX = x * camera.zoom + camera.x;
  const screenY = y * camera.zoom + camera.y;

  const hasLatex = containsLatex(content) && content.trim().length > 0;
  const shouldShowDollarReminder = useMemo(
    () => hasMixedLatexWithoutDollar(content),
    [content]
  );

  return (
    <div
      data-text-editor
      className="fixed z-[100]"
      style={{
        left: screenX,
        top: screenY,
        transform: `scale(${camera.zoom})`,
        transformOrigin: "top left",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          border: "1px solid var(--border-oat)",
          boxShadow:
            "0 0 0 2px var(--color-slushie-500), rgba(0,0,0,0.08) 0px 8px 24px, rgba(0,0,0,0.04) 0px 2px 6px",
          overflow: "hidden",
          minWidth: 280,
        }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="block w-full resize-none min-h-[42px] leading-tight outline-none bg-transparent overflow-hidden"
          style={{
            fontSize,
            color: strokeColor,
            fontFamily: "var(--font-hand)",
            caretColor: "var(--color-slushie-500)",
            padding: "12px 14px",
          }}
          rows={1}
          placeholder="Type text or $LaTeX$..."
        />

        {/* LaTeX snippet buttons */}
        <div
          style={{
            borderTop: "1px solid var(--border-oat-light)",
            padding: "6px 10px",
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {LATEX_SNIPPETS.map((snippet) => (
            <button
              key={snippet.label}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                insertSnippet(snippet.insert, snippet.cursorOffset);
              }}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "3px 8px",
                borderRadius: 8,
                border: "1px solid var(--border-oat)",
                background: "var(--background)",
                color: "var(--color-warm-charcoal)",
                cursor: "pointer",
                lineHeight: 1.4,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-slushie-500)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "var(--color-slushie-500)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--background)";
                e.currentTarget.style.color = "var(--color-warm-charcoal)";
                e.currentTarget.style.borderColor = "var(--border-oat)";
              }}
            >
              {snippet.label}
            </button>
          ))}
        </div>

        {shouldShowDollarReminder && (
          <div
            style={{
              borderTop: "1px dashed var(--border-oat)",
              padding: "8px 12px",
              background: "#fffef8",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.2px",
                color: "var(--color-warm-charcoal)",
                marginBottom: 3,
              }}
            >
              Reminder: wrap equation with dollar sign
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-warm-silver)",
                lineHeight: 1.4,
              }}
            >
              Example: <code>{"hasil = $\\frac{15}{3}$"}</code> so plain text
              stays plain and equation renders as math.
            </div>
          </div>
        )}

        {hasLatex && (
          <div
            style={{
              borderTop: "1px dashed var(--border-oat)",
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "1.08px",
                color: "var(--color-warm-silver)",
                marginBottom: 6,
              }}
            >
              Preview
            </div>
            <LatexPreview content={content} visible={true} />
          </div>
        )}
      </div>
    </div>
  );
}
