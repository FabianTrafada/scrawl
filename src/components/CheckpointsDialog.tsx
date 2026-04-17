"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { toast } from "sonner";

type CheckpointListItem = {
  id: string;
  name: string;
  createdAt: string;
  author: { id: string; name: string | null };
  version: number;
};

type CheckpointDetail = {
  checkpoint: {
    id: string;
    name: string;
    version: number;
    snapshot: {
      version: 1;
      elements: unknown[];
      camera: { x: number; y: number; zoom: number };
    };
  };
};

export default function CheckpointsDialog({ roomId }: { roomId: string }) {
  const open = useCanvasStore((s) => s.checkpointsDialogOpen);
  const setOpen = useCanvasStore((s) => s.setCheckpointsDialogOpen);
  const elements = useCanvasStore((s) => s.elements);
  const camera = useCanvasStore((s) => s.camera);
  const hydrateScene = useCanvasStore((s) => s.hydrateScene);

  const [items, setItems] = useState<CheckpointListItem[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const hasContent = useMemo(() => elements.length > 0, [elements.length]);

  const fetchCheckpoints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/checkpoints`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { checkpoints?: CheckpointListItem[] };
      setItems(data.checkpoints ?? []);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!open) return;
    void fetchCheckpoints();
  }, [fetchCheckpoints, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-label="Close checkpoints"
      />
      <section className="relative w-full max-w-lg clay-card clay-card-dashed rounded-2xl p-4 max-h-[82vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="clay-kicker">History</div>
            <div className="text-sm font-semibold">Named Checkpoints</div>
          </div>
          <button type="button" className="clay-btn px-2 py-1 text-[11px]" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>

        <div className="mb-3">
          <label className="clay-kicker block mb-1">Create checkpoint</label>
          <div className="flex gap-2">
            <input
              className="flex-1 clay-input px-3 py-2"
              placeholder="Before geometry proof"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              disabled={saving || !name.trim() || !hasContent}
              className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 disabled:opacity-50"
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch(`/api/rooms/${roomId}/checkpoints`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: name.trim(),
                      snapshot: {
                        version: 1,
                        elements,
                        camera,
                      },
                    }),
                  });
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error(body.error ?? "Failed to create checkpoint");
                    return;
                  }
                  setName("");
                  toast.success("Checkpoint created");
                  void fetchCheckpoints();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "..." : "Save"}
            </button>
          </div>
          {!hasContent && <div className="text-[10px] opacity-70 mt-1">Draw something first to save a checkpoint.</div>}
        </div>

        <div className="clay-divider mb-2" />

        <div className="flex-1 overflow-y-auto clay-scroll space-y-2 pr-1">
          {loading && <div className="text-[11px] opacity-70">Loading checkpoints...</div>}
          {!loading && items.length === 0 && (
            <div className="text-[11px] opacity-70 border border-dashed border-[var(--border-oat)] rounded-xl p-3">
              No checkpoints yet.
            </div>
          )}

          {items.map((item) => (
            <article key={item.id} className="border border-[var(--border-oat)] rounded-xl p-3 bg-[var(--surface-soft)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-semibold">{item.name}</div>
                  <div className="text-[10px] opacity-70">
                    {new Date(item.createdAt).toLocaleString()} by {item.author.name ?? "Unknown"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-2 py-1 text-[10px]"
                    disabled={restoringId === item.id}
                    onClick={async () => {
                      setRestoringId(item.id);
                      try {
                        const res = await fetch(`/api/rooms/${roomId}/checkpoints/${item.id}`, { cache: "no-store" });
                        if (!res.ok) {
                          toast.error("Failed to restore checkpoint");
                          return;
                        }
                        const data = (await res.json()) as CheckpointDetail;
                        hydrateScene({
                          elements: data.checkpoint.snapshot.elements as never,
                          camera: data.checkpoint.snapshot.camera,
                        });
                        toast.success(`Restored "${item.name}"`);
                        setOpen(false);
                      } finally {
                        setRestoringId(null);
                      }
                    }}
                  >
                    {restoringId === item.id ? "..." : "Restore"}
                  </button>
                  <button
                    type="button"
                    className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-2 py-1 text-[10px] text-red-600"
                    onClick={async () => {
                      const res = await fetch(`/api/rooms/${roomId}/checkpoints/${item.id}`, {
                        method: "DELETE",
                      });
                      if (!res.ok) {
                        toast.error("Failed to delete checkpoint");
                        return;
                      }
                      toast.success("Checkpoint deleted");
                      void fetchCheckpoints();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
