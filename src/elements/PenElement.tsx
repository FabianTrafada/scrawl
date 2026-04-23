"use client";

import { useCanvasStore } from "@/store/canvasStore";
import type { PenElement as PenElementType } from "@/store/canvasStore";

interface Props {
  element: PenElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function PenElement({ element, isSelected, onSelect }: Props) {
  const activeTool = useCanvasStore((s) => s.activeTool);

  if (!element.pathData) return null;
  const isEraser = activeTool === "eraser";

  const DEFAULT_STROKE = "#1e1e1e";
  const isDefaultStroke =
    element.strokeColor?.toLowerCase() === DEFAULT_STROKE.toLowerCase();

  const effectiveStroke = isDefaultStroke
    ? "var(--tool-default-stroke)"
    : element.strokeColor;

  const glow = isDefaultStroke ? "var(--tool-default-stroke-glow)" : undefined;

  return (
    <path
      d={element.pathData}
      fill={effectiveStroke}
      stroke="none"
      opacity={element.opacity}
      pointerEvents={isEraser ? "none" : "all"}
      data-hitbox="pen"
      data-element-id={element.id}
      style={{ cursor: "move", filter: glow }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (isEraser) return;

        onSelect(element.id);
      }}
      filter={isSelected ? "url(#selection-glow)" : undefined}
    />
  );
}
