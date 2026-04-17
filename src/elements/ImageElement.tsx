"use client";

import { useRef, useState, useEffect } from "react";
import type { ImageElement as ImageElementType } from "@/store/canvasStore";
import { useCanvasStore } from "@/store/canvasStore";

interface Props {
  element: ImageElementType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function ImageElement({ element, isSelected, onSelect }: Props) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isEraser = activeTool === "eraser";

  const imgRef = useRef<SVGImageElement>(null);
  const [size, setSize] = useState({ w: element.width, h: element.height });
  const shimmerId = `upload-shimmer-${element.id}`;

  useEffect(() => {
    if (element.width > 0 && element.height > 0) {
      setSize({ w: element.width, h: element.height });
    }
  }, [element.width, element.height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEraser) return;
    e.stopPropagation();
    onSelect(element.id);
  };

  const pad = 8;
  const isUploading = element.uploadStatus === "uploading";
  const hasFailedUpload = element.uploadStatus === "failed";
  const canRenderImage = !!element.src && !isUploading;

  return (
    <g style={{ pointerEvents: isEraser ? "none" : "auto" }}>
      {isUploading && (
        <defs>
          <linearGradient id={shimmerId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ece8e0" />
            <stop offset="45%" stopColor="#ece8e0" />
            <stop offset="50%" stopColor="#f7f3ea">
              <animate attributeName="offset" values="-1;1" dur="1.4s" repeatCount="indefinite" />
            </stop>
            <stop offset="55%" stopColor="#ece8e0" />
            <stop offset="100%" stopColor="#ece8e0" />
          </linearGradient>
        </defs>
      )}
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
      {canRenderImage ? (
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
      ) : isUploading ? (
        <g onPointerDown={handlePointerDown} style={{ cursor: "move" }}>
          <rect
            x={element.x}
            y={element.y}
            width={size.w}
            height={size.h}
            fill={`url(#${shimmerId})`}
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
            Uploading image...
          </text>
        </g>
      ) : hasFailedUpload ? (
        <g onPointerDown={handlePointerDown} style={{ cursor: "move" }}>
          <rect
            x={element.x}
            y={element.y}
            width={size.w}
            height={size.h}
            fill="rgba(252, 121, 129, 0.08)"
            stroke="var(--color-pomegranate-400)"
            strokeDasharray="6,4"
            rx={8}
          />
          <text
            x={element.x + size.w / 2}
            y={element.y + size.h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-warm-charcoal)"
            fontSize={12}
          >
            Upload failed
          </text>
        </g>
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
