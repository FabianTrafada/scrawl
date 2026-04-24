"use client";

import { useMemo, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import {
  DEFAULT_EXPORT_SETTINGS,
  type ExportFormat,
  type ExportPageFrame,
  type ExportSettings,
} from "@/lib/export/types";
import { createInitialManualFrame } from "@/lib/export/pagination";
import { getContentBounds } from "@/lib/export/geometry";
import { generateId } from "@/lib/utils";

type Props = {
  roomId?: string;
};

const FORMAT_OPTIONS: { id: ExportFormat; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "svg", label: "SVG" },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function ExportDialog({ roomId }: Props) {
  const open = useCanvasStore((s) => s.exportDialogOpen);
  const setOpen = useCanvasStore((s) => s.setExportDialogOpen);
  const elements = useCanvasStore((s) => s.elements);
  const camera = useCanvasStore((s) => s.camera);
  const viewport = useCanvasStore((s) => s.viewportSize);
  const requestCanvasExport = useCanvasStore((s) => s.requestCanvasExport);

  const [settings, setSettings] = useState<ExportSettings>({
    ...DEFAULT_EXPORT_SETTINGS,
    manualFrames: [...DEFAULT_EXPORT_SETTINGS.manualFrames],
  });
  const [manualEditorOpen, setManualEditorOpen] = useState(false);

  const contentBounds = useMemo(() => getContentBounds(elements), [elements]);
  const viewportRect = useMemo(
    () => ({
      x: -camera.x / camera.zoom,
      y: -camera.y / camera.zoom,
      w: Math.max(1, viewport.width / camera.zoom),
      h: Math.max(1, viewport.height / camera.zoom),
    }),
    [camera, viewport]
  );

  const pagesEstimate = useMemo(() => {
    if (settings.format !== "pdf") return "-";
    if (settings.pdfMode === "manual") return `${settings.manualFrames.length}`;
    const base = settings.scope === "content" ? contentBounds ?? viewportRect : viewportRect;
    const baseW = Math.max(1, base.w);
    const baseH = Math.max(1, base.h);
    const scale = Math.max(10, settings.scalePercent) / 100;
    const pageW = (settings.orientation === "portrait" ? 210 : 297) - settings.marginMm * 2;
    const pageH = (settings.orientation === "portrait" ? 297 : 210) - settings.marginMm * 2;
    const tileW = Math.max(1, pageW / scale);
    const tileH = Math.max(1, pageH / scale);
    const cols = Math.max(1, Math.ceil(baseW / tileW));
    const rows = Math.max(1, Math.ceil(baseH / tileH));
    return `${cols * rows}`;
  }, [settings, contentBounds, viewportRect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-3">
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-label="Close export dialog"
      />

      <section className="relative w-full max-w-xl clay-card clay-card-dashed rounded-2xl p-4 max-h-[88vh] overflow-y-auto clay-scroll">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="clay-kicker">Export</div>
            <div className="text-sm font-semibold">Canvas Export</div>
          </div>
          <button type="button" className="clay-btn px-2 py-1 text-[11px]" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {FORMAT_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-2 py-2 text-[12px] ${settings.format === item.id ? "clay-btn-active" : ""}`}
              onClick={() => setSettings((prev) => ({ ...prev, format: item.id }))}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <div className="clay-kicker mb-1">Scope</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${settings.scope === "content" ? "clay-btn-active" : ""}`}
              onClick={() => setSettings((prev) => ({ ...prev, scope: "content" }))}
            >
              Full content
            </button>
            <button
              type="button"
              className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${settings.scope === "viewport" ? "clay-btn-active" : ""}`}
              onClick={() => setSettings((prev) => ({ ...prev, scope: "viewport" }))}
            >
              Current viewport
            </button>
          </div>
        </div>

        {settings.format === "pdf" && (
          <>
            <div className="mb-3">
              <div className="clay-kicker mb-1">PDF Mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${settings.pdfMode === "auto" ? "clay-btn-active" : ""}`}
                  onClick={() => setSettings((prev) => ({ ...prev, pdfMode: "auto" }))}
                >
                  Auto paginate
                </button>
                <button
                  type="button"
                  className={`clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-left ${settings.pdfMode === "manual" ? "clay-btn-active" : ""}`}
                  onClick={() => setSettings((prev) => ({ ...prev, pdfMode: "manual" }))}
                >
                  Manual layout
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-[11px]">
                <span className="clay-kicker mb-1 block">Orientation</span>
                <select
                  className="w-full clay-input px-2 py-2 text-[12px]"
                  value={settings.orientation}
                  onChange={(e) => {
                    const orientation = e.target.value as "portrait" | "landscape";
                    const baseBounds = contentBounds ?? viewportRect;
                    setSettings((prev) => {
                      const nextBase = createInitialManualFrame(baseBounds, {
                        orientation,
                        marginMm: prev.marginMm,
                        scalePercent: prev.scalePercent,
                      });
                      const nextFrames = prev.manualFrames.map((frame) => ({
                        ...frame,
                        width: nextBase.width,
                        height: nextBase.height,
                      }));
                      return { ...prev, orientation, manualFrames: nextFrames };
                    });
                  }}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label className="text-[11px]">
                <span className="clay-kicker mb-1 block">DPI</span>
                <select
                  className="w-full clay-input px-2 py-2 text-[12px]"
                  value={settings.dpi}
                  onChange={(e) => setSettings((prev) => ({ ...prev, dpi: Number(e.target.value) as 150 | 300 | 600 }))}
                >
                  <option value={150}>150</option>
                  <option value={300}>300</option>
                  <option value={600}>600</option>
                </select>
              </label>
              <label className="text-[11px]">
                <span className="clay-kicker mb-1 block">Margin (mm)</span>
                <input
                  type="number"
                  className="w-full clay-input px-2 py-2 text-[12px]"
                  value={settings.marginMm}
                  min={0}
                  max={40}
                  onChange={(e) => {
                    const marginMm = clamp(Number(e.target.value) || 0, 0, 40);
                    const baseBounds = contentBounds ?? viewportRect;
                    setSettings((prev) => {
                      const nextBase = createInitialManualFrame(baseBounds, {
                        orientation: prev.orientation,
                        marginMm,
                        scalePercent: prev.scalePercent,
                      });
                      const nextFrames = prev.manualFrames.map((frame) => ({
                        ...frame,
                        width: nextBase.width,
                        height: nextBase.height,
                      }));
                      return { ...prev, marginMm, manualFrames: nextFrames };
                    });
                  }}
                />
              </label>
              <label className="text-[11px]">
                <span className="clay-kicker mb-1 block">Scale (%)</span>
                <input
                  type="number"
                  className="w-full clay-input px-2 py-2 text-[12px]"
                  value={settings.scalePercent}
                  min={40}
                  max={300}
                  onChange={(e) => {
                    const scalePercent = clamp(Number(e.target.value) || 100, 40, 300);
                    const baseBounds = contentBounds ?? viewportRect;
                    setSettings((prev) => {
                      const nextBase = createInitialManualFrame(baseBounds, {
                        orientation: prev.orientation,
                        marginMm: prev.marginMm,
                        scalePercent,
                      });
                      const nextFrames = prev.manualFrames.map((frame) => ({
                        ...frame,
                        width: nextBase.width,
                        height: nextBase.height,
                      }));
                      return { ...prev, scalePercent, manualFrames: nextFrames };
                    });
                  }}
                />
              </label>
            </div>

            {settings.pdfMode === "manual" && (
              <div className="mb-3 border border-[var(--border-oat)] rounded-xl p-2 bg-[var(--surface-soft)]">
                <div className="text-[11px] flex items-center justify-between gap-2">
                  <span>Manual pages: {settings.manualFrames.length}</span>
                  <button
                    type="button"
                    className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-2 py-1 text-[11px]"
                    onClick={() => setManualEditorOpen(true)}
                  >
                    Edit layout
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {settings.format !== "pdf" && (
          <div className="mb-3">
            <div className="clay-kicker mb-1">Raster scale</div>
            <input
              type="range"
              min={1}
              max={6}
              step={0.5}
              value={settings.rasterScale}
              onChange={(e) => setSettings((prev) => ({ ...prev, rasterScale: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="text-[10px] opacity-70">Scale: {settings.rasterScale.toFixed(1)}x</div>
          </div>
        )}

        <label className="flex items-center gap-2 mb-4 text-[12px]">
          <input
            type="checkbox"
            checked={settings.includeBackground}
            onChange={(e) => setSettings((prev) => ({ ...prev, includeBackground: e.target.checked }))}
          />
          Include canvas background
        </label>

        <div className="text-[11px] opacity-70 mb-3">
          {settings.format === "pdf" ? `Estimated pages: ${pagesEstimate}` : "Single file export"}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="clay-btn px-3 py-2 text-[12px] border border-[var(--border-oat)]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-[12px]"
            onClick={() => {
              const baseBounds = contentBounds ?? viewportRect;
              const normalizedSettings =
                settings.format === "pdf" && settings.pdfMode === "manual" && settings.manualFrames.length === 0
                  ? {
                      ...settings,
                      manualFrames: [
                        createInitialManualFrame(baseBounds, {
                          orientation: settings.orientation,
                          marginMm: settings.marginMm,
                          scalePercent: settings.scalePercent,
                        }),
                      ],
                    }
                  : settings;

              requestCanvasExport({ settings: normalizedSettings, roomId });
              setOpen(false);
            }}
          >
            Export
          </button>
        </div>
      </section>

      {manualEditorOpen && (
        <ManualLayoutEditor
          settings={settings}
          onClose={() => setManualEditorOpen(false)}
          onApply={(frames) => setSettings((prev) => ({ ...prev, manualFrames: frames }))}
          contentBounds={contentBounds ?? viewportRect}
        />
      )}
    </div>
  );
}

function ManualLayoutEditor({
  settings,
  contentBounds,
  onClose,
  onApply,
}: {
  settings: ExportSettings;
  contentBounds: { x: number; y: number; w: number; h: number };
  onClose: () => void;
  onApply: (frames: ExportPageFrame[]) => void;
}) {
  const baseFrame = useMemo(() => {
    return createInitialManualFrame(contentBounds, {
      orientation: settings.orientation,
      marginMm: settings.marginMm,
      scalePercent: settings.scalePercent,
    });
  }, [contentBounds, settings.orientation, settings.marginMm, settings.scalePercent]);

  const [frames, setFrames] = useState<ExportPageFrame[]>(() => {
    if (settings.manualFrames.length > 0) return settings.manualFrames;
    return [{ ...baseFrame, id: generateId() }];
  });
  const [selectedId, setSelectedId] = useState<string | null>(
    () => settings.manualFrames[0]?.id ?? null
  );
  const [dragging, setDragging] = useState<{
    id: string;
    startPointerX: number;
    startPointerY: number;
    startFrameX: number;
    startFrameY: number;
  } | null>(null);

  const selected = frames.find((frame) => frame.id === selectedId) ?? frames[0] ?? null;

  const previewBounds = useMemo(
    () => computePreviewBounds(contentBounds, frames),
    [contentBounds, frames]
  );

  const toPreviewWorldPoint = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { x: 0, y: 0 };
    }
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    return {
      x: previewBounds.x + nx * previewBounds.w,
      y: previewBounds.y + ny * previewBounds.h,
    };
  };

  const moveSelectedFrame = (direction: "up" | "down") => {
    if (!selected) return;
    const index = frames.findIndex((frame) => frame.id === selected.id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= frames.length) return;
    const next = [...frames];
    [next[index], next[target]] = [next[target], next[index]];
    setFrames(next);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-3">
      <button type="button" className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Close manual layout" />
      <section className="relative w-full max-w-2xl clay-card rounded-2xl p-4 max-h-[88vh] overflow-y-auto clay-scroll">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="clay-kicker">Manual PDF</div>
            <div className="text-sm font-semibold">Session Layout Editor</div>
          </div>
          <button type="button" className="clay-btn px-2 py-1 text-[11px]" onClick={onClose}>Close</button>
        </div>

        <div className="mb-3 border border-[var(--border-oat)] rounded-xl bg-[var(--surface-soft)] p-2">
          <div className="text-[11px] mb-2 opacity-80">Drag frame di preview untuk atur halaman A4.</div>
          <svg
            viewBox={`${previewBounds.x} ${previewBounds.y} ${previewBounds.w} ${previewBounds.h}`}
            className="w-full h-[260px] rounded-lg bg-[var(--background)] border border-[var(--border-oat)]"
            onPointerMove={(event) => {
              if (!dragging) return;
              const point = toPreviewWorldPoint(event.currentTarget, event.clientX, event.clientY);
              const dx = point.x - dragging.startPointerX;
              const dy = point.y - dragging.startPointerY;
              setFrames((prev) =>
                prev.map((frame) =>
                  frame.id === dragging.id
                    ? {
                        ...frame,
                        x: dragging.startFrameX + dx,
                        y: dragging.startFrameY + dy,
                      }
                    : frame
                )
              );
            }}
            onPointerLeave={() => setDragging(null)}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
          >
            <rect
              x={contentBounds.x}
              y={contentBounds.y}
              width={contentBounds.w}
              height={contentBounds.h}
              fill="transparent"
              stroke="var(--border-oat)"
              strokeDasharray="8,6"
            />

            {frames.map((frame, index) => {
              const isSelected = selected?.id === frame.id;
              return (
                <g key={frame.id}>
                  <rect
                    x={frame.x}
                    y={frame.y}
                    width={frame.width}
                    height={frame.height}
                    fill={isSelected ? "rgba(59, 211, 253, 0.15)" : "rgba(59, 211, 253, 0.08)"}
                    stroke={isSelected ? "var(--color-slushie-500)" : "var(--border-oat)"}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isSelected ? "10,6" : "6,4"}
                    style={{ cursor: "move" }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const svg = event.currentTarget.ownerSVGElement;
                      if (!svg) return;
                      const point = toPreviewWorldPoint(svg, event.clientX, event.clientY);
                      setSelectedId(frame.id);
                      setDragging({
                        id: frame.id,
                        startPointerX: point.x,
                        startPointerY: point.y,
                        startFrameX: frame.x,
                        startFrameY: frame.y,
                      });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                  />
                  <text
                    x={frame.x + 12}
                    y={frame.y + 18}
                    fontSize={14}
                    fontWeight={700}
                    fill="var(--color-warm-charcoal)"
                    pointerEvents="none"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grid gap-2 mb-3">
          {frames.map((frame, index) => (
            <div
              key={frame.id}
              className={`flex items-center gap-2 border rounded-xl px-2 py-2 ${selected?.id === frame.id ? "border-[var(--color-slushie-500)]" : "border-[var(--border-oat)]"}`}
            >
              <button
                type="button"
                className="flex-1 text-left clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2"
                onClick={() => setSelectedId(frame.id)}
              >
                Page {index + 1}: x {frame.x.toFixed(0)}, y {frame.y.toFixed(0)}, w {frame.width.toFixed(0)}, h {frame.height.toFixed(0)}
              </button>
              <button
                type="button"
                className="clay-btn px-2 py-1 text-[11px]"
                onClick={() => {
                  setSelectedId(frame.id);
                  moveSelectedFrame("up");
                }}
                disabled={index === 0}
                aria-label={`Move page ${index + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className="clay-btn px-2 py-1 text-[11px]"
                onClick={() => {
                  setSelectedId(frame.id);
                  moveSelectedFrame("down");
                }}
                disabled={index === frames.length - 1}
                aria-label={`Move page ${index + 1} down`}
              >
                ↓
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-[12px]"
            onClick={() => {
              const next: ExportPageFrame = {
                id: generateId(),
                x: (selected?.x ?? baseFrame.x) + 40,
                y: (selected?.y ?? baseFrame.y) + 40,
                width: selected?.width ?? baseFrame.width,
                height: selected?.height ?? baseFrame.height,
              };
              setFrames((prev) => [...prev, next]);
              setSelectedId(next.id);
            }}
          >
            Add page
          </button>
          <button
            type="button"
            className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-[12px]"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              const next = { ...selected, id: generateId(), x: selected.x + 20, y: selected.y + 20 };
              setFrames((prev) => [...prev, next]);
              setSelectedId(next.id);
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-[12px] text-red-600"
            disabled={!selected || frames.length <= 1}
            onClick={() => {
              if (!selected) return;
              const next = frames.filter((item) => item.id !== selected.id);
              setFrames(next);
              setSelectedId(next[0]?.id ?? null);
            }}
          >
            Delete
          </button>
        </div>

        {selected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <Field
              label="X"
              value={selected.x}
              onChange={(value) => setFrames((prev) => prev.map((item) => item.id === selected.id ? { ...item, x: value } : item))}
            />
            <Field
              label="Y"
              value={selected.y}
              onChange={(value) => setFrames((prev) => prev.map((item) => item.id === selected.id ? { ...item, y: value } : item))}
            />
            <Field
              label="Width"
              value={selected.width}
              onChange={(value) => setFrames((prev) => prev.map((item) => item.id === selected.id ? { ...item, width: Math.max(1, value) } : item))}
            />
            <Field
              label="Height"
              value={selected.height}
              onChange={(value) => setFrames((prev) => prev.map((item) => item.id === selected.id ? { ...item, height: Math.max(1, value) } : item))}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="clay-btn px-3 py-2 text-[12px] border border-[var(--border-oat)]" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="clay-btn clay-btn-ux border border-[var(--border-oat)] px-3 py-2 text-[12px]"
            onClick={() => {
              onApply(frames);
              onClose();
            }}
          >
            Apply layout
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-[11px]">
      <span className="clay-kicker mb-1 block">{label}</span>
      <input
        type="number"
        className="w-full clay-input px-2 py-2 text-[12px]"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

function computePreviewBounds(
  contentBounds: { x: number; y: number; w: number; h: number },
  frames: ExportPageFrame[]
): { x: number; y: number; w: number; h: number } {
  let minX = contentBounds.x;
  let minY = contentBounds.y;
  let maxX = contentBounds.x + contentBounds.w;
  let maxY = contentBounds.y + contentBounds.h;

  for (const frame of frames) {
    minX = Math.min(minX, frame.x);
    minY = Math.min(minY, frame.y);
    maxX = Math.max(maxX, frame.x + frame.width);
    maxY = Math.max(maxY, frame.y + frame.height);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const pad = Math.max(24, Math.min(width, height) * 0.08);
  return {
    x: minX - pad,
    y: minY - pad,
    w: width + pad * 2,
    h: height + pad * 2,
  };
}
