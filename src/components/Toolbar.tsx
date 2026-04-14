"use client";

import { useCanvasStore, type ToolType } from "@/store/canvasStore";

const TOOLS: { type: ToolType; label: string; shortcut: string; svg: string }[] = [
  {
    type: "select",
    label: "Select",
    shortcut: "V",
    svg: `<path d="M5 3l12 9-5 1 3 7-3 1-3-7-4 4z" fill="currentColor"/>`,
  },
  {
    type: "pen",
    label: "Pen",
    shortcut: "P",
    svg: `<path d="M3 21l1.5-4.5L17.3 3.7a1 1 0 011.4 0l1.6 1.6a1 1 0 010 1.4L7.5 19.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="1.8"/>`,
  },
  {
    type: "rectangle",
    label: "Rectangle",
    shortcut: "R",
    svg: `<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  },
  {
    type: "ellipse",
    label: "Ellipse",
    shortcut: "O",
    svg: `<ellipse cx="12" cy="12" rx="9" ry="7" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  },
  {
    type: "line",
    label: "Line",
    shortcut: "L",
    svg: `<line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  },
  {
    type: "arrow",
    label: "Arrow",
    shortcut: "A",
    svg: `<line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><polyline points="12,5 19,5 19,12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    type: "text",
    label: "Text / LaTeX",
    shortcut: "T",
    svg: `<text x="12" y="17" text-anchor="middle" font-size="16" font-weight="700" font-family="serif" fill="currentColor" font-style="italic">T</text>`,
  },
];

const COLORS = [
  "#000000", // Clay Black
  "#078a52", // Matcha 600
  "#3bd3fd", // Slushie 500
  "#fbbd41", // Lemon 500
  "#43089f", // Ube 800
  "#fc7981", // Pomegranate 400
];

export default function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const setStrokeColor = useCanvasStore((s) => s.setStrokeColor);

  return (
    <>
      {/* Main toolbar */}
      <nav aria-label="Drawing tools" className="fixed bottom-6 sm:bottom-auto sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 clay-card px-2 py-1.5 max-w-[calc(100%-2rem)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={`${tool.label} tool`}
              aria-pressed={isActive}
              onClick={() => setActiveTool(tool.type)}
              className={`
                relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shrink-0
                ${isActive ? "clay-btn-active" : "clay-btn text-[#55534e]"}
              `}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                dangerouslySetInnerHTML={{ __html: tool.svg }}
              />
            </button>
          );
        })}

        <div className="w-px h-8 bg-[#dad4c8] mx-1.5 shrink-0" />

        <button
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          onClick={undo}
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shrink-0 clay-btn text-[#55534e]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          onClick={redo}
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 shrink-0 clay-btn text-[#55534e]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </nav>

      {/* Color picker */}
      <div role="group" aria-label="Color picker" className="fixed bottom-24 sm:bottom-auto sm:top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 clay-card px-3 py-2 max-w-[calc(100%-2rem)] overflow-x-auto justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {COLORS.map((color) => (
          <button
            key={color}
            title={color}
            aria-label={`Color ${color}`}
            aria-pressed={strokeColor === color}
            onClick={() => setStrokeColor(color)}
            className="relative w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full transition-transform duration-150 hover:scale-110"
            style={{ 
              backgroundColor: color,
              boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px"
            }}
          >
            {strokeColor === color && (
              <span className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-[#000000]" />
            )}
          </button>
        ))}
      </div>
    </>
  );
}
