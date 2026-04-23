"use client";

import { useMemo, useState } from "react";
import { useCanvasStore, type ToolType } from "@/store/canvasStore";
import type { CanvasBackgroundMode, MathTemplateId } from "@/types/collab";
import { insertMathTemplate } from "@/lib/template-actions";

type CommandAction =
  | { kind: "tool"; id: ToolType }
  | { kind: "toggle"; id: "snap" | "comments" | "follow" | "present" }
  | { kind: "panel"; id: "share" | "layers" | "checkpoints" | "mobile-drawer" | "calculator" }
  | { kind: "background"; mode: CanvasBackgroundMode }
  | { kind: "template"; id: MathTemplateId }
  | { kind: "mentions" };

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  category: "Tool" | "Toggle" | "Panel" | "Background" | "Template" | "Collab";
  action: CommandAction;
};

const TOOL_ITEMS: CommandItem[] = [
  { id: "tool-select", label: "Select", category: "Tool", action: { kind: "tool", id: "select" } },
  { id: "tool-lasso", label: "Lasso", category: "Tool", action: { kind: "tool", id: "lasso" } },
  { id: "tool-pan", label: "Pan", category: "Tool", action: { kind: "tool", id: "pan" } },
  { id: "tool-eraser", label: "Eraser", category: "Tool", action: { kind: "tool", id: "eraser" } },
  { id: "tool-pen", label: "Pen", category: "Tool", action: { kind: "tool", id: "pen" } },
  { id: "tool-rectangle", label: "Rectangle", category: "Tool", action: { kind: "tool", id: "rectangle" } },
  { id: "tool-ellipse", label: "Ellipse", category: "Tool", action: { kind: "tool", id: "ellipse" } },
  { id: "tool-line", label: "Line", category: "Tool", action: { kind: "tool", id: "line" } },
  { id: "tool-arrow", label: "Arrow", category: "Tool", action: { kind: "tool", id: "arrow" } },
  { id: "tool-text", label: "Text / LaTeX", category: "Tool", action: { kind: "tool", id: "text" } },
];

const STATIC_ITEMS: CommandItem[] = [
  { id: "toggle-snap", label: "Toggle Snap", category: "Toggle", action: { kind: "toggle", id: "snap" } },
  { id: "toggle-comments", label: "Toggle Comments Panel", category: "Toggle", action: { kind: "toggle", id: "comments" } },
  { id: "toggle-follow", label: "Toggle Follow Presenter", category: "Toggle", action: { kind: "toggle", id: "follow" } },
  { id: "toggle-present", label: "Toggle Present Mode", category: "Toggle", action: { kind: "toggle", id: "present" } },
  { id: "panel-layers", label: "Toggle Layers Panel", category: "Panel", action: { kind: "panel", id: "layers" } },
  { id: "panel-share", label: "Open Share Dialog", category: "Panel", action: { kind: "panel", id: "share" } },
  { id: "panel-checkpoints", label: "Open Checkpoints", category: "Panel", action: { kind: "panel", id: "checkpoints" } },
  { id: "panel-mobile", label: "Open Mobile Quick Drawer", category: "Panel", action: { kind: "panel", id: "mobile-drawer" } },
  { id: "panel-calculator", label: "Open Calculator", category: "Panel", action: { kind: "panel", id: "calculator" } },
  { id: "mentions-jump", label: "Jump to Latest Mention", category: "Collab", action: { kind: "mentions" } },
  { id: "bg-plain", label: "Background: Plain", category: "Background", action: { kind: "background", mode: "plain" } },
  { id: "bg-grid", label: "Background: Grid", category: "Background", action: { kind: "background", mode: "grid" } },
  { id: "bg-dot", label: "Background: Dot", category: "Background", action: { kind: "background", mode: "dot" } },
  { id: "template-coord", label: "Template: Coordinate Plane", category: "Template", action: { kind: "template", id: "coord-plane" } },
  { id: "template-number", label: "Template: Number Line", category: "Template", action: { kind: "template", id: "number-line" } },
  { id: "template-table", label: "Template: Math Table", category: "Template", action: { kind: "template", id: "table" } },
  { id: "template-proof", label: "Template: Proof Scaffold", category: "Template", action: { kind: "template", id: "proof" } },
];

export default function CommandPalette() {
  const open = useCanvasStore((s) => s.commandPaletteOpen);
  const shortcuts = useCanvasStore((s) => s.shortcuts);
  const setOpen = useCanvasStore((s) => s.setCommandPaletteOpen);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const snapEnabled = useCanvasStore((s) => s.snapEnabled);
  const setSnapEnabled = useCanvasStore((s) => s.setSnapEnabled);
  const commentsPanelOpen = useCanvasStore((s) => s.commentsPanelOpen);
  const setCommentsPanelOpen = useCanvasStore((s) => s.setCommentsPanelOpen);
  const followPresenter = useCanvasStore((s) => s.followPresenter);
  const setFollowPresenter = useCanvasStore((s) => s.setFollowPresenter);
  const activePresenterId = useCanvasStore((s) => s.activePresenterId);
  const setActivePresenterId = useCanvasStore((s) => s.setActivePresenterId);
  const layersPanelOpen = useCanvasStore((s) => s.layersPanelOpen);
  const setLayersPanelOpen = useCanvasStore((s) => s.setLayersPanelOpen);
  const setMobileLayersPanelOpen = useCanvasStore((s) => s.setMobileLayersPanelOpen);
  const setMobileQuickDrawerOpen = useCanvasStore((s) => s.setMobileQuickDrawerOpen);
  const setShareDialogOpen = useCanvasStore((s) => s.setShareDialogOpen);
  const setCheckpointsDialogOpen = useCanvasStore((s) => s.setCheckpointsDialogOpen);
  const setCalculatorOpen = useCanvasStore((s) => s.setCalculatorOpen);
  const setCanvasBackgroundMode = useCanvasStore((s) => s.setCanvasBackgroundMode);
  const latestMentionElementId = useCanvasStore((s) => s.latestMentionElementId);
  const requestElementFocus = useCanvasStore((s) => s.requestElementFocus);
  const setCommentsView = useCanvasStore((s) => s.setCommentsView);
  const markMentionsRead = useCanvasStore((s) => s.markMentionsRead);
  const pushRecentCommand = useCanvasStore((s) => s.pushRecentCommand);
  const recentCommandIds = useCanvasStore((s) => s.recentCommandIds);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const tools = TOOL_ITEMS.map((item) => ({
      ...item,
      hint: shortcuts[item.action.kind === "tool" ? item.action.id : "select"] ?? "-",
    }));
    return [...tools, ...STATIC_ITEMS];
  }, [shortcuts]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => {
      const aRecent = recentCommandIds.includes(a.id) ? 0 : 1;
      const bRecent = recentCommandIds.includes(b.id) ? 0 : 1;
      if (aRecent !== bRecent) return aRecent - bRecent;
      return a.label.localeCompare(b.label);
    });

    if (!q) return sorted;
    return sorted.filter((item) => `${item.label} ${item.category}`.toLowerCase().includes(q));
  }, [items, query, recentCommandIds]);

  const runAction = (item: CommandItem) => {
    pushRecentCommand(item.id);

    switch (item.action.kind) {
      case "tool":
        setActiveTool(item.action.id);
        break;
      case "toggle":
        if (item.action.id === "snap") setSnapEnabled(!snapEnabled);
        if (item.action.id === "comments") setCommentsPanelOpen(!commentsPanelOpen);
        if (item.action.id === "follow") setFollowPresenter(!followPresenter);
        if (item.action.id === "present") {
          const selfId =
            (useCanvasStore.getState().liveblocks.room?.getSelf() as { id?: string } | null)?.id ??
            null;
          setActivePresenterId(activePresenterId ? null : selfId);
        }
        break;
      case "panel":
        if (item.action.id === "layers") {
          const next = !layersPanelOpen;
          setLayersPanelOpen(next);
          setMobileLayersPanelOpen(next);
        }
        if (item.action.id === "share") setShareDialogOpen(true);
        if (item.action.id === "checkpoints") setCheckpointsDialogOpen(true);
        if (item.action.id === "mobile-drawer") setMobileQuickDrawerOpen(true);
        if (item.action.id === "calculator") setCalculatorOpen(true);
        break;
      case "background":
        setCanvasBackgroundMode(item.action.mode);
        break;
      case "template":
        insertMathTemplate(item.action.id);
        break;
      case "mentions":
        setCommentsPanelOpen(true);
        setCommentsView("mentions");
        markMentionsRead();
        if (latestMentionElementId) requestElementFocus(latestMentionElementId);
        break;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-[3px] flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
      <div className="clay-card clay-card-dashed w-[560px] max-w-[92vw] p-3" onClick={(e) => e.stopPropagation()}>
        <div className="clay-kicker mb-0.5">Navigator</div>
        <div className="text-sm font-semibold mb-2">Command Palette</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools and actions..."
          className="w-full clay-input px-3 py-2 mb-2 text-[13px]"
          aria-label="Filter command list"
        />
        <div className="max-h-[420px] overflow-auto space-y-1 clay-scroll">
          {filteredItems.length === 0 && (
            <div className="px-3 py-2 text-[12px] text-[var(--color-warm-silver)]">
              No matching commands.
            </div>
          )}
          {filteredItems.map((item) => (
            <button
              key={item.id}
              className="w-full clay-btn clay-btn-ux text-left px-3 py-2 flex items-center justify-between border border-[var(--border-oat)]"
              onClick={() => {
                runAction(item);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="flex items-center gap-2">
                <span>{item.label}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60">{item.category}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider opacity-70">{item.hint ?? ""}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
