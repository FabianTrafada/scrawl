"use client";

import { useEffect, useRef } from "react";
import type {
  RectangleElement,
  EllipseElement,
  LineElement,
  ArrowElement,
} from "@/store/canvasStore";
import rough from "roughjs";

type ShapeType = RectangleElement | EllipseElement | LineElement | ArrowElement;

interface Props {
  element: ShapeType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function ShapeElement({ element, isSelected, onSelect }: Props) {
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = gRef.current;
    if (!g) return;

    while (g.firstChild) g.removeChild(g.firstChild);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rc = rough.svg(svg);

    const opts = {
      stroke: element.strokeColor,
      strokeWidth: element.strokeWidth,
      fill: element.fillColor === "transparent" ? undefined : element.fillColor,
      fillStyle: "hachure" as const,
      roughness: 1.5,
      seed: hashCode(element.id),
    };

    let node: SVGGElement;

    switch (element.type) {
      case "rectangle":
        node = rc.rectangle(
          element.x,
          element.y,
          element.width,
          element.height,
          opts
        );
        break;
      case "ellipse":
        node = rc.ellipse(
          element.x + element.width / 2,
          element.y + element.height / 2,
          element.width,
          element.height,
          opts
        );
        break;
      case "line":
        node = rc.line(element.x, element.y, element.x2, element.y2, opts);
        break;
      case "arrow": {
        const lineNode = rc.line(
          element.x,
          element.y,
          element.x2,
          element.y2,
          opts
        );
        g.appendChild(lineNode);

        const angle = Math.atan2(
          element.y2 - element.y,
          element.x2 - element.x
        );
        const headLen = 16;
        const a1x = element.x2 - headLen * Math.cos(angle - Math.PI / 6);
        const a1y = element.y2 - headLen * Math.sin(angle - Math.PI / 6);
        const a2x = element.x2 - headLen * Math.cos(angle + Math.PI / 6);
        const a2y = element.y2 - headLen * Math.sin(angle + Math.PI / 6);
        g.appendChild(
          rc.line(element.x2, element.y2, a1x, a1y, opts)
        );
        g.appendChild(
          rc.line(element.x2, element.y2, a2x, a2y, opts)
        );
        return;
      }
    }

    g.appendChild(node);
  }, [element]);

  const hitBox = getHitBox(element);

  return (
    <g ref={gRef} opacity={element.opacity}>
      {/* Invisible hit area for selection */}
      <rect
        x={hitBox.x}
        y={hitBox.y}
        width={hitBox.w}
        height={hitBox.h}
        fill="transparent"
        stroke={isSelected ? "var(--color-slushie-500)" : "transparent"}
        strokeWidth={isSelected ? 2 : 0}
        strokeDasharray={isSelected ? "6,4" : undefined}
        style={{ cursor: "move" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
      />
    </g>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getHitBox(el: ShapeType) {
  switch (el.type) {
    case "rectangle":
    case "ellipse":
      return { x: el.x, y: el.y, w: el.width, h: el.height };
    case "line":
    case "arrow": {
      const minX = Math.min(el.x, el.x2);
      const minY = Math.min(el.y, el.y2);
      const maxX = Math.max(el.x, el.x2);
      const maxY = Math.max(el.y, el.y2);
      const pad = 8;
      return {
        x: minX - pad,
        y: minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
      };
    }
  }
}
