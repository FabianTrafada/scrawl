"use client";

import { useRef, useState, useCallback, useEffect, useMemo, useId } from "react";
import { getStroke } from "perfect-freehand";
import polygonClipping from "polygon-clipping";
import {
  useCanvasStore,
  type CanvasElement,
} from "@/store/canvasStore";
import { screenToCanvas, type Point } from "@/lib/utils";
import {
  dataUrlToBlob,
  deleteImageBlob,
  getImageBlob,
  loadScene,
  saveImageBlob,
  saveScene,
  type PersistedSceneV1,
} from "@/lib/storage";
import { uploadImageToR2 } from "@/lib/upload";
import {
  clearPendingRoomImport,
  getPendingRoomImport,
} from "@/lib/room-import";
import { performCanvasExport } from "@/lib/export/renderer";
import { getContentBounds as getExportContentBounds } from "@/lib/export/geometry";

import PenElement from "@/elements/PenElement";
import ShapeElement from "@/elements/ShapeElement";
import TextElementRenderer from "@/elements/TextElement";
import ImageElementRenderer from "@/elements/ImageElement";
import TextEditor from "./TextEditor";
import ResizeHandles, { type HandleType } from "./ResizeHandles";

interface DrawingState {
  type: "pen" | "rectangle" | "ellipse" | "line" | "arrow";
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  points: number[][];
}

interface TextEditorState {
  x: number;
  y: number;
  editingId: string | null;
  initialContent: string;
}

interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  elementStartMap: Record<string, { x: number; y: number; x2?: number; y2?: number }>;
}

interface ResizingState {
  elementId: string;
  handle: HandleType;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  origX2?: number;
  origY2?: number;
}

interface CanvasProps {
  roomId?: string;
}

interface LassoState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

export default function Canvas({ roomId }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stableId = useId();
  const gridPatternId = `canvas-grid-${stableId}`;
  const dotPatternId = `canvas-dot-${stableId}`;

  const elements = useCanvasStore((s) => s.elements);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectedElementId = useCanvasStore((s) => s.selectedElementId);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const activePresenterId = useCanvasStore((s) => s.activePresenterId);
  const camera = useCanvasStore((s) => s.camera);
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const fillColor = useCanvasStore((s) => s.fillColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const eraserSize = useCanvasStore((s) => s.eraserSize);
  const pressurePenEnabled = useCanvasStore((s) => s.pressurePenEnabled);
  const pressureEraserEnabled = useCanvasStore((s) => s.pressureEraserEnabled);
  const snapEnabled = useCanvasStore((s) => s.snapEnabled);
  const gridSize = useCanvasStore((s) => s.gridSize);
  const canvasBackgroundMode = useCanvasStore((s) => s.canvasBackgroundMode);
  const followPresenter = useCanvasStore((s) => s.followPresenter);
  const filterQuery = useCanvasStore((s) => s.filterQuery);
  const viewportSize = useCanvasStore((s) => s.viewportSize);
  const isReadOnly = useCanvasStore((s) => s.isReadOnly);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const setSelectedElementIds = useCanvasStore((s) => s.setSelectedElementIds);
  const setCursor = useCanvasStore((s) => s.setCursor);
  const addElement = useCanvasStore((s) => s.addElement);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const deleteElement = useCanvasStore((s) => s.deleteElement);
  const pushToHistory = useCanvasStore((s) => s.pushToHistory);
  const pauseHistory = useCanvasStore((s) => s.pauseHistory);
  const resumeHistory = useCanvasStore((s) => s.resumeHistory);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const setViewportSize = useCanvasStore((s) => s.setViewportSize);
  const setActivePresenterId = useCanvasStore((s) => s.setActivePresenterId);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const calculatorOpen = useCanvasStore((s) => s.calculatorOpen);
  const setCalculatorOpen = useCanvasStore((s) => s.setCalculatorOpen);
  const focusElementRequest = useCanvasStore((s) => s.focusElementRequest);
  const clearElementFocusRequest = useCanvasStore((s) => s.clearElementFocusRequest);
  const exportRequest = useCanvasStore((s) => s.exportRequest);
  const clearCanvasExportRequest = useCanvasStore((s) => s.clearCanvasExportRequest);
  const hydrateScene = useCanvasStore((s) => s.hydrateScene);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const liveblocksRoom = useCanvasStore((s) => s.liveblocks.room);
  const isInRoom = !!liveblocksRoom;
  const dedupedElements = useMemo(() => {
    const seen = new Set<string>();
    const result: CanvasElement[] = [];
    for (const el of elements) {
      if (seen.has(el.id)) continue;
      seen.add(el.id);
      result.push(el);
    }
    return result;
  }, [elements]);

  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const textEditorRef = useRef<TextEditorState | null>(null);
  const textCommitGuard = useRef(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [lasso, setLasso] = useState<LassoState | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const isHydratingRef = useRef(false);
  const didRunRoomImportRef = useRef(false);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinch = useRef<{
    distance: number;
    cx: number;
    cy: number;
    zoom: number;
    cameraX: number;
    cameraY: number;
  } | null>(null);
  const wasPinching = useRef(false);

  // Eraser session state (kept in refs so pointermove stays smooth)
  const isErasingRef = useRef(false);
  const lastEraserPointRef = useRef<Point | null>(null);
  const pendingEraserSegmentRef = useRef<{
    start: Point;
    end: Point;
    radius: number;
  } | null>(null);
  const eraserRafRef = useRef<number | null>(null);

  // Hydrate scene + image blobs on first mount (local mode only — Liveblocks handles sync in rooms)
  useEffect(() => {
    if (isInRoom) return;

    let cancelled = false;

    const run = async () => {
      const persisted = loadScene();
      if (!persisted) return;

      isHydratingRef.current = true;
      const restoredElements = await Promise.all(
        persisted.elements.map(async (el) => {
          if (el.type !== "image") return el;
          const imageEl = el as import("@/store/canvasStore").ImageElement;

          // Legacy base64 scene still works
          if (!imageEl.imageId && imageEl.src) return imageEl;
          if (!imageEl.imageId) return imageEl;

          const blob = await getImageBlob(imageEl.imageId);
          if (!blob) return imageEl;

          const objectUrl = URL.createObjectURL(blob);
          objectUrlsRef.current.add(objectUrl);
          return { ...imageEl, src: objectUrl };
        })
      );

      if (cancelled) return;
      hydrateScene({
        elements: restoredElements as CanvasElement[],
        camera: persisted.camera,
      });
      // allow one tick so autosave won't race before hydration settles
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 0);
    };

    run();

    return () => {
      cancelled = true;
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
    };
  }, [hydrateScene, isInRoom]);

  useEffect(() => {
    if (!isInRoom || !roomId) return;
    if (didRunRoomImportRef.current) return;

    const pendingImport = getPendingRoomImport(roomId);
    if (!pendingImport) return;

    didRunRoomImportRef.current = true;
    let cancelled = false;

    const uploadWithRetry = async (blob: Blob, retries = 2) => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          return await uploadImageToR2(blob, roomId);
        } catch (err) {
          lastError = err;
        }
      }
      if (lastError) {
        console.warn("Failed to upload imported image to collaborative storage", lastError);
      }
      return null;
    };

    const run = async () => {
      if (!pendingImport.scene) {
        clearPendingRoomImport();
        return;
      }

      const importedElements = await Promise.all(
        pendingImport.scene.elements.map(async (el) => {
          if (el.type !== "image") return structuredClone(el);

          const imageEl = structuredClone(
            el
          ) as import("@/store/canvasStore").ImageElement;
          const hasRemoteSrc =
            typeof imageEl.src === "string" &&
            !imageEl.src.startsWith("blob:") &&
            !imageEl.src.startsWith("data:");

          if (imageEl.r2Key && hasRemoteSrc) {
            return {
              ...imageEl,
              imageId: undefined,
              uploadStatus: "ready" as const,
              uploadProgress: 100,
            };
          }

          let blob: Blob | null = null;
          if (imageEl.imageId) {
            blob = await getImageBlob(imageEl.imageId);
          }
          if (!blob && imageEl.src?.startsWith("data:")) {
            try {
              blob = dataUrlToBlob(imageEl.src);
            } catch {
              blob = null;
            }
          }

          if (!blob) {
            if (hasRemoteSrc) {
              return {
                ...imageEl,
                imageId: undefined,
                uploadStatus: "ready" as const,
                uploadProgress: 100,
              };
            }
            return {
              ...imageEl,
              src: undefined,
              imageId: undefined,
              uploadStatus: "failed" as const,
              uploadProgress: 0,
            };
          }

          const uploaded = await uploadWithRetry(blob);
          if (!uploaded) {
            if (hasRemoteSrc) {
              return {
                ...imageEl,
                imageId: undefined,
                uploadStatus: "ready" as const,
                uploadProgress: 100,
              };
            }
            return {
              ...imageEl,
              src: undefined,
              imageId: undefined,
              uploadStatus: "failed" as const,
              uploadProgress: 0,
            };
          }

          return {
            ...imageEl,
            src: uploaded.publicUrl,
            r2Key: uploaded.key,
            imageId: undefined,
            uploadStatus: "ready" as const,
            uploadProgress: 100,
          };
        })
      );

      if (cancelled) return;

      hydrateScene({
        elements: importedElements as CanvasElement[],
        camera: pendingImport.scene.camera,
      });
      clearPendingRoomImport();
    };

    void run().catch((err) => {
      console.warn("Failed to import local scene into room", err);
      clearPendingRoomImport();
    });

    return () => {
      cancelled = true;
    };
  }, [hydrateScene, isInRoom, roomId]);

  useEffect(
    () => () => {
      if (eraserRafRef.current !== null) {
        cancelAnimationFrame(eraserRafRef.current);
      }
    },
    []
  );

  // Debounced autosave with legacy image migration (local mode only)
  useEffect(() => {
    if (isInRoom) return; // Liveblocks handles persistence in rooms
    if (isHydratingRef.current) return;

    const timer = setTimeout(() => {
      void (async () => {
        const nextElements: CanvasElement[] = [];

        for (const el of elements) {
          if (el.type !== "image") {
            nextElements.push(el);
            continue;
          }

          const imageEl = el as import("@/store/canvasStore").ImageElement;
          let imageId = imageEl.imageId;

          // Migrate legacy dataURL image to IndexedDB once
          if (!imageId && imageEl.src?.startsWith("data:")) {
            try {
              const blob = dataUrlToBlob(imageEl.src);
              imageId = await saveImageBlob(blob);
              updateElement(imageEl.id, { imageId });
            } catch (err) {
              console.warn("Failed to migrate legacy image", err);
            }
          }

          // Persist lightweight scene element (do not persist runtime object URL)
          nextElements.push({
            ...imageEl,
            src: imageEl.src?.startsWith("data:") ? imageEl.src : undefined,
            imageId,
          });
        }

        const payload: PersistedSceneV1 = {
          version: 1,
          savedAt: Date.now(),
          elements: nextElements,
          camera,
        };
        saveScene(payload);
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [elements, camera, updateElement, isInRoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (textEditor) return;
      if (isEditableTarget(e.target)) return;

      if (e.key === " ") {
        e.preventDefault();
        setSpaceHeld(true);
      }

      const key = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey) {
        switch (key) {
          case "v": setActiveTool("select"); break;
          case "k": setActiveTool("lasso"); break;
          case "p": setActiveTool("pen"); break;
          case "r": setActiveTool("rectangle"); break;
          case "o": setActiveTool("ellipse"); break;
          case "l": setActiveTool("line"); break;
          case "a": setActiveTool("arrow"); break;
          case "t": setActiveTool("text"); break;
          case "f":
            {
              const selfId =
                (useCanvasStore.getState().liveblocks.room?.getSelf() as { id?: string } | null)
                  ?.id ?? null;
            setActivePresenterId(
              activePresenterId ? null : selfId
            );
            }
            break;
          case "c":
            setCalculatorOpen(!calculatorOpen);
            break;
          case "delete":
          case "backspace":
            {
              const state = useCanvasStore.getState();
              const idsToDelete =
                state.selectedElementIds.length > 0
                  ? state.selectedElementIds
                  : state.selectedElementId
                    ? [state.selectedElementId]
                    : [];
              if (idsToDelete.length === 0) break;

              for (const id of idsToDelete) {
                const selected = elements.find((el) => el.id === id);
                if (selected?.type !== "image") continue;
                const selectedImage = selected as import("@/store/canvasStore").ImageElement;
                if (selectedImage.imageId) {
                  void deleteImageBlob(selectedImage.imageId);
                }
                if (selectedImage.src?.startsWith("blob:")) {
                  URL.revokeObjectURL(selectedImage.src);
                  objectUrlsRef.current.delete(selectedImage.src);
                }
              }

              pushToHistory();
              for (const id of idsToDelete) {
                deleteElement(id);
              }
              state.setSelectedElementId(null);
              state.setSelectedElementIds([]);
            }
            break;
        }
      }

      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }

      if ((e.ctrlKey || e.metaKey) && key === "k") {
        e.preventDefault();
        useCanvasStore.getState().setCommandPaletteOpen(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") setSpaceHeld(false);
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (textEditor) return;
      if (isEditableTarget(e.target)) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const objectUrl = URL.createObjectURL(file);

          const img = new Image();
          img.onload = () => {
            void (async () => {
              const maxDim = 500;
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                const scale = maxDim / Math.max(w, h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
              }

              const center = screenToCanvas(
                window.innerWidth / 2,
                window.innerHeight / 2,
                camera
              );

              if (isInRoom) {
                const placeholderId = addElement({
                  type: "image" as const,
                  x: center.x - w / 2,
                  y: center.y - h / 2,
                  width: w,
                  height: h,
                  uploadStatus: "uploading" as const,
                  uploadProgress: 0,
                  strokeColor: "transparent",
                  fillColor: "transparent",
                  strokeWidth: 0,
                  opacity: 1,
                });
                pushToHistory();

                try {
                  const { publicUrl, key } = await uploadImageToR2(file, roomId);
                  updateElement(placeholderId, {
                    r2Key: key,
                    src: publicUrl,
                    uploadStatus: "ready",
                    uploadProgress: 100,
                  });
                } catch (err) {
                  console.warn("Failed to upload pasted image to collaborative storage", err);
                  updateElement(placeholderId, {
                    uploadStatus: "failed",
                  });
                } finally {
                  URL.revokeObjectURL(objectUrl);
                }
                return;
              }

              let imageId: string | undefined;
              try {
                imageId = await saveImageBlob(file);
              } catch (err) {
                console.warn("Failed to persist pasted image blob", err);
              }

              objectUrlsRef.current.add(objectUrl);
              addElement({
                type: "image" as const,
                x: center.x - w / 2,
                y: center.y - h / 2,
                width: w,
                height: h,
                imageId,
                src: objectUrl,
                strokeColor: "transparent",
                fillColor: "transparent",
                strokeWidth: 0,
                opacity: 1,
              });
              pushToHistory();
            })();
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            objectUrlsRef.current.delete(objectUrl);
          };
          img.src = objectUrl;
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("paste", handlePaste);
    };
  }, [textEditor, setActiveTool, pushToHistory, deleteElement, undo, redo, camera, addElement, elements, isInRoom, roomId, activePresenterId, setActivePresenterId, calculatorOpen, setCalculatorOpen]);

  // Zoom and Pan with scroll/trackpad
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zooming (Pinch-to-zoom on trackpad or Ctrl+Scroll)
        // Trackpad pinch deltaY is usually small, so we use a multiplier
        const delta = -e.deltaY * 0.01;
        const newZoom = Math.min(Math.max(camera.zoom * (1 + delta), 0.1), 5);
        
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        setCamera({
          zoom: newZoom,
          x: mx - (mx - camera.x) * (newZoom / camera.zoom),
          y: my - (my - camera.y) * (newZoom / camera.zoom),
        });
      } else {
        // Panning (Two-finger scroll on trackpad or regular mouse scroll)
        setCamera({
          x: camera.x - e.deltaX,
          y: camera.y - e.deltaY,
        });
      }
    };

    const svg = svgRef.current;
    svg?.addEventListener("wheel", handleWheel, { passive: false });

    const handleWindowWheel = (e: WheelEvent) => {
      // Only log zoom-like gestures; ignore normal scroll/pan spam.
      if (!(e.ctrlKey || e.metaKey)) return;

      const target = e.target as Element | null;
      const withinCanvas = Boolean(
        svgRef.current && target ? svgRef.current.contains(target) : false
      );

      // If the gesture happened over the SVG, the canvas listener already
      // does `preventDefault()` and updates the camera.
      if (withinCanvas) return;

      // Prevent browser page zoom when the pointer is over the toolbar.
      e.preventDefault();

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const delta = -e.deltaY * 0.01;
      const zoomBefore = camera.zoom;
      const newZoom = Math.min(Math.max(zoomBefore * (1 + delta), 0.1), 5);

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      setCamera({
        zoom: newZoom,
        x: mx - (mx - camera.x) * (newZoom / zoomBefore),
        y: my - (my - camera.y) * (newZoom / zoomBefore),
      });
    };
    window.addEventListener("wheel", handleWindowWheel, { passive: false });

    return () => {
      svg?.removeEventListener("wheel", handleWheel);
      window.removeEventListener("wheel", handleWindowWheel);
    };
  }, [camera, setCamera]);

  useEffect(() => {
    const updateViewport = () => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, [setViewportSize]);

  useEffect(() => {
    if (!followPresenter || !activePresenterId) return;
    const presenter = useCanvasStore
      .getState()
      .liveblocks.others.find((other) => other.id === activePresenterId);
    const presenterCamera = presenter?.presence?.camera as
      | { x: number; y: number; zoom: number }
      | undefined;
    if (!presenterCamera) return;
    setCamera(presenterCamera);
  }, [followPresenter, activePresenterId, setCamera, elements.length]);

  const getCanvasPoint = useCallback(
    (e: React.PointerEvent): Point => {
      const rect = svgRef.current!.getBoundingClientRect();
      return screenToCanvas(
        e.clientX - rect.left,
        e.clientY - rect.top,
        camera
      );
    },
    [camera]
  );

  const maybeSnapPoint = useCallback(
    (pt: Point): Point => {
      if (!snapEnabled) return pt;
      return {
        x: Math.round(pt.x / gridSize) * gridSize,
        y: Math.round(pt.y / gridSize) * gridSize,
      };
    },
    [gridSize, snapEnabled]
  );

  const eraseAtSegment = useCallback((
    startPt: Point,
    endPt: Point,
    radius: number
  ): void => {
    const r = Math.max(radius, 1);
    const midPt: Point = { x: (startPt.x + endPt.x) / 2, y: (startPt.y + endPt.y) / 2 };
    const eraserPolygon = eraserSegmentToRing(startPt, endPt, r);
    if (!eraserPolygon) return;

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const dist2 = (ax: number, ay: number, bx: number, by: number) => {
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    };

    const circleIntersectsAABB = (center: Point, bounds: { x: number; y: number; w: number; h: number }) => {
      const x0 = bounds.x;
      const y0 = bounds.y;
      const x1 = bounds.x + bounds.w;
      const y1 = bounds.y + bounds.h;
      const closestX = clamp(center.x, x0, x1);
      const closestY = clamp(center.y, y0, y1);
      return dist2(center.x, center.y, closestX, closestY) <= r * r;
    };

    const eraseLineOrArrow = (
      el: import("@/store/canvasStore").LineElement | import("@/store/canvasStore").ArrowElement
    ) => {
      const ax = el.x;
      const ay = el.y;
      const bx = el.x2;
      const by = el.y2;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return;

      // Use the segment midpoint as a stable erase "center"
      const cx = midPt.x;
      const cy = midPt.y;
      const tCenter = clamp(((cx - ax) * dx + (cy - ay) * dy) / len2, 0, 1);
      const closestX = ax + dx * tCenter;
      const closestY = ay + dy * tCenter;
      const dist = Math.sqrt(dist2(cx, cy, closestX, closestY));
      if (dist > r) return;

      const len = Math.sqrt(len2);
      const deltaT = Math.sqrt(Math.max(0, r * r - dist * dist)) / len;
      const t0 = clamp(tCenter - deltaT, 0, 1);
      const t1 = clamp(tCenter + deltaT, 0, 1);

      // Fully erased
      if (t0 <= 0 && t1 >= 1) {
        deleteElement(el.id);
        return;
      }

      const lenA = t0; // 0..t0
      const lenB = 1 - t1; // t1..1
      const MIN_LEN = 2;

      if (lenA >= lenB) {
        const nx1 = ax;
        const ny1 = ay;
        const nx2 = ax + dx * t0;
        const ny2 = ay + dy * t0;
        if (Math.hypot(nx2 - nx1, ny2 - ny1) < MIN_LEN) {
          deleteElement(el.id);
          return;
        }
        updateElement(el.id, { x: nx1, y: ny1, x2: nx2, y2: ny2 } as Partial<typeof el>);
      } else {
        const nx1 = ax + dx * t1;
        const ny1 = ay + dy * t1;
        const nx2 = bx;
        const ny2 = by;
        if (Math.hypot(nx2 - nx1, ny2 - ny1) < MIN_LEN) {
          deleteElement(el.id);
          return;
        }
        updateElement(el.id, { x: nx1, y: ny1, x2: nx2, y2: ny2 } as Partial<typeof el>);
      }
    };

    for (const el of dedupedElements) {
      switch (el.type) {
        case "pen": {
          const strokePolygon = el.outlinePoints
            ? normalizeRing(el.outlinePoints)
            : penPointsToRing(el.points, el.strokeWidth);
          if (!strokePolygon) continue;

          const [minX, minY, maxX, maxY] = getRingBounds(strokePolygon);
          const segMinX = Math.min(startPt.x, endPt.x) - r;
          const segMaxX = Math.max(startPt.x, endPt.x) + r;
          const segMinY = Math.min(startPt.y, endPt.y) - r;
          const segMaxY = Math.max(startPt.y, endPt.y) + r;
          if (maxX < segMinX || minX > segMaxX || maxY < segMinY || minY > segMaxY) continue;

          const diff = polygonClipping.difference(
            [[[...strokePolygon]]],
            [[[...eraserPolygon]]]
          ) as number[][][][] | null;

          const fragments = extractFragmentsFromDifference(diff);
          const minArea = Math.max(12, r * 1.2);
          const kept = fragments.filter((fragment) => polygonArea(fragment) >= minArea);

          if (kept.length === 0) {
            deleteElement(el.id);
            continue;
          }

          if (kept.length === 1) {
            const ring = simplifyRing(kept[0]);
            const [ringMinX, ringMinY] = getRingBounds(ring);
            updateElement(el.id, {
              points: ring.map(([x, y]) => [x, y, 0.5]),
              outlinePoints: ring,
              pathData: ringToSvgPath(ring),
              x: ringMinX,
              y: ringMinY,
            } as Partial<typeof el>);
            } else {
              deleteElement(el.id);
              for (const fragment of kept) {
                const ring = simplifyRing(fragment);
                const [ringMinX, ringMinY] = getRingBounds(ring);
                const nextPen: Omit<import("@/store/canvasStore").PenElement, "id"> = {
                  type: "pen",
                  x: ringMinX,
                  y: ringMinY,
                  strokeColor: el.strokeColor,
                fillColor: el.fillColor,
                strokeWidth: el.strokeWidth,
                  opacity: el.opacity,
                  points: ring.map(([x, y]) => [x, y, 0.5]),
                  outlinePoints: ring,
                  pathData: ringToSvgPath(ring),
                };
                addElement(nextPen);
              }
            }
            continue;
          }

        case "rectangle":
        case "ellipse": {
          const bounds = getElementBounds(el);
          const intersects =
            circleIntersectsAABB(startPt, bounds) ||
            circleIntersectsAABB(midPt, bounds) ||
            circleIntersectsAABB(endPt, bounds);
          if (intersects) deleteElement(el.id);
          continue;
        }

        case "line":
        case "arrow": {
          eraseLineOrArrow(el);
          continue;
        }

        case "text":
        case "image": {
          const bounds = getElementBounds(el);
          const intersects =
            circleIntersectsAABB(startPt, bounds) ||
            circleIntersectsAABB(midPt, bounds) ||
            circleIntersectsAABB(endPt, bounds);
          if (intersects) deleteElement(el.id);
          continue;
        }
      }
    }
  }, [dedupedElements, deleteElement, updateElement, addElement]);

  const flushEraserSegment = useCallback(() => {
    const segment = pendingEraserSegmentRef.current;
    pendingEraserSegmentRef.current = null;
    eraserRafRef.current = null;
    if (!segment) return;
    eraseAtSegment(segment.start, segment.end, segment.radius);
  }, [eraseAtSegment]);

  const queueEraserSegment = useCallback(
    (start: Point, end: Point, radius: number) => {
      const current = pendingEraserSegmentRef.current;
      if (current) {
        current.end = end;
        current.radius = Math.max(current.radius, radius);
      } else {
        pendingEraserSegmentRef.current = {
          start,
          end,
          radius,
        };
      }

      if (eraserRafRef.current === null) {
        eraserRafRef.current = requestAnimationFrame(flushEraserSegment);
      }
    },
    [flushEraserSegment]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.current.size >= 2) {
        if (drawing) {
          setDrawing(null);
          resumeHistory();
        }
        setDragging(null);
        setResizing(null);
        setIsPanning(false);
        wasPinching.current = true;

        const pts = Array.from(activePointers.current.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const distance = Math.hypot(dx, dy);
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;

        initialPinch.current = {
          distance,
          cx,
          cy,
          zoom: camera.zoom,
          cameraX: camera.x,
          cameraY: camera.y,
        };
        return;
      }

      if (e.button === 1 || spaceHeld || activeTool === "pan") {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (e.button !== 0) return;

      // Read-only users can only pan and zoom
      if (isReadOnly) return;

      const rawPt = getCanvasPoint(e);
      const pt = maybeSnapPoint(rawPt);

      if (activeTool === "select") {
        if (!e.shiftKey) {
          setSelectedElementId(null);
          setSelectedElementIds([]);
        }
        return;
      }

      if (activeTool === "lasso") {
        setLasso({
          startX: pt.x,
          startY: pt.y,
          currentX: pt.x,
          currentY: pt.y,
        });
        return;
      }

      if (activeTool === "text") {
        if (textEditorRef.current) {
          // Editor is open -- let the blur handler commit it. Just schedule the next one.
          const newPt = { ...pt };
          setTimeout(() => {
            setTextEditor({
              x: newPt.x,
              y: newPt.y,
              editingId: null,
              initialContent: "",
            });
            textEditorRef.current = {
              x: newPt.x,
              y: newPt.y,
              editingId: null,
              initialContent: "",
            };
            textCommitGuard.current = false;
          }, 100);
        } else {
          const newState: TextEditorState = {
            x: pt.x,
            y: pt.y,
            editingId: null,
            initialContent: "",
          };
          setTextEditor(newState);
          textEditorRef.current = newState;
          textCommitGuard.current = false;
        }
        return;
      }

      if (activeTool === "eraser") {
        // Start erasing: we update elements during pointermove and batch undo via pause/resume.
        pauseHistory();
        setSelectedElementId(null);
        setDrawing(null);
        setDragging(null);
        setResizing(null);
        setIsPanning(false);
        setPanStart(null);

        isErasingRef.current = true;

        (e.target as Element)?.setPointerCapture?.(e.pointerId);

        lastEraserPointRef.current = pt;
        const eraserRadius = pressureEraserEnabled
          ? Math.max(2, eraserSize * Math.max(e.pressure || 0.5, 0.2))
          : eraserSize;
        queueEraserSegment(pt, pt, eraserRadius);
        return;
      }

      // Drawing tools
      if (
        activeTool === "pen" ||
        activeTool === "rectangle" ||
        activeTool === "ellipse" ||
        activeTool === "line" ||
        activeTool === "arrow"
      ) {
        // Pause Liveblocks history so the entire stroke is one undo step
        pauseHistory();
        (e.target as Element)?.setPointerCapture?.(e.pointerId);
        setDrawing({
          type: activeTool,
          startX: pt.x,
          startY: pt.y,
          currentX: pt.x,
          currentY: pt.y,
          points: [[pt.x, pt.y, pressurePenEnabled ? e.pressure || 0.5 : 0.5]],
        });
      }
    },
    [activeTool, getCanvasPoint, maybeSnapPoint, spaceHeld, setSelectedElementId, setSelectedElementIds, isReadOnly, pauseHistory, eraserSize, pressureEraserEnabled, pressurePenEnabled, queueEraserSegment]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (activePointers.current.size >= 2) {
        if (!initialPinch.current) return;
        const pts = Array.from(activePointers.current.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const distance = Math.hypot(dx, dy);
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;

        const init = initialPinch.current;
        let newZoom = init.zoom * (distance / init.distance);
        newZoom = Math.min(Math.max(newZoom, 0.1), 5);

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const scaleDelta = newZoom / init.zoom;
          const mx = init.cx - rect.left;
          const my = init.cy - rect.top;

          const zX = mx - (mx - init.cameraX) * scaleDelta;
          const zY = my - (my - init.cameraY) * scaleDelta;

          const panX = cx - init.cx;
          const panY = cy - init.cy;

          setCamera({
            zoom: newZoom,
            x: zX + panX,
            y: zY + panY,
          });
        }
        return;
      }

      // Continuous eraser updates
      if (isErasingRef.current && activeTool === "eraser") {
        const pt = maybeSnapPoint(getCanvasPoint(e));
        const last = lastEraserPointRef.current ?? pt;
        const eraserRadius = pressureEraserEnabled
          ? Math.max(2, eraserSize * Math.max(e.pressure || 0.5, 0.2))
          : eraserSize;
        const segmentLen = Math.hypot(pt.x - last.x, pt.y - last.y);
        if (segmentLen < Math.max(0.5, eraserRadius * 0.08)) {
          return;
        }
        queueEraserSegment(last, pt, eraserRadius);
        lastEraserPointRef.current = pt;
        return;
      }

      if (lasso) {
        const pt = maybeSnapPoint(getCanvasPoint(e));
        setLasso({
          ...lasso,
          currentX: pt.x,
          currentY: pt.y,
        });
        return;
      }

      // Broadcast cursor position to other users in the room
      if (isInRoom) {
        const pt = getCanvasPoint(e);
        setCursor({ x: pt.x, y: pt.y });
      }

      if (isPanning && panStart) {
        setCamera({
          x: camera.x + (e.clientX - panStart.x),
          y: camera.y + (e.clientY - panStart.y),
        });
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (resizing) {
        const pt = getCanvasPoint(e);
        const { handle, origX, origY, origW, origH, origX2, origY2 } = resizing;
        const MIN = 20;

        if (handle === "start" || handle === "end") {
          if (handle === "start") {
            updateElement(resizing.elementId, { x: pt.x, y: pt.y });
          } else {
            updateElement(resizing.elementId, { x2: pt.x, y2: pt.y } as Record<string, number>);
          }
        } else {
          let newX = origX;
          let newY = origY;
          let newW = origW;
          let newH = origH;

          switch (handle) {
            case "se":
              newW = Math.max(MIN, pt.x - origX);
              newH = Math.max(MIN, pt.y - origY);
              break;
            case "sw":
              newW = Math.max(MIN, origX + origW - pt.x);
              newH = Math.max(MIN, pt.y - origY);
              newX = origX + origW - newW;
              break;
            case "ne":
              newW = Math.max(MIN, pt.x - origX);
              newH = Math.max(MIN, origY + origH - pt.y);
              newY = origY + origH - newH;
              break;
            case "nw":
              newW = Math.max(MIN, origX + origW - pt.x);
              newH = Math.max(MIN, origY + origH - pt.y);
              newX = origX + origW - newW;
              newY = origY + origH - newH;
              break;
          }

          const updates: Record<string, unknown> = { x: newX, y: newY, width: newW, height: newH, userResized: true };
          if (origX2 !== undefined && origY2 !== undefined) {
            (updates as Record<string, number>).x2 = newX + newW;
            (updates as Record<string, number>).y2 = newY + newH;
          }

          updateElement(resizing.elementId, updates as Partial<CanvasElement>);
        }
        return;
      }

      if (dragging) {
        const pt = maybeSnapPoint(getCanvasPoint(e));
        const dx = pt.x - dragging.startX;
        const dy = pt.y - dragging.startY;
        for (const [id, start] of Object.entries(dragging.elementStartMap)) {
          const updates: Record<string, number> = {
            x: start.x + dx,
            y: start.y + dy,
          };
          if (start.x2 !== undefined && start.y2 !== undefined) {
            updates.x2 = start.x2 + dx;
            updates.y2 = start.y2 + dy;
          }
          updateElement(id, updates);
        }
        return;
      }

      if (!drawing) return;

      const pt = maybeSnapPoint(getCanvasPoint(e));

      if (drawing.type === "pen") {
        setDrawing({
          ...drawing,
          points: [...drawing.points, [pt.x, pt.y, pressurePenEnabled ? e.pressure || 0.5 : 0.5]],
          currentX: pt.x,
          currentY: pt.y,
        });
      } else {
        setDrawing({
          ...drawing,
          currentX: pt.x,
          currentY: pt.y,
        });
      }
    },
    [isPanning, panStart, resizing, dragging, drawing, camera, getCanvasPoint, maybeSnapPoint, setCamera, updateElement, isInRoom, setCursor, isErasingRef, activeTool, eraserSize, pressureEraserEnabled, lasso, pressurePenEnabled, queueEraserSegment]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      initialPinch.current = null;
    }
    if (wasPinching.current) {
      if (activePointers.current.size === 0) {
        wasPinching.current = false;
      }
      return;
    }

    if (isErasingRef.current) {
      // Finish eraser gesture and create a single undo step.
      isErasingRef.current = false;
      if (eraserRafRef.current !== null) {
        cancelAnimationFrame(eraserRafRef.current);
        eraserRafRef.current = null;
      }
      if (pendingEraserSegmentRef.current) {
        const segment = pendingEraserSegmentRef.current;
        pendingEraserSegmentRef.current = null;
        eraseAtSegment(segment.start, segment.end, segment.radius);
      }
      lastEraserPointRef.current = null;
      pushToHistory();
      resumeHistory();
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (lasso) {
      const x = Math.min(lasso.startX, lasso.currentX);
      const y = Math.min(lasso.startY, lasso.currentY);
      const w = Math.abs(lasso.currentX - lasso.startX);
      const h = Math.abs(lasso.currentY - lasso.startY);
      const ids = elements
        .filter((el) => !el.hidden)
        .filter((el) => {
          const b = getElementBounds(el);
          return b.x + b.w >= x && b.x <= x + w && b.y + b.h >= y && b.y <= y + h;
        })
        .map((el) => el.id);
      setSelectedElementIds(ids);
      setLasso(null);
      return;
    }

    if (resizing) {
      pushToHistory();
      setResizing(null);
      return;
    }

    if (dragging) {
      pushToHistory();
      setDragging(null);
      return;
    }

    if (!drawing) return;

    pushToHistory();

    if (drawing.type === "pen") {
      const stroke = getStroke(drawing.points, {
        size: 8,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
        last: true,
      });
      const pathData = getSvgPathFromStroke(stroke);
      if (pathData) {
        addElement({
          type: "pen" as const,
          x: drawing.startX,
          y: drawing.startY,
          strokeColor,
          fillColor: "transparent",
          strokeWidth,
          opacity: 1,
          points: drawing.points,
          pathData,
        });
      }
    } else if (
      drawing.type === "rectangle" ||
      drawing.type === "ellipse"
    ) {
      const x = Math.min(drawing.startX, drawing.currentX);
      const y = Math.min(drawing.startY, drawing.currentY);
      const w = Math.abs(drawing.currentX - drawing.startX);
      const h = Math.abs(drawing.currentY - drawing.startY);
      if (w > 2 || h > 2) {
        addElement({
          type: drawing.type as "rectangle" | "ellipse",
          x,
          y,
          width: w,
          height: h,
          strokeColor,
          fillColor,
          strokeWidth,
          opacity: 1,
        });
      }
    } else if (drawing.type === "line" || drawing.type === "arrow") {
      const dx = drawing.currentX - drawing.startX;
      const dy = drawing.currentY - drawing.startY;
      if (Math.hypot(dx, dy) > 2) {
        addElement({
          type: drawing.type as "line" | "arrow",
          x: drawing.startX,
          y: drawing.startY,
          x2: drawing.currentX,
          y2: drawing.currentY,
          strokeColor,
          fillColor,
          strokeWidth,
          opacity: 1,
        });
      }
    }

    // Resume Liveblocks history batching so the entire stroke is one undo step
    resumeHistory();
    setDrawing(null);
  }, [drawing, dragging, resizing, isPanning, lasso, elements, addElement, pushToHistory, resumeHistory, strokeColor, fillColor, strokeWidth, setSelectedElementIds, eraseAtSegment]);

  const handleElementSelect = useCallback(
    (id: string) => {
      setActiveTool("select");
      const currentIds = useCanvasStore.getState().selectedElementIds;
      const nextIds = currentIds.includes(id) ? currentIds : [id];
      setSelectedElementIds(nextIds);
      setSelectedElementId(nextIds.length === 1 ? nextIds[0] : null);

      const el = elements.find((e) => e.id === id);
      if (!el) return;

      const dragStarted = { current: false };

      const handleMove = (e: PointerEvent) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const pt = screenToCanvas(
          e.clientX - rect.left,
          e.clientY - rect.top,
          camera
        );

        if (!dragStarted.current) {
          dragStarted.current = true;
          const selection = nextIds
            .map((selectedId) => elements.find((item) => item.id === selectedId))
            .filter((item): item is CanvasElement => Boolean(item && !item.locked));
          const elementStartMap = Object.fromEntries(
            selection.map((item) => [
              item.id,
              {
                x: item.x,
                y: item.y,
                x2: (item as { x2?: number }).x2,
                y2: (item as { y2?: number }).y2,
              },
            ])
          );
          setDragging({
            elementId: id,
            startX: pt.x,
            startY: pt.y,
            elementStartMap,
          });
        }
        // Subsequent moves are handled by Canvas handlePointerMove via dragging state
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
    },
    [elements, camera, setSelectedElementId, setSelectedElementIds, setActiveTool]
  );

  const handleTextDoubleClick = useCallback(
    (id: string) => {
      const el = elements.find((e) => e.id === id);
      if (!el || el.type !== "text") return;
      const textEl = el as import("@/store/canvasStore").TextElement;

      const newState: TextEditorState = {
        x: textEl.x,
        y: textEl.y,
        editingId: id,
        initialContent: textEl.content,
      };
      setTextEditor(newState);
      textEditorRef.current = newState;
      textCommitGuard.current = false;
    },
    [elements]
  );

  const handleResizeStart = useCallback(
    (handle: HandleType, e: React.PointerEvent) => {
      e.stopPropagation();
      const el = selectedElementId ? elements.find((el) => el.id === selectedElementId) : null;
      if (!el) return;

      const pt = getCanvasPoint(e);
      const bounds = getElementBounds(el);

      setResizing({
        elementId: el.id,
        handle,
        startX: pt.x,
        startY: pt.y,
        origX: bounds.x,
        origY: bounds.y,
        origW: bounds.w,
        origH: bounds.h,
        origX2: (el as { x2?: number }).x2,
        origY2: (el as { y2?: number }).y2,
      });
    },
    [selectedElementId, elements, getCanvasPoint]
  );

  const handleTextCommit = useCallback(
    (content: string, isLatex: boolean) => {
      if (textCommitGuard.current) return;
      const editor = textEditorRef.current;
      if (!editor) return;

      textCommitGuard.current = true;

      const measuredSize = measureText(content, isLatex, 24);

      if (editor.editingId) {
        const existing = elements.find((el) => el.id === editor.editingId);
        const existingText =
          existing && existing.type === "text"
            ? (existing as import("@/store/canvasStore").TextElement)
            : null;

        updateElement(editor.editingId, {
          content,
          isLatex,
          width:
            existingText?.userResized && existingText.width > 0
              ? existingText.width
              : measuredSize.width,
          height: measuredSize.height,
          userResized: existingText?.userResized ?? false,
        });
      } else {
        addElement({
          type: "text" as const,
          x: editor.x,
          y: editor.y,
          content,
          fontSize: 24,
          isLatex,
          strokeColor,
          fillColor: "transparent",
          strokeWidth: 0,
          opacity: 1,
          width: measuredSize.width,
          height: measuredSize.height,
          userResized: false,
        });
      }

      pushToHistory();
      setTextEditor(null);
      textEditorRef.current = null;
    },
    [addElement, updateElement, pushToHistory, strokeColor, elements]
  );

  const handleTextCancel = useCallback(() => {
    setTextEditor(null);
    textEditorRef.current = null;
    textCommitGuard.current = false;
  }, []);

  const handleTextResize = useCallback(
    (id: string, width: number, height: number) => {
      updateElement(id, { width, height });
    },
    [updateElement]
  );

  // Preview drawing shape
  const renderDrawingPreview = () => {
    if (!drawing) return null;

    const DEFAULT_STROKE = "#1e1e1e";
    const isDefaultStrokeColor =
      strokeColor?.toLowerCase() === DEFAULT_STROKE.toLowerCase();

    const effectiveStroke = isDefaultStrokeColor
      ? "var(--tool-default-stroke)"
      : strokeColor;
    const glow = isDefaultStrokeColor ? "var(--tool-default-stroke-glow)" : undefined;

    if (drawing.type === "pen" && drawing.points.length > 0) {
      const stroke = getStroke(drawing.points, {
        size: 8,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
      });
      const pathData = getSvgPathFromStroke(stroke);
      return (
        <path
          d={pathData}
          fill={effectiveStroke}
          stroke="none"
          data-export-ignore="true"
          style={{ filter: glow }}
        />
      );
    }

    if (drawing.type === "rectangle") {
      const x = Math.min(drawing.startX, drawing.currentX);
      const y = Math.min(drawing.startY, drawing.currentY);
      const w = Math.abs(drawing.currentX - drawing.startX);
      const h = Math.abs(drawing.currentY - drawing.startY);
      return (
        <rect
          x={x} y={y} width={w} height={h}
          fill="none" stroke={effectiveStroke} strokeWidth={strokeWidth}
          data-export-ignore="true"
          strokeDasharray="6,3" opacity={0.6}
          style={{ filter: glow }}
        />
      );
    }

    if (drawing.type === "ellipse") {
      const cx = (drawing.startX + drawing.currentX) / 2;
      const cy = (drawing.startY + drawing.currentY) / 2;
      const rx = Math.abs(drawing.currentX - drawing.startX) / 2;
      const ry = Math.abs(drawing.currentY - drawing.startY) / 2;
      return (
        <ellipse
          cx={cx} cy={cy} rx={rx} ry={ry}
          fill="none" stroke={effectiveStroke} strokeWidth={strokeWidth}
          data-export-ignore="true"
          strokeDasharray="6,3" opacity={0.6}
          style={{ filter: glow }}
        />
      );
    }

    if (drawing.type === "line" || drawing.type === "arrow") {
      return (
        <line
          x1={drawing.startX} y1={drawing.startY}
          x2={drawing.currentX} y2={drawing.currentY}
          stroke={effectiveStroke} strokeWidth={strokeWidth}
          data-export-ignore="true"
          strokeDasharray="6,3" opacity={0.6}
          style={{ filter: glow }}
        />
      );
    }

    return null;
  };

  const cursorStyle = spaceHeld || isPanning || activeTool === "pan"
    ? (isPanning ? "grabbing" : "grab")
    : activeTool === "select"
    ? "default"
    : activeTool === "lasso"
    ? "cell"
    : activeTool === "text"
    ? "text"
    : "crosshair";

  const contentBounds = useMemo(
    () => getContentBounds(dedupedElements),
    [dedupedElements]
  );
  const exportContentBounds = useMemo(
    () => getExportContentBounds(dedupedElements),
    [dedupedElements]
  );

  useEffect(() => {
    if (!exportRequest) return;
    const svg = svgRef.current;
    if (!svg) {
      clearCanvasExportRequest();
      return;
    }

    const request = exportRequest;
    clearCanvasExportRequest();

    const rect = svg.getBoundingClientRect();
    const fallbackViewport = {
      width: rect.width || viewportSize.width || window.innerWidth,
      height: rect.height || viewportSize.height || window.innerHeight,
    };

    void performCanvasExport(
      {
        svgRoot: svg,
        camera,
        viewport: fallbackViewport,
        roomId: request.roomId,
        contentBounds: exportContentBounds,
      },
      request.settings
    );
  }, [exportRequest, clearCanvasExportRequest, camera, viewportSize, exportContentBounds]);

  const shouldShowBackToContent = useMemo(() => {
    if (!contentBounds) return false;
    const vw = viewportSize.width || 0;
    const vh = viewportSize.height || 0;
    if (vw <= 0 || vh <= 0) return false;

    const viewLeft = -camera.x / camera.zoom;
    const viewTop = -camera.y / camera.zoom;
    const viewRight = (vw - camera.x) / camera.zoom;
    const viewBottom = (vh - camera.y) / camera.zoom;

    const margin = 120;
    const contentOutOfView =
      contentBounds.x + contentBounds.w < viewLeft + margin ||
      contentBounds.x > viewRight - margin ||
      contentBounds.y + contentBounds.h < viewTop + margin ||
      contentBounds.y > viewBottom - margin;

    return contentOutOfView;
  }, [contentBounds, camera, viewportSize]);

  const handleBackToContent = useCallback(() => {
    if (!contentBounds || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pad = 80;
    const scaleX = rect.width / Math.max(contentBounds.w + pad * 2, 1);
    const scaleY = rect.height / Math.max(contentBounds.h + pad * 2, 1);
    const nextZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 2.5);

    const cx = contentBounds.x + contentBounds.w / 2;
    const cy = contentBounds.y + contentBounds.h / 2;

    setCamera({
      zoom: nextZoom,
      x: rect.width / 2 - cx * nextZoom,
      y: rect.height / 2 - cy * nextZoom,
    });
    setSelectedElementId(null);
  }, [contentBounds, setCamera, setSelectedElementId]);

  useEffect(() => {
    if (!focusElementRequest) return;
    const target = dedupedElements.find((item) => item.id === focusElementRequest.elementId);
    if (!target || !svgRef.current) {
      clearElementFocusRequest();
      return;
    }

    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      clearElementFocusRequest();
      return;
    }

    const bounds = getElementBounds(target);
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    const targetZoom = Math.min(
      3,
      Math.max(
        0.3,
        Math.min(rect.width / Math.max(bounds.w + 120, 1), rect.height / Math.max(bounds.h + 120, 1))
      )
    );

    setCamera({
      zoom: targetZoom,
      x: rect.width / 2 - centerX * targetZoom,
      y: rect.height / 2 - centerY * targetZoom,
    });
    setActiveTool("select");
    setSelectedElementIds([target.id]);
    setSelectedElementId(target.id);
    clearElementFocusRequest();
  }, [
    clearElementFocusRequest,
    dedupedElements,
    focusElementRequest,
    setActiveTool,
    setCamera,
    setSelectedElementId,
    setSelectedElementIds,
  ]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent">
      {/* Grid background */}
      <svg
        ref={svgRef}
        className="w-full h-full absolute inset-0"
        style={{ cursor: cursorStyle, touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <filter id="selection-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--color-slushie-500)" floodOpacity="0.6" />
          </filter>
          {canvasBackgroundMode === "grid" && (
            <pattern
              id={gridPatternId}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="var(--border-oat)"
                strokeWidth="1"
                opacity="0.28"
              />
            </pattern>
          )}
          {canvasBackgroundMode === "dot" && (
            <pattern
              id={dotPatternId}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={gridSize / 2}
                cy={gridSize / 2}
                r="1"
                fill="var(--border-oat)"
                opacity="0.4"
              />
            </pattern>
          )}
        </defs>

        <rect
          data-export-background="true"
          width="100%"
          height="100%"
          fill={
            canvasBackgroundMode === "grid"
              ? `url(#${gridPatternId})`
              : canvasBackgroundMode === "dot"
                ? `url(#${dotPatternId})`
                : "transparent"
          }
        />

        <g data-export-scene="true" transform={`translate(${camera.x},${camera.y}) scale(${camera.zoom})`}>
          {[...dedupedElements]
            .filter((el) => !el.hidden)
            .filter((el) => {
              if (!filterQuery.trim()) return true;
              const q = filterQuery.toLowerCase();
              const haystack = `${el.label ?? ""} ${(el.tags ?? []).join(" ")} ${
                el.type === "text" ? el.content : ""
              }`.toLowerCase();
              return haystack.includes(q);
            })
            .sort((a, b) => (a.layerIndex ?? 0) - (b.layerIndex ?? 0))
            .map((el) => {
            switch (el.type) {
              case "pen":
                return (
                  <PenElement
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) || el.id === selectedElementId}
                    onSelect={handleElementSelect}
                  />
                );
              case "rectangle":
              case "ellipse":
              case "line":
              case "arrow":
                return (
                  <ShapeElement
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) || el.id === selectedElementId}
                    onSelect={handleElementSelect}
                  />
                );
              case "text":
                return (
                  <TextElementRenderer
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) || el.id === selectedElementId}
                    onSelect={handleElementSelect}
                    onDoubleClick={handleTextDoubleClick}
                    onResize={handleTextResize}
                  />
                );
              case "image":
                return (
                  <ImageElementRenderer
                    key={el.id}
                    element={el}
                    isSelected={selectedElementIds.includes(el.id) || el.id === selectedElementId}
                    onSelect={handleElementSelect}
                  />
                );
              default:
                return null;
            }
          })}

          {renderDrawingPreview()}

          {lasso && (
            <rect
              data-export-ignore="true"
              x={Math.min(lasso.startX, lasso.currentX)}
              y={Math.min(lasso.startY, lasso.currentY)}
              width={Math.abs(lasso.currentX - lasso.startX)}
              height={Math.abs(lasso.currentY - lasso.startY)}
              fill="rgba(59,211,253,0.12)"
              stroke="var(--color-slushie-500)"
              strokeDasharray="6,4"
            />
          )}

          {/* Resize handles for selected element */}
          {selectedElementId && (() => {
            const sel = dedupedElements.find((e) => e.id === selectedElementId);
            if (!sel || sel.type === "pen") return null;

            if (sel.type === "line" || sel.type === "arrow") {
              return (
                <ResizeHandles
                  mode="line"
                  x1={sel.x}
                  y1={sel.y}
                  x2={sel.x2}
                  y2={sel.y2}
                  onResizeStart={handleResizeStart}
                />
              );
            }

            const bounds = getElementBounds(sel);
            return (
              <ResizeHandles
                mode="box"
                x={bounds.x}
                y={bounds.y}
                w={bounds.w}
                h={bounds.h}
                onResizeStart={handleResizeStart}
              />
            );
          })()}
        </g>
      </svg>

      {textEditor && (
        <TextEditor
          x={textEditor.x}
          y={textEditor.y}
          initialContent={textEditor.initialContent}
          editingElementId={textEditor.editingId}
          onCommit={handleTextCommit}
          onCancel={handleTextCancel}
          camera={camera}
        />
      )}

      {shouldShowBackToContent && (
        <button
          type="button"
          onClick={handleBackToContent}
          className="fixed left-1/2 -translate-x-1/2 top-4 sm:top-auto sm:bottom-6 z-50 group flex items-center gap-2 rounded-[999px] border border-[var(--border-oat)] bg-[var(--surface-overlay)] backdrop-blur-md px-4 py-2.5 text-sm font-medium text-[var(--foreground)] tracking-wide shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px] hover:bg-[var(--color-slushie-500)] hover:text-white hover:-translate-y-0.5 hover:shadow-[-7px_7px_0px_0px_#000] active:translate-y-0 active:shadow-none transition-all duration-200"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[var(--border-oat)] bg-[var(--background)] group-hover:border-[var(--surface-overlay-hover-border)] group-hover:bg-[var(--surface-overlay-hover-weak)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </span>
          <span className="uppercase text-[10px] font-semibold tracking-[0.6px] whitespace-nowrap">
            Back to content
          </span>
        </button>
      )}
    </div>
  );
}

function measureText(
  content: string,
  isLatex: boolean,
  fontSize: number
): { width: number; height: number } {
  if (isLatex) {
    return {
      width: Math.max(content.length * fontSize * 0.7, 60),
      height: fontSize * 2,
    };
  }
  return {
    width: Math.max(content.length * fontSize * 0.6, 40),
    height: fontSize * 1.4,
  };
}

function getElementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  switch (el.type) {
    case "rectangle":
    case "ellipse":
      return { x: el.x, y: el.y, w: el.width, h: el.height };
    case "text":
      return { x: el.x, y: el.y, w: el.width || 60, h: el.height || 30 };
    case "image":
      return { x: el.x, y: el.y, w: el.width, h: el.height };
    case "line":
    case "arrow": {
      const minX = Math.min(el.x, el.x2);
      const minY = Math.min(el.y, el.y2);
      const maxX = Math.max(el.x, el.x2);
      const maxY = Math.max(el.y, el.y2);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case "pen":
      return { x: el.x, y: el.y, w: 0, h: 0 };
  }
}

function getContentBounds(elements: CanvasElement[]): { x: number; y: number; w: number; h: number } | null {
  if (!elements.length) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const el of elements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1) };
}

type Ring = [number, number][];

function ringToSvgPath(ring: Ring): string {
  if (ring.length < 3) return "";
  const normalized = normalizeRing(ring);
  if (!normalized) return "";
  return `M ${normalized.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
}

function normalizeRing(ring: number[][]): Ring | null {
  if (ring.length < 3) return null;
  const normalized = ring.map(([x, y]) => [x, y] as [number, number]);
  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.001) {
    normalized.pop();
  }
  return normalized.length >= 3 ? normalized : null;
}

function simplifyRing(ring: Ring, maxPoints = 180): Ring {
  if (ring.length <= maxPoints) return ring;
  const step = Math.ceil(ring.length / maxPoints);
  const simplified: Ring = [];
  for (let i = 0; i < ring.length; i += step) {
    simplified.push(ring[i]);
  }
  // Preserve closure continuity with final point sample.
  if (simplified.length < 3) {
    return ring.slice(0, 3) as Ring;
  }
  return simplified;
}

function penPointsToRing(points: number[][], strokeWidth: number): Ring | null {
  if (points.length < 2) return null;
  const outline = getStroke(points, {
    size: Math.max(4, strokeWidth * 2),
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
    last: true,
  });
  return normalizeRing(outline as number[][]);
}

function eraserSegmentToRing(startPt: Point, endPt: Point, radius: number): Ring | null {
  const eraserPoints = [
    [startPt.x, startPt.y, 0.5],
    [endPt.x, endPt.y, 0.5],
  ];
  const outline = getStroke(eraserPoints, {
    size: Math.max(2, radius * 2),
    thinning: 0,
    smoothing: 0.7,
    streamline: 0,
    simulatePressure: false,
    last: true,
  });
  return normalizeRing(outline as number[][]);
}

function extractFragmentsFromDifference(
  diff: number[][][][] | null
): Ring[] {
  if (!diff?.length) return [];

  const fragments: Ring[] = [];
  for (const polygon of diff) {
    if (!polygon.length) continue;
    let bestRing: Ring | null = null;
    let maxArea = 0;
    for (const ring of polygon) {
      const normalized = normalizeRing(ring);
      if (!normalized) continue;
      const area = polygonArea(normalized);
      if (area > maxArea) {
        maxArea = area;
        bestRing = normalized;
      }
    }
    if (bestRing && maxArea > 0.5) fragments.push(bestRing);
  }

  return fragments;
}

function polygonArea(ring: Ring): number {
  if (ring.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

function getRingBounds(ring: Ring): [number, number, number, number] {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return [minX, minY, maxX, maxY];
}
