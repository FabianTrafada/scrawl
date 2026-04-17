"use client";

import { useCanvasStore } from "@/store/canvasStore";

/**
 * Cursor colors assigned to each connected user by index.
 * Uses the Scrawl swatch palette.
 */
const CURSOR_COLORS = [
  "#078a52", // Matcha
  "#3bd3fd", // Slushie
  "#fbbd41", // Lemon
  "#43089f", // Ube
  "#fc7981", // Pomegranate
  "#01418d", // Blueberry
  "#ef6d00", // Extra warm
  "#8b5cf6", // Extra purple
];

export default function LiveCursors() {
  const others = useCanvasStore((s) => s.liveblocks.others);
  const camera = useCanvasStore((s) => s.camera);
  const activePresenterId = useCanvasStore((s) => s.activePresenterId);

  if (!others || others.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-40"
      aria-hidden="true"
    >
      {others.map((other, i) => {
        const cursor = other.presence?.cursor as
          | { x: number; y: number }
          | null
          | undefined;
        if (!cursor) return null;

        const color = CURSOR_COLORS[i % CURSOR_COLORS.length];
        const name =
          (other.info as { name?: string } | undefined)?.name ?? "Someone";

        // Convert canvas coords to screen coords
        const screenX = cursor.x * camera.zoom + camera.x;
        const screenY = cursor.y * camera.zoom + camera.y;

        return (
          <g
            key={other.connectionId}
            transform={`translate(${screenX},${screenY})`}
            style={{
              transition: "transform 120ms linear",
            }}
          >
            {/* Cursor arrow */}
            <path
              d="M0 0 L0 16 L4.5 12.5 L8 20 L10.5 19 L7 11.5 L12 10 Z"
              fill={color}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* Name label */}
            <g transform="translate(14, 18)">
              <rect
                x="0"
                y="0"
                width={name.length * 7.5 + 16}
                height="22"
                rx="6"
                fill={color}
              />
              <text
                x="8"
                y="15"
                fill="#ffffff"
                fontSize="11"
                fontWeight="600"
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                {name}{other.id === activePresenterId ? " • Presenter" : ""}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
