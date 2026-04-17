let fallbackIdCounter = 0;

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  fallbackIdCounter += 1;
  return `id-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface Point {
  x: number;
  y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  camera: { x: number; y: number; zoom: number }
): Point {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
}
