"use client";

import { useState } from "react";
import { useCanvasStore, type ToolType } from "@/store/canvasStore";
import { usePathname } from "next/navigation";
import Link from "next/link";
import PresenceAvatars from "./PresenceAvatars";
import ShareDialog from "./ShareDialog";
import UserMenu from "./UserMenu";

const TOOLS: { type: ToolType; label: string; shortcut: string; svg: string }[] = [
  {
    type: "select",
    label: "Select",
    shortcut: "V",
    svg: `<path d="M5 3l12 9-5 1 3 7-3 1-3-7-4 4z" fill="currentColor"/>`,
  },
  {
    type: "pan",
    label: "Pan",
    shortcut: "H",
    svg: `<path d="M14.5 10c0-1.1-.9-2-2-2s-2 .9-2 2M10.5 9c0-1.1-.9-2-2-2s-2 .9-2 2M6.5 11c0-1.1-.9-2-2-2s-2 .9-2 2v5.5c0 3 2.5 5.5 5.5 5.5h4c3 0 5.5-2.5 5.5-5.5V12c0-1.1-.9-2-2-2s-2 .9-2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 10V5c0-1.1.9-2 2-2s2 .9 2 2v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
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
  const isReadOnly = useCanvasStore((s) => s.isReadOnly);

  const pathname = usePathname();
  const roomMatch = pathname.match(/^\/room\/(.+)$/);
  const roomId = roomMatch?.[1] ?? null;
  const isInRoom = !!roomId;

  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      {/* Top-left: Back to Home (Leave Room) */}
      {isInRoom && (
        <div className="fixed top-3 left-3 sm:top-6 sm:left-6 z-50">
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 p-2 sm:px-4 sm:py-2.5 rounded-full clay-card text-[15px] font-[500] text-[var(--color-warm-charcoal)] cursor-pointer hover:bg-[var(--border-oat-light)] active:scale-95 transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      )}

      {/* Top-right: presence avatars + share + user menu */}
      {isInRoom && (
        <div className="fixed top-3 right-3 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
          <PresenceAvatars />

          {/* Share button */}
          {!isReadOnly && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-full clay-card text-sm font-medium text-[var(--color-warm-charcoal)] cursor-pointer hover:bg-[var(--color-slushie-500)] hover:text-white hover:-translate-y-1 hover:shadow-[-4px_4px_0px_0px_#000] active:translate-y-0 active:shadow-none transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="sm:w-4 sm:h-4">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <UserMenu />
        </div>
      )}

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full clay-card text-xs font-medium text-[var(--color-warm-silver)] uppercase tracking-wider select-none">
          View only
        </div>
      )}

      {/* Main toolbar — dimmed if read-only */}
      <nav
        aria-label="Drawing tools"
        className={`fixed bottom-4 sm:bottom-auto sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 clay-card clay-toolbar px-2 py-1.5 w-[calc(100%-2rem)] sm:w-auto max-w-full overflow-x-auto no-scrollbar ${
          isReadOnly ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={`${tool.label} tool`}
              aria-pressed={isActive}
              onClick={() => setActiveTool(tool.type)}
              disabled={isReadOnly}
              className={`
                relative flex items-center justify-center w-11 h-11 shrink-0 clay-btn
                ${isActive ? "clay-btn-active" : "text-[#55534e]"}
              `}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: tool.svg }}
              />
            </button>
          );
        })}

        <div className="w-px h-8 bg-[#dad4c8] mx-1.5 shrink-0" aria-hidden="true" />

        <button
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          onClick={undo}
          disabled={isReadOnly}
          className="flex items-center justify-center w-11 h-11 shrink-0 clay-btn text-[#55534e]"
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
          disabled={isReadOnly}
          className="flex items-center justify-center w-11 h-11 shrink-0 clay-btn text-[#55534e]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </nav>

      {/* Color picker — dimmed if read-only */}
      <div
        role="group"
        aria-label="Color picker"
        className={`fixed bottom-24 sm:bottom-auto sm:top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 clay-card px-2 py-2 justify-center ${
          isReadOnly ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {COLORS.map((color) => (
          <button
            key={color}
            aria-label={`Color ${color}`}
            aria-pressed={strokeColor === color}
            onClick={() => setStrokeColor(color)}
            disabled={isReadOnly}
            className="clay-color-btn flex items-center justify-center w-11 h-11 shrink-0 rounded-full"
          >
            <span
              className="clay-color-dot w-6 h-6 sm:w-7 sm:h-7 rounded-full relative"
              style={{
                backgroundColor: color,
                boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
              }}
            >
              {strokeColor === color && (
                <span className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-[#000000]" />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Share dialog */}
      {roomId && (
        <ShareDialog
          roomId={roomId}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}
