"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import type { TextElement as TextElementType } from "@/store/canvasStore";
import { renderLatexToDisplayHTML } from "@/lib/latex";

interface Props {
  element: TextElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onResize?: (id: string, height: number) => void;
}

export default function TextElementRenderer({
  element,
  isSelected,
  onSelect,
  onDoubleClick,
  onResize,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const elWidth = element.width || 60;
  const [measuredH, setMeasuredH] = useState(element.height || 30);

  const latexHtml = useMemo(() => {
    if (!element.isLatex) return "";
    return renderLatexToDisplayHTML(element.content);
  }, [element.content, element.isLatex]);

  const measure = useCallback(() => {
    if (!contentRef.current) return;
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      const h = el.scrollHeight;
      if (h > 0 && h !== measuredH) {
        setMeasuredH(h);
        onResize?.(element.id, h);
      }
    });
  }, [element.id, measuredH, onResize]);

  useEffect(() => {
    measure();
  }, [latexHtml, element.content, element.fontSize, elWidth, measure]);

  useEffect(() => {
    setMeasuredH(element.height || 30);
  }, [element.height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(element.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(element.id);
  };

  const pad = 8;
  const displayH = Math.max(measuredH, 30);

  return (
    <g>
      {isSelected && (
        <rect
          x={element.x - pad}
          y={element.y - pad}
          width={elWidth + pad * 2}
          height={displayH + pad * 2}
          fill="transparent"
          stroke="#3bd3fd"
          strokeWidth={2}
          strokeDasharray="8,5"
          rx={6}
          pointerEvents="none"
        />
      )}

      <foreignObject
        x={element.x}
        y={element.y}
        width={Math.max(elWidth, 60)}
        height={Math.max(displayH + 4, 30)}
        style={{ overflow: "visible" }}
      >
        <div
          ref={contentRef}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          style={{
            fontSize: element.fontSize,
            color: element.strokeColor,
            cursor: "move",
            userSelect: "none",
            padding: 4,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            width: Math.max(elWidth - 8, 40),
            fontFamily: element.isLatex ? undefined : "var(--font-hand)",
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
