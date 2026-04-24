"use client";

import React from "react";

export type HandleType = "nw" | "ne" | "se" | "sw" | "start" | "end";

interface BoxHandlesProps {
  mode: "box";
  x: number;
  y: number;
  w: number;
  h: number;
  onResizeStart: (handle: HandleType, e: React.PointerEvent) => void;
}

interface LineHandlesProps {
  mode: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onResizeStart: (handle: HandleType, e: React.PointerEvent) => void;
}

type Props = BoxHandlesProps | LineHandlesProps;

const HANDLE_R = 5;
const HIT_R = 15;

const CURSOR_MAP: Record<HandleType, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  se: "nwse-resize",
  sw: "nesw-resize",
  start: "move",
  end: "move",
};

function Handle({
  cx,
  cy,
  handle,
  onResizeStart,
}: {
  cx: number;
  cy: number;
  handle: HandleType;
  onResizeStart: (handle: HandleType, e: React.PointerEvent) => void;
}) {
  return (
    <g>
      {/* Invisible larger hit area */}
      <circle
        cx={cx}
        cy={cy}
        r={HIT_R}
        fill="transparent"
        data-export-ignore="true"
        style={{ cursor: CURSOR_MAP[handle] }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(handle, e);
        }}
      />
      {/* Visible handle */}
      <circle
        cx={cx}
        cy={cy}
        r={HANDLE_R}
        fill="#ffffff"
        stroke="#3bd3fd"
        strokeWidth={2}
        data-export-ignore="true"
        pointerEvents="none"
      />
    </g>
  );
}

export default function ResizeHandles(props: Props) {
  if (props.mode === "line") {
    return (
      <g>
        <Handle cx={props.x1} cy={props.y1} handle="start" onResizeStart={props.onResizeStart} />
        <Handle cx={props.x2} cy={props.y2} handle="end" onResizeStart={props.onResizeStart} />
      </g>
    );
  }

  const { x, y, w, h, onResizeStart } = props;
  return (
    <g>
      <Handle cx={x} cy={y} handle="nw" onResizeStart={onResizeStart} />
      <Handle cx={x + w} cy={y} handle="ne" onResizeStart={onResizeStart} />
      <Handle cx={x + w} cy={y + h} handle="se" onResizeStart={onResizeStart} />
      <Handle cx={x} cy={y + h} handle="sw" onResizeStart={onResizeStart} />
    </g>
  );
}
