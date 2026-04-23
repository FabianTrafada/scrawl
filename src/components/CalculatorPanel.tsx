"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "@/store/canvasStore";
import { evaluateExpression, formatCalculationResult } from "@/lib/calculator";

type KeypadButton =
  | { kind: "input"; label: string; value: string }
  | { kind: "clear"; label: string }
  | { kind: "backspace"; label: string }
  | { kind: "equals"; label: string };

const KEYPAD: KeypadButton[] = [
  { kind: "input", label: "7", value: "7" },
  { kind: "input", label: "8", value: "8" },
  { kind: "input", label: "9", value: "9" },
  { kind: "input", label: "/", value: "/" },
  { kind: "input", label: "4", value: "4" },
  { kind: "input", label: "5", value: "5" },
  { kind: "input", label: "6", value: "6" },
  { kind: "input", label: "*", value: "*" },
  { kind: "input", label: "1", value: "1" },
  { kind: "input", label: "2", value: "2" },
  { kind: "input", label: "3", value: "3" },
  { kind: "input", label: "-", value: "-" },
  { kind: "input", label: "0", value: "0" },
  { kind: "input", label: ".", value: "." },
  { kind: "input", label: "(", value: "(" },
  { kind: "input", label: ")", value: ")" },
  { kind: "clear", label: "AC" },
  { kind: "backspace", label: "BS" },
  { kind: "equals", label: "=" },
  { kind: "input", label: "+", value: "+" },
];

function normalizeExpression(input: string): string {
  return input
    .replace(/\u00d7/g, "*")
    .replace(/\u00f7/g, "/")
    .replace(/\u2212/g, "-");
}

export default function CalculatorPanel() {
  const open = useCanvasStore((s) => s.calculatorOpen);
  const setOpen = useCanvasStore((s) => s.setCalculatorOpen);
  const isReadOnly = useCanvasStore((s) => s.isReadOnly);
  const camera = useCanvasStore((s) => s.camera);
  const viewportSize = useCanvasStore((s) => s.viewportSize);
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const addElement = useCanvasStore((s) => s.addElement);
  const pushToHistory = useCanvasStore((s) => s.pushToHistory);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const setSelectedElementIds = useCanvasStore((s) => s.setSelectedElementIds);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canInsert = useMemo(
    () => result.length > 0 && !isReadOnly,
    [result, isReadOnly]
  );

  const evaluate = useCallback(() => {
    const normalized = normalizeExpression(expression.trim());
    if (!normalized) {
      setResult("");
      setError("Type an expression first");
      return;
    }

    try {
      const value = evaluateExpression(normalized);
      const formatted = formatCalculationResult(value);
      setResult(formatted);
      setError("");
    } catch (err) {
      setResult("");
      setError(err instanceof Error ? err.message : "Invalid expression");
    }
  }, [expression]);

  const clear = useCallback(() => {
    setExpression("");
    setResult("");
    setError("");
  }, []);

  const backspace = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  const append = useCallback((value: string) => {
    setExpression((prev) => `${prev}${value}`);
    setError("");
  }, []);

  const insertResultToCanvas = useCallback(() => {
    if (!result || isReadOnly) return;

    const width = Math.max(320, viewportSize.width || window.innerWidth);
    const height = Math.max(240, viewportSize.height || window.innerHeight);
    const x = (width / 2 - camera.x) / camera.zoom;
    const y = (height / 2 - camera.y) / camera.zoom;

    pushToHistory();
    const id = addElement({
      type: "text",
      x,
      y,
      content: result,
      fontSize: 24,
      isLatex: false,
      strokeColor,
      fillColor: "transparent",
      strokeWidth: 0,
      opacity: 1,
      width: Math.max(60, result.length * 14),
      height: 34,
      userResized: false,
    });
    setSelectedElementIds([id]);
    setSelectedElementId(id);
    setActiveTool("select");
    setOpen(false);
    toast.success("Result inserted on canvas");
  }, [addElement, camera.x, camera.y, camera.zoom, isReadOnly, pushToHistory, result, setActiveTool, setOpen, setSelectedElementId, setSelectedElementIds, strokeColor, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(expression.length, expression.length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, expression.length]);

  useEffect(() => {
    if (!open) return;
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <section className="fixed bottom-16 right-3 sm:bottom-6 sm:right-4 z-[95] w-[min(92vw,340px)] clay-card clay-card-dashed p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="clay-kicker">Utility</div>
          <div className="text-sm font-semibold">Calculator</div>
        </div>
        <button
          type="button"
          className="clay-btn clay-btn-ux px-2 py-1 text-[10px]"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      <input
        ref={inputRef}
        value={expression}
        onChange={(e) => {
          setExpression(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            evaluate();
          }
        }}
        placeholder="(12 + 8) / 5"
        className="w-full clay-input px-3 py-2 text-sm"
        aria-label="Calculator expression"
      />

      <div className="mt-2 border border-[var(--border-oat)] rounded-xl px-3 py-2 bg-[var(--surface-soft)] min-h-[56px]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-warm-silver)] font-semibold">
          Result
        </div>
        <div className={`text-sm mt-1 ${error ? "text-red-600" : "text-[var(--foreground)]"}`}>
          {error || (result ? `= ${result}` : "-")}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {KEYPAD.map((button) => (
          <button
            key={`${button.kind}-${button.label}`}
            type="button"
            className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-2 py-2 text-sm ${button.kind === "equals" ? "bg-[var(--color-matcha-600)] text-white border-[var(--color-matcha-600)]" : ""}`}
            onClick={() => {
              if (button.kind === "input") append(button.value);
              if (button.kind === "clear") clear();
              if (button.kind === "backspace") backspace();
              if (button.kind === "equals") evaluate();
            }}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="flex-1 clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-xs"
          onClick={evaluate}
        >
          Calculate
        </button>
        <button
          type="button"
          disabled={!canInsert}
          className="flex-1 clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-xs disabled:opacity-50"
          onClick={insertResultToCanvas}
        >
          Insert Result
        </button>
      </div>
    </section>
  );
}
