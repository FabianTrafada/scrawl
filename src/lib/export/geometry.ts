import type {
  ArrowElement,
  CanvasElement,
  EllipseElement,
  ImageElement,
  LineElement,
  RectangleElement,
  TextElement,
} from "@/store/canvasStore";
import type { Rect } from "@/lib/export/types";

function boundsFromLineLike(el: LineElement | ArrowElement): Rect {
  const minX = Math.min(el.x, el.x2);
  const minY = Math.min(el.y, el.y2);
  const maxX = Math.max(el.x, el.x2);
  const maxY = Math.max(el.y, el.y2);
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function boundsFromRectLike(el: RectangleElement | EllipseElement): Rect {
  return { x: el.x, y: el.y, w: Math.max(1, el.width), h: Math.max(1, el.height) };
}

function boundsFromText(el: TextElement): Rect {
  return {
    x: el.x,
    y: el.y,
    w: Math.max(1, el.width || 60),
    h: Math.max(1, el.height || 30),
  };
}

function boundsFromImage(el: ImageElement): Rect {
  return {
    x: el.x,
    y: el.y,
    w: Math.max(1, el.width || 1),
    h: Math.max(1, el.height || 1),
  };
}

function boundsFromPen(el: Extract<CanvasElement, { type: "pen" }>): Rect {
  if (el.outlinePoints && el.outlinePoints.length > 0) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const [x, y] of el.outlinePoints) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
      return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
    }
  }

  if (el.points.length === 0) {
    return { x: el.x, y: el.y, w: 1, h: 1 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of el.points) {
    const px = point[0];
    const py = point[1];
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }

  const pad = Math.max(1, el.strokeWidth || 1);
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(1, maxX - minX + pad * 2),
    h: Math.max(1, maxY - minY + pad * 2),
  };
}

export function getElementBounds(el: CanvasElement): Rect {
  switch (el.type) {
    case "rectangle":
    case "ellipse":
      return boundsFromRectLike(el);
    case "line":
    case "arrow":
      return boundsFromLineLike(el);
    case "text":
      return boundsFromText(el);
    case "image":
      return boundsFromImage(el);
    case "pen":
      return boundsFromPen(el);
  }
}

export function getContentBounds(elements: CanvasElement[]): Rect | null {
  const visible = elements.filter((el) => !el.hidden);
  if (visible.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const el of visible) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export function getViewportBounds(camera: { x: number; y: number; zoom: number }, viewport: { width: number; height: number }): Rect {
  const w = Math.max(1, viewport.width / camera.zoom);
  const h = Math.max(1, viewport.height / camera.zoom);
  return {
    x: -camera.x / camera.zoom,
    y: -camera.y / camera.zoom,
    w,
    h,
  };
}

export function intersectRect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  if (right <= x || bottom <= y) return null;
  return { x, y, w: right - x, h: bottom - y };
}

export function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };
}
