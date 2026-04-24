import { generateId } from "@/lib/utils";
import type { ExportOrientation, ExportPageFrame, Rect } from "@/lib/export/types";

const A4_MM = {
  width: 210,
  height: 297,
};

const CSS_DPI = 96;

export function getA4PageMm(orientation: ExportOrientation): { width: number; height: number } {
  if (orientation === "landscape") {
    return { width: A4_MM.height, height: A4_MM.width };
  }
  return { width: A4_MM.width, height: A4_MM.height };
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function computeTileSizeInCanvasUnits(params: {
  orientation: ExportOrientation;
  marginMm: number;
  scalePercent: number;
}): { width: number; height: number } {
  const pageMm = getA4PageMm(params.orientation);
  const contentMmW = Math.max(1, pageMm.width - params.marginMm * 2);
  const contentMmH = Math.max(1, pageMm.height - params.marginMm * 2);
  const scale = Math.max(10, params.scalePercent) / 100;

  const cssWidth = (contentMmW / 25.4) * CSS_DPI;
  const cssHeight = (contentMmH / 25.4) * CSS_DPI;

  return {
    width: cssWidth / scale,
    height: cssHeight / scale,
  };
}

export function buildAutoFrames(contentBounds: Rect, params: {
  orientation: ExportOrientation;
  marginMm: number;
  scalePercent: number;
  maxPages?: number;
}): ExportPageFrame[] {
  const tile = computeTileSizeInCanvasUnits(params);
  const cols = Math.max(1, Math.ceil(contentBounds.w / tile.width));
  const rows = Math.max(1, Math.ceil(contentBounds.h / tile.height));
  const maxPages = params.maxPages ?? 200;

  const frames: ExportPageFrame[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (frames.length >= maxPages) {
        return frames;
      }
      frames.push({
        id: generateId(),
        x: contentBounds.x + col * tile.width,
        y: contentBounds.y + row * tile.height,
        width: tile.width,
        height: tile.height,
      });
    }
  }

  return frames;
}

export function createInitialManualFrame(contentBounds: Rect, params: {
  orientation: ExportOrientation;
  marginMm: number;
  scalePercent: number;
}): ExportPageFrame {
  const tile = computeTileSizeInCanvasUnits(params);
  const centerX = contentBounds.x + contentBounds.w / 2;
  const centerY = contentBounds.y + contentBounds.h / 2;
  return {
    id: generateId(),
    x: centerX - tile.width / 2,
    y: centerY - tile.height / 2,
    width: tile.width,
    height: tile.height,
  };
}
