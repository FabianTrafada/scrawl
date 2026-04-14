"use client";

import type { PenElement as PenElementType } from "@/store/canvasStore";

interface Props {
  element: PenElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function PenElement({ element, isSelected, onSelect }: Props) {
  if (!element.pathData) return null;

  return (
    <path
      d={element.pathData}
      fill={element.strokeColor}
      stroke="none"
      opacity={element.opacity}
      style={{ cursor: "move" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
      filter={isSelected ? "url(#selection-glow)" : undefined}
    />
  );
}
