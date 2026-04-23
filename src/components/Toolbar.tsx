"use client";

import { useCallback, useEffect, useState } from "react";
import { useCanvasStore, type ToolType } from "@/store/canvasStore";
import { usePathname } from "next/navigation";
import Link from "next/link";
import PresenceAvatars from "./PresenceAvatars";
import ShareDialog from "./ShareDialog";
import UserMenu from "./UserMenu";
import { useHydrated } from "@/lib/use-hydrated";

const TOOLS: { type: ToolType; label: string; shortcut: string; svg: string }[] = [
  {
    type: "select",
    label: "Select",
    shortcut: "V",
    svg: `<path d="M5 3l12 9-5 1 3 7-3 1-3-7-4 4z" fill="currentColor"/>`,
  },
  {
    type: "lasso",
    label: "Lasso",
    shortcut: "K",
    svg: `<path d="M4 8c0-2.2 2.5-4 5.5-4h5C18 4 20 5.8 20 8v6c0 2.2-2.2 4-5 4H9c-3 0-5-1.8-5-4V8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2" /><circle cx="7" cy="17" r="1.5" fill="currentColor"/>`,
  },
  {
    type: "pan",
    label: "Pan",
    shortcut: "H",
    svg: `<path d="M14.5 10c0-1.1-.9-2-2-2s-2 .9-2 2M10.5 9c0-1.1-.9-2-2-2s-2 .9-2 2M6.5 11c0-1.1-.9-2-2-2s-2 .9-2 2v5.5c0 3 2.5 5.5 5.5 5.5h4c3 0 5.5-2.5 5.5-5.5V12c0-1.1-.9-2-2-2s-2 .9-2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 10V5c0-1.1.9-2 2-2s2 .9 2 2v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    type: "eraser",
    label: "Eraser",
    shortcut: "E",
    svg: `<path d="M15.2 4.2a2.1 2.1 0 0 1 3 0l1.6 1.6a2.1 2.1 0 0 1 0 3l-8.8 8.8-4.4.9.9-4.4 8.7-8.9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 6L18 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
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
  const eraserSize = useCanvasStore((s) => s.eraserSize);
  const setEraserSize = useCanvasStore((s) => s.setEraserSize);
  const snapEnabled = useCanvasStore((s) => s.snapEnabled);
  const setSnapEnabled = useCanvasStore((s) => s.setSnapEnabled);
  const pressurePenEnabled = useCanvasStore((s) => s.pressurePenEnabled);
  const setPressurePenEnabled = useCanvasStore((s) => s.setPressurePenEnabled);
  const pressureEraserEnabled = useCanvasStore((s) => s.pressureEraserEnabled);
  const setPressureEraserEnabled = useCanvasStore((s) => s.setPressureEraserEnabled);
  const setCommandPaletteOpen = useCanvasStore((s) => s.setCommandPaletteOpen);
  const commentsPanelOpen = useCanvasStore((s) => s.commentsPanelOpen);
  const setCommentsPanelOpen = useCanvasStore((s) => s.setCommentsPanelOpen);
  const activePresenterId = useCanvasStore((s) => s.activePresenterId);
  const setActivePresenterId = useCanvasStore((s) => s.setActivePresenterId);
  const followPresenter = useCanvasStore((s) => s.followPresenter);
  const setFollowPresenter = useCanvasStore((s) => s.setFollowPresenter);
  const recentColors = useCanvasStore((s) => s.recentColors);
  const savedPalette = useCanvasStore((s) => s.savedPalette);
  const pushRecentColor = useCanvasStore((s) => s.pushRecentColor);
  const savePaletteColor = useCanvasStore((s) => s.savePaletteColor);
  const removePaletteColor = useCanvasStore((s) => s.removePaletteColor);
  const mentionUnreadCount = useCanvasStore((s) => s.mentionUnreadCount);
  const latestMentionElementId = useCanvasStore((s) => s.latestMentionElementId);
  const requestElementFocus = useCanvasStore((s) => s.requestElementFocus);
  const setCommentsView = useCanvasStore((s) => s.setCommentsView);
  const markMentionsRead = useCanvasStore((s) => s.markMentionsRead);
  const shareOpen = useCanvasStore((s) => s.shareDialogOpen);
  const setShareDialogOpen = useCanvasStore((s) => s.setShareDialogOpen);
  const setCheckpointsDialogOpen = useCanvasStore((s) => s.setCheckpointsDialogOpen);
  const calculatorOpen = useCanvasStore((s) => s.calculatorOpen);
  const setCalculatorOpen = useCanvasStore((s) => s.setCalculatorOpen);

  const pathname = usePathname();
  const roomMatch = pathname.match(/^\/room\/(.+)$/);
  const roomId = roomMatch?.[1] ?? null;
  const isInRoom = !!roomId;

  const [pressureCollapsed, setPressureCollapsed] = useState(true);
  const hasHydrated = useHydrated();

  const isReadOnlyUI = hasHydrated ? isReadOnly : false;
  const canJumpToMention = hasHydrated && !!latestMentionElementId;
  const mentionBadgeCount = hasHydrated ? mentionUnreadCount : 0;

  const jumpToMentions = useCallback(() => {
    setCommentsPanelOpen(true);
    setCommentsView("mentions");
    markMentionsRead();
    if (latestMentionElementId) {
      requestElementFocus(latestMentionElementId);
    }
  }, [latestMentionElementId, markMentionsRead, requestElementFocus, setCommentsPanelOpen, setCommentsView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        jumpToMentions();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jumpToMentions]);

  return (
    <>
      {/* Top-left: Back to Home (Leave Room) */}
      {isInRoom && (
        <div className="fixed top-3 left-3 sm:top-6 sm:left-6 z-50">
          <Link
            href="/"
            className="group flex items-center gap-1.5 sm:gap-2 p-2 sm:px-4 sm:py-2.5 rounded-full clay-card clay-card-dashed text-[15px] font-[500] text-[var(--color-warm-charcoal)] cursor-pointer active:scale-95 transition-all duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span className="hidden sm:inline">Back Home</span>
          </Link>
        </div>
      )}

      {/* Top-right: presence avatars + share + user menu */}
      {isInRoom && (
        <div className="fixed top-3 right-3 sm:top-6 sm:right-6 z-[80] flex items-center gap-2 sm:gap-3">
          <PresenceAvatars />

          {/* Share button */}
          {!isReadOnlyUI && (
            <button
              onClick={() => setShareDialogOpen(true)}
              className="hidden sm:flex items-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-full clay-card text-sm font-medium text-[var(--color-warm-charcoal)] cursor-pointer hover:bg-[var(--color-lemon-500)] hover:text-black hover:-translate-y-1 hover:shadow-[-4px_4px_0px_0px_var(--clay-shadow-hard)] active:translate-y-0 active:shadow-none transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="sm:w-4 sm:h-4">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <button
            suppressHydrationWarning
            type="button"
            onClick={() => {
              if (!canJumpToMention) return;
              jumpToMentions();
            }}
            aria-disabled={!canJumpToMention}
            tabIndex={canJumpToMention ? 0 : -1}
            className={`hidden sm:flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-full clay-card text-xs font-semibold text-[var(--color-warm-charcoal)] ${
              canJumpToMention ? "" : "opacity-50 pointer-events-none"
            }`}
            aria-label="Jump to latest mention"
          >
            @
            <span suppressHydrationWarning>{mentionBadgeCount > 0 ? mentionBadgeCount : 0}</span>
          </button>

          <UserMenu
            quickActions={{
              snapEnabled,
              commentsPanelOpen,
              activePresenterId,
              followPresenter,
              isInRoom,
              onToggleSnap: () => setSnapEnabled(!snapEnabled),
              onOpenCommandPalette: () => setCommandPaletteOpen(true),
              onToggleComments: () => setCommentsPanelOpen(!commentsPanelOpen),
              onTogglePresent: () => {
                const selfId =
                  (useCanvasStore.getState().liveblocks.room?.getSelf() as { id?: string } | null)?.id ??
                  null;
                setActivePresenterId(activePresenterId ? null : selfId);
              },
              onToggleFollow: () => setFollowPresenter(!followPresenter),
              onOpenCheckpoints: () => setCheckpointsDialogOpen(true),
              onToggleCalculator: () => setCalculatorOpen(!calculatorOpen),
            }}
          />
        </div>
      )}

      {/* Read-only banner */}
      {isReadOnlyUI && (
        <div className="hidden sm:block fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full clay-card clay-card-dashed text-xs font-medium text-[var(--color-warm-silver)] uppercase tracking-wider select-none">
          View only
        </div>
      )}

      {/* Main toolbar — dimmed if read-only */}
      <nav
        aria-label="Drawing tools"
        className={`fixed bottom-4 sm:bottom-auto sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 clay-card clay-toolbar px-2 py-1.5 w-[calc(100%-2rem)] sm:w-auto max-w-full overflow-x-auto no-scrollbar ${
          isReadOnlyUI ? "opacity-40" : ""
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
              disabled={isReadOnlyUI}
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

        <div className="w-px h-8 bg-[var(--border-oat)] mx-1.5 shrink-0" aria-hidden="true" />

        <button
          title="Calculator (C)"
          aria-label="Open calculator"
          aria-pressed={calculatorOpen}
          onClick={() => setCalculatorOpen(!calculatorOpen)}
          className={`flex items-center justify-center w-11 h-11 shrink-0 clay-btn ${
            calculatorOpen ? "clay-btn-active" : "text-[#55534e]"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="11" x2="8" y2="11" />
            <line x1="12" y1="11" x2="12" y2="11" />
            <line x1="16" y1="11" x2="16" y2="11" />
            <line x1="8" y1="15" x2="8" y2="15" />
            <line x1="12" y1="15" x2="12" y2="15" />
            <line x1="16" y1="15" x2="16" y2="19" />
            <line x1="12" y1="19" x2="12" y2="19" />
            <line x1="8" y1="19" x2="8" y2="19" />
          </svg>
        </button>

        <button
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          onClick={undo}
          disabled={isReadOnlyUI}
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
          disabled={isReadOnlyUI}
          className="flex items-center justify-center w-11 h-11 shrink-0 clay-btn text-[#55534e]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </nav>

      {/* Tool extras: color picker or eraser size slider */}
      {activeTool === "eraser" ? (
        <div
          role="group"
          aria-label="Eraser size"
          className={`fixed bottom-24 sm:bottom-auto sm:top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 clay-card clay-card-dashed px-3 py-2 justify-center ${
            isReadOnlyUI ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          <div className="text-[11px] font-semibold text-[var(--color-warm-silver)] uppercase tracking-widest">
            Size
          </div>
          <input
            type="range"
            min={4}
            max={40}
            step={1}
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            aria-label="Eraser size slider"
            style={{ accentColor: "var(--color-slushie-500)" }}
          />
          <div className="text-[12px] font-semibold text-[var(--color-warm-charcoal)] w-10 text-right select-none">
            {eraserSize}
          </div>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Color picker"
          className={`fixed bottom-24 sm:bottom-auto sm:top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 clay-card clay-card-dashed px-2 py-2 justify-center ${
            isReadOnlyUI ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          {COLORS.map((color) => (
            <button
              key={color}
              aria-label={`Color ${color}`}
              aria-pressed={strokeColor === color}
                onClick={() => {
                  setStrokeColor(color);
                  pushRecentColor(color);
                }}
                disabled={isReadOnlyUI}
                className="clay-color-btn flex items-center justify-center w-11 h-11 shrink-0 rounded-full"
              >
              <span
                className="clay-color-dot w-6 h-6 sm:w-7 sm:h-7 rounded-full relative"
                style={{
                  backgroundColor: color,
                  boxShadow:
                    "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
                }}
              >
                {strokeColor === color && (
                  <span className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-[#000000]" />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <section className={`hidden sm:block fixed bottom-[12.5rem] right-4 sm:bottom-[75px] sm:left-6 sm:right-auto z-50 clay-card p-2.5 w-48 text-[10px] ${pressureCollapsed ? "opacity-70" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="clay-kicker">Dynamics</div>
            <div className="font-semibold tracking-wide text-[11px]">Pressure</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-[9px] uppercase opacity-60">
              {pressurePenEnabled || pressureEraserEnabled ? "Enabled" : "Off"}
            </div>
            <button
              type="button"
              className="clay-btn px-2 py-1 text-[10px]"
              onClick={() => setPressureCollapsed((v) => !v)}
              aria-expanded={!pressureCollapsed}
              aria-label={pressureCollapsed ? "Expand pressure panel" : "Collapse pressure panel"}
            >
              {pressureCollapsed ? "Show" : "Hide"}
            </button>
          </div>
        </div>

        {!pressureCollapsed && (
          <div className="space-y-1.5">
          <button
            type="button"
            aria-pressed={pressurePenEnabled}
            disabled={isReadOnlyUI}
            onClick={() => setPressurePenEnabled(!pressurePenEnabled)}
            className={`w-full flex items-center justify-between rounded-md border px-2 py-1.5 transition ${
              pressurePenEnabled
                ? "border-[var(--color-slushie-500)] bg-[var(--surface-overlay)]"
                : "border-[var(--border-oat)] bg-[var(--surface)]"
            } ${isReadOnlyUI ? "opacity-50 cursor-not-allowed" : "hover:translate-y-[-1px]"}`}
          >
            <span className="font-medium">Pen pressure</span>
            <span
              className={`h-2 w-2 rounded-full ${
                pressurePenEnabled ? "bg-[var(--color-slushie-500)]" : "bg-[var(--color-warm-silver)]"
              }`}
            />
          </button>

          <button
            type="button"
            aria-pressed={pressureEraserEnabled}
            disabled={isReadOnlyUI}
            onClick={() => setPressureEraserEnabled(!pressureEraserEnabled)}
            className={`w-full flex items-center justify-between rounded-md border px-2 py-1.5 transition ${
              pressureEraserEnabled
                ? "border-[var(--color-slushie-500)] bg-[var(--surface-overlay)]"
                : "border-[var(--border-oat)] bg-[var(--surface)]"
            } ${isReadOnlyUI ? "opacity-50 cursor-not-allowed" : "hover:translate-y-[-1px]"}`}
          >
            <span className="font-medium">Eraser pressure</span>
            <span
              className={`h-2 w-2 rounded-full ${
                pressureEraserEnabled ? "bg-[var(--color-slushie-500)]" : "bg-[var(--color-warm-silver)]"
              }`}
            />
          </button>
          </div>
        )}
      </section>

      {(recentColors.length > 0 || savedPalette.length > 0) && (
        <div className="hidden sm:block fixed bottom-[16.5rem] sm:bottom-auto sm:top-[13.5rem] right-4 z-50 clay-card clay-card-dashed p-2 w-44 text-[10px]">
          <div className="clay-kicker mb-0.5">Quick Color</div>
          <div className="font-semibold mb-1 text-[11px]">Palette</div>
          <div className="flex flex-wrap gap-1 mb-1">
            {recentColors.map((color) => (
              <button key={`recent-${color}`} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: color }} onClick={() => setStrokeColor(color)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {savedPalette.map((color) => (
              <button key={`saved-${color}`} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: color }} onClick={() => setStrokeColor(color)} onContextMenu={(e) => { e.preventDefault(); removePaletteColor(color); }} />
            ))}
          </div>
          <button className="clay-btn mt-1 px-2 py-1 w-full" onClick={() => savePaletteColor(strokeColor)}>
            Save Current Color
          </button>
        </div>
      )}

      {/* Mobile mention shortcut */}
      <button
        suppressHydrationWarning
        type="button"
        className="sm:hidden fixed left-3 bottom-24 z-[70] clay-card clay-card-dashed rounded-full h-11 px-3 text-[11px] font-semibold"
        onClick={() => {
          if (!canJumpToMention) return;
          jumpToMentions();
        }}
        aria-disabled={!canJumpToMention}
        tabIndex={canJumpToMention ? 0 : -1}
        data-disabled={!canJumpToMention}
        style={!canJumpToMention ? { opacity: 0.5, pointerEvents: "none" } : undefined}
        aria-label="Jump to latest mention"
      >
        @<span suppressHydrationWarning>{mentionBadgeCount > 0 ? mentionBadgeCount : 0}</span>
      </button>

      {/* Share dialog */}
      {roomId && (
        <ShareDialog
          roomId={roomId}
          open={shareOpen}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </>
  );
}
