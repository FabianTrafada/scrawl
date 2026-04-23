"use client";

import { useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { insertMathTemplate } from "@/lib/template-actions";
import type { CanvasBackgroundMode, MathTemplateId } from "@/types/collab";

const BACKGROUND_MODES: { mode: CanvasBackgroundMode; label: string }[] = [
  { mode: "plain", label: "Plain" },
  { mode: "grid", label: "Grid" },
  { mode: "dot", label: "Dot" },
];

const TEMPLATE_ITEMS: { id: MathTemplateId; label: string }[] = [
  { id: "coord-plane", label: "Coordinate Plane" },
  { id: "number-line", label: "Number Line" },
  { id: "table", label: "Math Table" },
  { id: "proof", label: "Proof Scaffold" },
];

export default function MobileQuickDrawer({ roomId }: { roomId: string }) {
  const isReadOnly = useCanvasStore((s) => s.isReadOnly);
  const open = useCanvasStore((s) => s.mobileQuickDrawerOpen);
  const setOpen = useCanvasStore((s) => s.setMobileQuickDrawerOpen);
  const commentsPanelOpen = useCanvasStore((s) => s.commentsPanelOpen);
  const setCommentsPanelOpen = useCanvasStore((s) => s.setCommentsPanelOpen);
  const layersPanelOpen = useCanvasStore((s) => s.layersPanelOpen);
  const setLayersPanelOpen = useCanvasStore((s) => s.setLayersPanelOpen);
  const mobileLayersPanelOpen = useCanvasStore((s) => s.mobileLayersPanelOpen);
  const setMobileLayersPanelOpen = useCanvasStore((s) => s.setMobileLayersPanelOpen);
  const pressurePenEnabled = useCanvasStore((s) => s.pressurePenEnabled);
  const setPressurePenEnabled = useCanvasStore((s) => s.setPressurePenEnabled);
  const pressureEraserEnabled = useCanvasStore((s) => s.pressureEraserEnabled);
  const setPressureEraserEnabled = useCanvasStore((s) => s.setPressureEraserEnabled);
  const canvasBackgroundMode = useCanvasStore((s) => s.canvasBackgroundMode);
  const setCanvasBackgroundMode = useCanvasStore((s) => s.setCanvasBackgroundMode);
  const mentionUnreadCount = useCanvasStore((s) => s.mentionUnreadCount);
  const latestMentionElementId = useCanvasStore((s) => s.latestMentionElementId);
  const markMentionsRead = useCanvasStore((s) => s.markMentionsRead);
  const requestElementFocus = useCanvasStore((s) => s.requestElementFocus);
  const setShareDialogOpen = useCanvasStore((s) => s.setShareDialogOpen);
  const setCheckpointsDialogOpen = useCanvasStore((s) => s.setCheckpointsDialogOpen);
  const setCalculatorOpen = useCanvasStore((s) => s.setCalculatorOpen);

  const [templatesOpen, setTemplatesOpen] = useState(false);

  const openMentions = () => {
    setCommentsPanelOpen(true);
    useCanvasStore.getState().setCommentsView("mentions");
    markMentionsRead();
    if (latestMentionElementId) {
      requestElementFocus(latestMentionElementId);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden fixed right-3 bottom-24 z-[70] clay-card clay-card-dashed rounded-full h-11 px-4 text-[12px] font-semibold flex items-center gap-2"
        aria-label="Open quick actions"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
        Quick
        {mentionUnreadCount > 0 && (
          <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-[var(--color-pomegranate-400)] text-[10px] text-white">
            {mentionUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="sm:hidden fixed inset-0 z-[95]">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Close quick actions"
          />

          <section className="absolute left-0 right-0 bottom-0 clay-mobile-sheet clay-card p-4 max-h-[74vh] overflow-y-auto clay-scroll">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="clay-kicker">Mobile Utility</div>
                <div className="text-sm font-semibold">Quick Actions</div>
              </div>
              <button type="button" className="clay-btn px-2 py-1 text-[11px]" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${commentsPanelOpen ? "clay-btn-active" : ""}`}
                onClick={() => setCommentsPanelOpen(!commentsPanelOpen)}
              >
                Comments
              </button>
              <button
                type="button"
                className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${layersPanelOpen || mobileLayersPanelOpen ? "clay-btn-active" : ""}`}
                onClick={() => {
                  const next = !(layersPanelOpen || mobileLayersPanelOpen);
                  setLayersPanelOpen(next);
                  setMobileLayersPanelOpen(next);
                }}
              >
                Layers
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left"
                  onClick={() => {
                    setShareDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  Share
                </button>
              )}
              <button
                type="button"
                className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left"
                onClick={() => {
                  setCheckpointsDialogOpen(true);
                  setOpen(false);
                }}
              >
                Checkpoints
              </button>
              <button
                type="button"
                className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left"
                onClick={() => {
                  setCalculatorOpen(true);
                  setOpen(false);
                }}
              >
                Calculator
              </button>
            </div>

            <div className="mb-3">
              <div className="clay-kicker mb-1">Mentions</div>
              <button
                type="button"
                className="w-full clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left flex items-center justify-between"
                onClick={openMentions}
              >
                <span>Jump to latest mention</span>
                {mentionUnreadCount > 0 && (
                  <span className="inline-flex min-w-6 h-6 px-1 items-center justify-center rounded-full bg-[var(--color-pomegranate-400)] text-[10px] text-white">
                    {mentionUnreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="mb-3">
              <div className="clay-kicker mb-1">Background</div>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_MODES.map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-2 py-2 text-[11px] ${canvasBackgroundMode === item.mode ? "clay-btn-active" : ""}`}
                    onClick={() => setCanvasBackgroundMode(item.mode)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="clay-kicker mb-1">Pressure</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${pressurePenEnabled ? "clay-btn-active" : ""}`}
                  onClick={() => setPressurePenEnabled(!pressurePenEnabled)}
                >
                  Pen {pressurePenEnabled ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${pressureEraserEnabled ? "clay-btn-active" : ""}`}
                  onClick={() => setPressureEraserEnabled(!pressureEraserEnabled)}
                >
                  Eraser {pressureEraserEnabled ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="w-full clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left"
                onClick={() => setTemplatesOpen((prev) => !prev)}
                aria-expanded={templatesOpen}
              >
                {templatesOpen ? "Hide" : "Show"} Math Templates
              </button>
              {templatesOpen && (
                <div className="mt-2 grid gap-2">
                  {TEMPLATE_ITEMS.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left"
                      onClick={() => {
                        insertMathTemplate(template.id);
                        setOpen(false);
                      }}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 text-[10px] opacity-70">Room: {roomId.slice(0, 8)}...</div>
          </section>
        </div>
      )}
    </>
  );
}
