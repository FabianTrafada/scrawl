"use client";

import { useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";

const ACTIONS = ["select", "lasso", "pan", "eraser", "pen", "rectangle", "ellipse", "line", "arrow", "text"];

export default function ShortcutSettings() {
  const shortcuts = useCanvasStore((s) => s.shortcuts);
  const setShortcut = useCanvasStore((s) => s.setShortcut);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="fixed right-4 top-24 z-50 clay-card p-3 w-64 text-xs text-[var(--color-warm-charcoal)]">
      <div className="font-semibold mb-2">Shortcuts</div>
      <div className="space-y-1 max-h-52 overflow-auto">
        {ACTIONS.map((action) => (
          <button
            key={action}
            className="w-full clay-btn px-2 py-1 flex items-center justify-between"
            onClick={() => setEditing(action)}
          >
            <span className="capitalize">{action}</span>
            <span className="uppercase">{editing === action ? "press key" : shortcuts[action]}</span>
          </button>
        ))}
      </div>
      {editing && (
        <input
          autoFocus
          className="mt-2 w-full clay-input px-2 py-1"
          placeholder="Type a key"
          onKeyDown={(e) => {
            e.preventDefault();
            if (e.key.length === 1) {
              setShortcut(editing, e.key);
              setEditing(null);
            }
            if (e.key === "Escape") setEditing(null);
          }}
        />
      )}
    </div>
  );
}
