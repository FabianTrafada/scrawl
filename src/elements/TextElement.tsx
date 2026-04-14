"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import type { TextElement as TextElementType } from "@/store/canvasStore";
import { renderLatexToDisplayHTML } from "@/lib/latex";

interface Props {
  element: TextElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
}

export default function TextElementRenderer({
  element,
  isSelected,
  onSelect,
  onDoubleClick,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: element.width || 60, h: element.height || 30 });

  const latexHtml = useMemo(() => {
    if (!element.isLatex) return "";
    return renderLatexToDisplayHTML(element.content);
  }, [element.content, element.isLatex]);

  useEffect(() => {
    if (!contentRef.current) return;
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      if (w > 0 && h > 0) {
        setSize({ w, h });
      }
    });
  }, [latexHtml, element.content, element.fontSize]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(element.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(element.id);
  };

  const pad = 8;

  return (
    <g>
      {/* Dashed selection box */}
      {isSelected && (
        <rect
          x={element.x - pad}
          y={element.y - pad}
          width={size.w + pad * 2}
          height={size.h + pad * 2}
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
        width={Math.max(size.w + 4, 60)}
        height={Math.max(size.h + 4, 30)}
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
            wordBreak: "keep-all",
            fontFamily: element.isLatex ? undefined : "var(--font-hand)",
            display: "inline-block",
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
