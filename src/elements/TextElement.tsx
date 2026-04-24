"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import type { TextElement as TextElementType } from "@/store/canvasStore";
import { useCanvasStore } from "@/store/canvasStore";
import { renderLatexToDisplayHTML } from "@/lib/latex";

interface Props {
  element: TextElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
}

export default function TextElementRenderer({
  element,
  isSelected,
  onSelect,
  onDoubleClick,
  onResize,
}: Props) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isEraser = activeTool === "eraser";

  const DEFAULT_STROKE = "#1e1e1e";
  const isDefaultStroke =
    element.strokeColor?.toLowerCase() === DEFAULT_STROKE.toLowerCase();

  const effectiveStroke = isDefaultStroke
    ? "var(--tool-default-stroke)"
    : element.strokeColor;

  const glow = isDefaultStroke ? "var(--tool-default-stroke-glow)" : undefined;

  const contentRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState({ w: element.width || 60, h: element.height || 30 });

  const latexHtml = useMemo(() => {
    if (!element.isLatex) return "";
    return renderLatexToDisplayHTML(element.content);
  }, [element.content, element.isLatex]);

  useEffect(() => {
    if (!contentRef.current) return;
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      const naturalW = el.scrollWidth;
      const naturalH = el.scrollHeight;
      if (naturalW > 0 && naturalH > 0) {
        setMeasured({ w: naturalW, h: naturalH });

        if (element.userResized) {
          if (element.isLatex && element.width > 0) {
            const scaledHeight = naturalH * (element.width / naturalW);
            onResize?.(element.id, element.width, scaledHeight);
          } else {
            onResize?.(element.id, element.width, naturalH);
          }
        } else {
          onResize?.(element.id, naturalW + 8, naturalH);
        }
      }
    });
  }, [
    latexHtml,
    element.content,
    element.fontSize,
    element.width,
    element.id,
    element.userResized,
    element.isLatex,
    onResize,
  ]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEraser) return;
    e.stopPropagation();
    onSelect(element.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isEraser) return;
    e.stopPropagation();
    onDoubleClick(element.id);
  };

  const pad = 8;
  const naturalW = Math.max(measured.w, 1);
  const naturalH = Math.max(measured.h, 1);
  const displayW = element.userResized
    ? Math.max(element.width, 20)
    : Math.max(naturalW, 40);
  const latexScale =
    element.isLatex && element.userResized
      ? Math.max(displayW / naturalW, 0.05)
      : 1;
  const displayH = element.userResized && element.isLatex
    ? Math.max(naturalH * latexScale, 30)
    : Math.max(naturalH, 30);

  return (
    <g>
      {isSelected && (
        <rect
          x={element.x - pad}
          y={element.y - pad}
          width={displayW + pad * 2}
          height={displayH + pad * 2}
          fill="transparent"
          stroke="#3bd3fd"
          strokeWidth={2}
          strokeDasharray="8,5"
          rx={6}
          data-export-ignore="true"
          pointerEvents="none"
        />
      )}

      <foreignObject
        x={element.x}
        y={element.y}
        width={Math.max(displayW + 4, 60)}
        height={Math.max(displayH + 4, 30)}
        style={{ overflow: "visible", pointerEvents: isEraser ? "none" : "auto" }}
      >
        <div
          ref={contentRef}
          className={element.isLatex ? "canvas-text-latex" : undefined}
          onPointerDown={isEraser ? undefined : handlePointerDown}
          onDoubleClick={isEraser ? undefined : handleDoubleClick}
          style={{
            fontSize: element.fontSize,
            color: effectiveStroke,
            cursor: "move",
            userSelect: "none",
            padding: 4,
            lineHeight: 1.4,
            whiteSpace: element.isLatex ? "normal" : "pre-wrap",
            wordBreak: "break-word",
            maxWidth: element.userResized && !element.isLatex ? displayW : undefined,
            fontFamily: element.isLatex ? undefined : "var(--font-hand)",
            display: "inline-block",
            transform: element.isLatex && element.userResized ? `scale(${latexScale})` : undefined,
            transformOrigin: "top left",
            filter: glow,
            pointerEvents: isEraser ? "none" : "auto",
          }}
          dangerouslySetInnerHTML={
            element.isLatex ? { __html: latexHtml } : undefined
          }
        >
          {element.isLatex ? undefined : element.content}
        </div>
      </foreignObject>
    </g>
  );
}
