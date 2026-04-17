"use client";

import { useMemo, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { useHydrated } from "@/lib/use-hydrated";

export default function LayersPanel() {
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const layersPanelOpen = useCanvasStore((s) => s.layersPanelOpen);
  const mobileLayersPanelOpen = useCanvasStore((s) => s.mobileLayersPanelOpen);
  const setLayersPanelOpen = useCanvasStore((s) => s.setLayersPanelOpen);
  const setMobileLayersPanelOpen = useCanvasStore((s) => s.setMobileLayersPanelOpen);
  const reorderElements = useCanvasStore((s) => s.reorderElements);
  const setElementsLocked = useCanvasStore((s) => s.setElementsLocked);
  const setElementsHidden = useCanvasStore((s) => s.setElementsHidden);
  const groupElements = useCanvasStore((s) => s.groupElements);
  const ungroupElements = useCanvasStore((s) => s.ungroupElements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const [collapsed, setCollapsed] = useState(false);
  const hasHydrated = useHydrated();

  const selected = useMemo(
    () => elements.filter((el) => selectedElementIds.includes(el.id)),
    [elements, selectedElementIds]
  );

  const canUngroup =
    selected.length > 0 &&
    selected.every((el) => el.groupId) &&
    new Set(selected.map((el) => el.groupId)).size === 1;

  const primary = selected.length === 1 ? selected[0] : null;
  const selectedCountUI = hasHydrated ? selected.length : 0;
  const primaryUI = hasHydrated ? primary : null;
  const canUngroupUI = hasHydrated ? canUngroup : false;
  const selectedElementIdsUI = hasHydrated ? selectedElementIds : [];

  const body = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="clay-kicker">Structure</div>
          <div className="font-semibold">Layers</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="clay-btn clay-btn-ux px-2 py-1 text-[10px]"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand layers panel" : "Collapse layers panel"}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
          <button
            type="button"
            className="sm:hidden clay-btn clay-btn-ux px-2 py-1 text-[10px]"
            onClick={() => setMobileLayersPanelOpen(false)}
            aria-label="Close mobile layers panel"
          >
            Close
          </button>
          <button
            type="button"
            className="hidden sm:inline clay-btn clay-btn-ux px-2 py-1 text-[10px]"
            onClick={() => setLayersPanelOpen(false)}
            aria-label="Close layers panel"
          >
            Off
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="mb-2 clay-chip">
            Selected: {selectedCountUI}
          </div>
          <div className="flex gap-2 mb-2">
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => reorderElements(selectedElementIdsUI, "front")}>
              Bring Front
            </button>
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => reorderElements(selectedElementIdsUI, "back")}>
              Send Back
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => setElementsLocked(selectedElementIdsUI, true)}>
              Lock
            </button>
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => setElementsLocked(selectedElementIdsUI, false)}>
              Unlock
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => setElementsHidden(selectedElementIdsUI, true)}>
              Hide
            </button>
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => setElementsHidden(selectedElementIdsUI, false)}>
              Show
            </button>
          </div>
          <div className="flex gap-2 pb-2 border-b border-dashed border-[var(--border-oat)]">
            <button className="clay-btn clay-btn-ux px-2 py-1 border border-[var(--border-oat)]" onClick={() => groupElements(selectedElementIdsUI)}>
              Group
            </button>
            <button
              className="clay-btn clay-btn-ux px-2 py-1 disabled:opacity-50 border border-[var(--border-oat)]"
              disabled={!canUngroupUI}
              onClick={() => {
                const gid = primaryUI?.groupId;
                if (gid) ungroupElements(gid);
              }}
            >
              Ungroup
            </button>
          </div>
          <div className="mt-2 space-y-1">
            <input
              disabled={!primaryUI}
              defaultValue={primaryUI?.label ?? ""}
              placeholder="Element label"
              className="w-full clay-input px-2 py-1"
              onBlur={(e) => {
                if (!primaryUI) return;
                updateElement(primaryUI.id, { label: e.target.value });
              }}
            />
            <input
              disabled={!primaryUI}
              defaultValue={(primaryUI?.tags ?? []).join(", ")}
              placeholder="Tags (comma separated)"
              className="w-full clay-input px-2 py-1"
              onBlur={(e) => {
                if (!primaryUI) return;
                updateElement(primaryUI.id, {
                  tags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                });
              }}
            />
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {layersPanelOpen && (
        <div className={`hidden sm:block fixed left-4 top-24 z-50 clay-card clay-card-dashed p-3 text-xs text-[var(--color-warm-charcoal)] ${collapsed ? "w-36" : "w-64"}`}>
          {body}
        </div>
      )}
      {mobileLayersPanelOpen && (
        <div className={`sm:hidden fixed left-3 right-3 top-[6.3rem] z-[90] clay-card clay-card-dashed p-3 text-xs text-[var(--color-warm-charcoal)] ${collapsed ? "h-auto" : "max-h-[72vh] overflow-y-auto clay-scroll"}`}>
          {body}
        </div>
      )}
    </>
  );
}
