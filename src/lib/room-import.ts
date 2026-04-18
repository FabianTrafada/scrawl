import type { CanvasElement } from "@/store/canvasStore";

const PENDING_ROOM_IMPORT_KEY = "scrawl:pending-room-import:v1";
const MAX_PENDING_AGE_MS = 10 * 60 * 1000;

interface PendingRoomImportScene {
  version: 1;
  savedAt: number;
  elements: CanvasElement[];
  camera: { x: number; y: number; zoom: number };
}

export interface PendingRoomImportPayload {
  roomId: string;
  createdAt: number;
  scene?: PendingRoomImportScene;
}

function isValidPendingPayload(value: unknown): value is PendingRoomImportPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.roomId !== "string" || !candidate.roomId) return false;
  if (typeof candidate.createdAt !== "number") return false;

  if (candidate.scene !== undefined) {
    const scene = candidate.scene as Record<string, unknown>;
    if (!scene) return false;
    if (scene.version !== 1) return false;
    if (typeof scene.savedAt !== "number") return false;
    if (!Array.isArray(scene.elements)) return false;

    const camera = scene.camera as Record<string, unknown> | undefined;
    if (!camera) return false;
    if (
      typeof camera.x !== "number" ||
      typeof camera.y !== "number" ||
      typeof camera.zoom !== "number"
    ) {
      return false;
    }
  }

  return true;
}

export function clearPendingRoomImport(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_ROOM_IMPORT_KEY);
  } catch {
    // no-op
  }
}

export function setPendingRoomImport(payload: PendingRoomImportPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      PENDING_ROOM_IMPORT_KEY,
      JSON.stringify(payload)
    );
  } catch {
    try {
      window.sessionStorage.setItem(
        PENDING_ROOM_IMPORT_KEY,
        JSON.stringify({
          roomId: payload.roomId,
          createdAt: payload.createdAt,
        } as PendingRoomImportPayload)
      );
    } catch {
      clearPendingRoomImport();
    }
  }
}

export function getPendingRoomImport(expectedRoomId: string): PendingRoomImportPayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_ROOM_IMPORT_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidPendingPayload(parsed)) {
      clearPendingRoomImport();
      return null;
    }

    if (parsed.roomId !== expectedRoomId) {
      return null;
    }

    if (Date.now() - parsed.createdAt > MAX_PENDING_AGE_MS) {
      clearPendingRoomImport();
      return null;
    }

    return parsed;
  } catch {
    clearPendingRoomImport();
    return null;
  }
}
