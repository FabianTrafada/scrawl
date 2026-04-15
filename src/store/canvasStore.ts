import { create } from "zustand";
import { liveblocks, type WithLiveblocks } from "@liveblocks/zustand";
import { liveblocksClient } from "@/lib/liveblocks";
import { generateId } from "@/lib/utils";

export type ToolType =
  | "select"
  | "pan"
  | "pen"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text";

export type ElementType =
  | "pen"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "image";

interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface PenElement extends BaseElement {
  type: "pen";
  points: number[][];
  pathData: string;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  width: number;
  height: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  width: number;
  height: number;
}

export interface LineElement extends BaseElement {
  type: "line";
  x2: number;
  y2: number;
}

export interface ArrowElement extends BaseElement {
  type: "arrow";
  x2: number;
  y2: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontSize: number;
  isLatex: boolean;
  width: number;
  height: number;
  userResized?: boolean;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src?: string; // runtime object URL or legacy data URL
  imageId?: string; // persisted binary reference in IndexedDB
  r2Key?: string; // R2 object key for collaborative rooms
  uploadStatus?: "uploading" | "ready" | "failed";
  uploadProgress?: number;
  width: number;
  height: number;
}

export type CanvasElement =
  | PenElement
  | RectangleElement
  | EllipseElement
  | LineElement
  | ArrowElement
  | TextElement
  | ImageElement;

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasState {
  // --- Synced via storageMapping (shared with room) ---
  elements: CanvasElement[];

  // --- Synced via presenceMapping (visible to other users) ---
  cursor: { x: number; y: number } | null;
  selectedElementId: string | null;

  // --- Local-only state ---
  activeTool: ToolType;
  camera: Camera;
  history: CanvasElement[][];
  historyIndex: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  isReadOnly: boolean;

  // --- Actions ---
  setActiveTool: (tool: ToolType) => void;
  setCursor: (cursor: { x: number; y: number } | null) => void;
  setSelectedElementId: (id: string | null) => void;
  setCamera: (camera: Partial<Camera>) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setReadOnly: (readOnly: boolean) => void;
  hydrateScene: (payload: {
    elements: CanvasElement[];
    camera?: Partial<Camera>;
  }) => void;

  addElement: (
    element: Omit<CanvasElement, "id"> | Record<string, unknown>
  ) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;

  // History helpers — delegates to Liveblocks when in a room
  pushToHistory: () => void;
  undo: () => void;
  redo: () => void;
  pauseHistory: () => void;
  resumeHistory: () => void;
}

export const useCanvasStore = create<WithLiveblocks<CanvasState>>()(
  liveblocks(
    (set, get) => ({
      // --- Synced state ---
      elements: [],

      // --- Presence state ---
      cursor: null,
      selectedElementId: null,

      // --- Local state ---
      activeTool: "select" as ToolType,
      camera: { x: 0, y: 0, zoom: 1 },
      history: [[]] as CanvasElement[][],
      historyIndex: 0,
      strokeColor: "#1e1e1e",
      fillColor: "transparent",
      strokeWidth: 2,
      isReadOnly: false,

      // --- Actions ---
      setActiveTool: (tool) =>
        set({ activeTool: tool, selectedElementId: null }),

      setCursor: (cursor) => set({ cursor }),

      setSelectedElementId: (id) => set({ selectedElementId: id }),

      setCamera: (partial) =>
        set((s) => ({ camera: { ...s.camera, ...partial } })),

      setStrokeColor: (color) => set({ strokeColor: color }),
      setFillColor: (color) => set({ fillColor: color }),
      setReadOnly: (readOnly) => set({ isReadOnly: readOnly }),

      hydrateScene: ({ elements, camera }) =>
        set((s) => ({
          elements,
          camera: camera ? { ...s.camera, ...camera } : s.camera,
          selectedElementId: null,
          history: [structuredClone(elements)],
          historyIndex: 0,
        })),

      addElement: (element) => {
        const id = generateId();
        const full = { ...element, id } as CanvasElement;
        set((s) => ({ elements: [...s.elements, full] }));
        return id;
      },

      updateElement: (id, updates) =>
        set((s) => ({
          elements: s.elements.map((el) =>
            el.id === id ? ({ ...el, ...updates } as CanvasElement) : el
          ),
        })),

      deleteElement: (id) =>
        set((s) => ({
          elements: s.elements.filter((el) => el.id !== id),
          selectedElementId:
            s.selectedElementId === id ? null : s.selectedElementId,
        })),

      // --- History ---

      pushToHistory: () => {
        const state = get();
        // In a Liveblocks room, history is managed automatically
        if (state.liveblocks.room) return;

        set((s) => {
          const newHistory = s.history.slice(0, s.historyIndex + 1);
          newHistory.push(structuredClone(s.elements));
          const maxHistory = 50;
          if (newHistory.length > maxHistory) newHistory.shift();
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        const state = get();
        // Delegate to Liveblocks when in a room
        if (state.liveblocks.room) {
          state.liveblocks.room.history.undo();
          return;
        }
        set((s) => {
          if (s.historyIndex <= 0) return s;
          const newIndex = s.historyIndex - 1;
          return {
            elements: structuredClone(s.history[newIndex]),
            historyIndex: newIndex,
            selectedElementId: null,
          };
        });
      },

      redo: () => {
        const state = get();
        if (state.liveblocks.room) {
          state.liveblocks.room.history.redo();
          return;
        }
        set((s) => {
          if (s.historyIndex >= s.history.length - 1) return s;
          const newIndex = s.historyIndex + 1;
          return {
            elements: structuredClone(s.history[newIndex]),
            historyIndex: newIndex,
            selectedElementId: null,
          };
        });
      },

      // Pause/resume Liveblocks history batching (e.g. while drawing a stroke)
      pauseHistory: () => {
        get().liveblocks.room?.history.pause();
      },
      resumeHistory: () => {
        get().liveblocks.room?.history.resume();
      },
    }),
    {
      client: liveblocksClient,
      storageMapping: {
        elements: true,
      },
      presenceMapping: {
        cursor: true,
        selectedElementId: true,
      },
    }
  )
);
