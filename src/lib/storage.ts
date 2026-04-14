"use client";

import type { CanvasElement } from "@/store/canvasStore";

const SCENE_KEY = "scrawl:scene:v1";
const DB_NAME = "scrawl-assets";
const DB_VERSION = 1;
const IMAGE_STORE = "images";

export interface PersistedSceneV1 {
  version: 1;
  savedAt: number;
  elements: CanvasElement[];
  camera: { x: number; y: number; zoom: number };
}

interface StoredImageRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

function generateAssetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImageBlob(blob: Blob, forcedId?: string): Promise<string> {
  const id = forcedId ?? generateAssetId();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_STORE);
    const record: StoredImageRecord = {
      id,
      blob,
      mimeType: blob.type || "image/png",
      createdAt: Date.now(),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
  return id;
}

export async function getImageBlob(imageId: string): Promise<Blob | null> {
  const db = await openDb();
  const result = await new Promise<StoredImageRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readonly");
    const store = tx.objectStore(IMAGE_STORE);
    const req = store.get(imageId);
    req.onsuccess = () => resolve(req.result as StoredImageRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result?.blob ?? null;
}

export async function deleteImageBlob(imageId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_STORE);
    const req = store.delete(imageId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export function saveScene(scene: PersistedSceneV1): void {
  try {
    localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
  } catch (err) {
    console.warn("Failed to save scene", err);
  }
}

export function loadScene(): PersistedSceneV1 | null {
  try {
    const raw = localStorage.getItem(SCENE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSceneV1;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.elements) || !parsed.camera) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn("Failed to load scene", err);
    return null;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, payload] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = atob(payload);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

