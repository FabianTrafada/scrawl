"use client";

import { useRef, useState, useEffect } from "react";
import type { ImageElement as ImageElementType } from "@/store/canvasStore";

interface Props {
  element: ImageElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function ImageElement({ element, isSelected, onSelect }: Props) {
  const imgRef = useRef<SVGImageElement>(null);
  const [size, setSize] = useState({ w: element.width, h: element.height });

  useEffect(() => {
    if (element.width > 0 && element.height > 0) {
      setSize({ w: element.width, h: element.height });
    }
  }, [element.width, element.height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(element.id);
  };

  const pad = 8;

  return (
    <g>
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
      {element.src ? (
        <image
          ref={imgRef}
          href={element.src}
          x={element.x}
          y={element.y}
          width={size.w}
          height={size.h}
          style={{ cursor: "move" }}
          onPointerDown={handlePointerDown}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <g onPointerDown={handlePointerDown} style={{ cursor: "move" }}>
          <rect
            x={element.x}
            y={element.y}
            width={size.w}
            height={size.h}
            fill="rgba(255,255,255,0.8)"
            stroke="var(--border-oat)"
            strokeDasharray="6,4"
            rx={8}
          />
          <text
            x={element.x + size.w / 2}
            y={element.y + size.h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-warm-silver)"
            fontSize={12}
          >
            Image not found
          </text>
        </g>
      )}
    </g>
  );
}
