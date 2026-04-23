import { create } from "zustand";
import { liveblocks, type WithLiveblocks } from "@liveblocks/zustand";
import { liveblocksClient } from "@/lib/liveblocks";
import { generateId } from "@/lib/utils";
import type { CanvasBackgroundMode, CommentsViewMode } from "@/types/collab";

export type ToolType =
  | "select"
  | "lasso"
  | "pan"
  | "eraser"
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
  layerIndex?: number;
  hidden?: boolean;
  locked?: boolean;
  groupId?: string | null;
  tags?: string[];
  label?: string;
}

export interface PenElement extends BaseElement {
  type: "pen";
  points: number[][];
  pathData: string;
  outlinePoints?: number[][];
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
  selectedElementIds: string[];
  activePresenterId: string | null;
  viewportSize: { width: number; height: number };

  // --- Local-only state ---
  activeTool: ToolType;
  camera: Camera;
  history: CanvasElement[][];
  historyIndex: number;
  eraserSize: number;
  pressurePenEnabled: boolean;
  pressureEraserEnabled: boolean;
  snapEnabled: boolean;
  gridSize: number;
  shortcuts: Record<string, string>;
  recentColors: string[];
  savedPalette: string[];
  commandPaletteOpen: boolean;
  layersPanelOpen: boolean;
  mobileLayersPanelOpen: boolean;
  mobileQuickDrawerOpen: boolean;
  commentsPanelOpen: boolean;
  commentsView: CommentsViewMode;
  calculatorOpen: boolean;
  shareDialogOpen: boolean;
  checkpointsDialogOpen: boolean;
  followPresenter: boolean;
  canvasBackgroundMode: CanvasBackgroundMode;
  recentCommandIds: string[];
  mentionUnreadCount: number;
  latestMentionCommentId: string | null;
  latestMentionElementId: string | null;
  focusElementRequest: { elementId: string; token: number } | null;
  filterQuery: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  isReadOnly: boolean;

  // --- Actions ---
  setActiveTool: (tool: ToolType) => void;
  setCursor: (cursor: { x: number; y: number } | null) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setActivePresenterId: (id: string | null) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  setCamera: (camera: Partial<Camera>) => void;
  setEraserSize: (size: number) => void;
  setPressurePenEnabled: (enabled: boolean) => void;
  setPressureEraserEnabled: (enabled: boolean) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setShortcut: (action: string, key: string) => void;
  pushRecentColor: (color: string) => void;
  savePaletteColor: (color: string) => void;
  removePaletteColor: (color: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setLayersPanelOpen: (open: boolean) => void;
  setMobileLayersPanelOpen: (open: boolean) => void;
  setMobileQuickDrawerOpen: (open: boolean) => void;
  setCommentsPanelOpen: (open: boolean) => void;
  setCommentsView: (view: CommentsViewMode) => void;
  setCalculatorOpen: (open: boolean) => void;
  setShareDialogOpen: (open: boolean) => void;
  setCheckpointsDialogOpen: (open: boolean) => void;
  setFollowPresenter: (follow: boolean) => void;
  setCanvasBackgroundMode: (mode: CanvasBackgroundMode) => void;
  pushRecentCommand: (commandId: string) => void;
  registerMention: (payload: {
    commentId: string;
    elementId: string | null;
    incrementUnread?: boolean;
  }) => void;
  setMentionInboxState: (payload: {
    unreadCount: number;
    latestCommentId: string | null;
    latestElementId: string | null;
  }) => void;
  markMentionsRead: () => void;
  clearMentionContext: () => void;
  requestElementFocus: (elementId: string) => void;
  clearElementFocusRequest: () => void;
  setFilterQuery: (query: string) => void;
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
  reorderElements: (ids: string[], direction: "front" | "back") => void;
  setElementsLocked: (ids: string[], locked: boolean) => void;
  setElementsHidden: (ids: string[], hidden: boolean) => void;
  groupElements: (ids: string[]) => string | null;
  ungroupElements: (groupId: string) => void;
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
      selectedElementIds: [],
      activePresenterId: null,
      viewportSize: { width: 0, height: 0 },

      // --- Local state ---
      activeTool: "select" as ToolType,
      camera: { x: 0, y: 0, zoom: 1 },
      history: [[]] as CanvasElement[][],
      historyIndex: 0,
      eraserSize: 14,
      pressurePenEnabled: true,
      pressureEraserEnabled: true,
      snapEnabled: false,
      gridSize: 16,
      shortcuts: {
        select: "v",
        lasso: "k",
        pan: "h",
        eraser: "e",
        pen: "p",
        rectangle: "r",
        ellipse: "o",
        line: "l",
        arrow: "a",
        text: "t",
      },
      recentColors: [],
      savedPalette: [],
      commandPaletteOpen: false,
      layersPanelOpen: true,
      mobileLayersPanelOpen: false,
      mobileQuickDrawerOpen: false,
      commentsPanelOpen: false,
      commentsView: "all",
      calculatorOpen: false,
      shareDialogOpen: false,
      checkpointsDialogOpen: false,
      followPresenter: false,
      canvasBackgroundMode: "plain",
      recentCommandIds: [],
      mentionUnreadCount: 0,
      latestMentionCommentId: null,
      latestMentionElementId: null,
      focusElementRequest: null,
      filterQuery: "",
      strokeColor: "#1e1e1e",
      fillColor: "transparent",
      strokeWidth: 2,
      isReadOnly: false,

      // --- Actions ---
      setActiveTool: (tool) =>
        set({ activeTool: tool, selectedElementId: null, selectedElementIds: [] }),

      setCursor: (cursor) => set({ cursor }),

      setSelectedElementId: (id) => set({ selectedElementId: id }),
      setSelectedElementIds: (ids) =>
        set({
          selectedElementIds: ids,
          selectedElementId: ids.length === 1 ? ids[0] : null,
        }),
      setActivePresenterId: (id) => set({ activePresenterId: id }),
      setViewportSize: (size) => set({ viewportSize: size }),

      setCamera: (partial) =>
        set((s) => ({ camera: { ...s.camera, ...partial } })),

      setEraserSize: (size) => set({ eraserSize: size }),
      setPressurePenEnabled: (enabled) => set({ pressurePenEnabled: enabled }),
      setPressureEraserEnabled: (enabled) => set({ pressureEraserEnabled: enabled }),
      setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
      setGridSize: (size) => set({ gridSize: Math.max(4, Math.min(128, Math.round(size))) }),
      setShortcut: (action, key) =>
        set((s) => ({
          shortcuts: { ...s.shortcuts, [action]: key.toLowerCase() },
        })),
      pushRecentColor: (color) =>
        set((s) => ({
          recentColors: [color, ...s.recentColors.filter((c) => c !== color)].slice(0, 8),
        })),
      savePaletteColor: (color) =>
        set((s) => ({
          savedPalette: s.savedPalette.includes(color)
            ? s.savedPalette
            : [...s.savedPalette, color].slice(0, 24),
        })),
      removePaletteColor: (color) =>
        set((s) => ({
          savedPalette: s.savedPalette.filter((c) => c !== color),
        })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setLayersPanelOpen: (open) => set({ layersPanelOpen: open }),
      setMobileLayersPanelOpen: (open) => set({ mobileLayersPanelOpen: open }),
      setMobileQuickDrawerOpen: (open) => set({ mobileQuickDrawerOpen: open }),
      setCommentsPanelOpen: (open) => set({ commentsPanelOpen: open }),
      setCommentsView: (view) => set({ commentsView: view }),
      setCalculatorOpen: (open) => set({ calculatorOpen: open }),
      setShareDialogOpen: (open) => set({ shareDialogOpen: open }),
      setCheckpointsDialogOpen: (open) => set({ checkpointsDialogOpen: open }),
      setFollowPresenter: (follow) => set({ followPresenter: follow }),
      setCanvasBackgroundMode: (mode) => set({ canvasBackgroundMode: mode }),
      pushRecentCommand: (commandId) =>
        set((s) => ({
          recentCommandIds: [commandId, ...s.recentCommandIds.filter((id) => id !== commandId)].slice(0, 12),
        })),
      registerMention: ({ commentId, elementId, incrementUnread = true }) =>
        set((s) => ({
          latestMentionCommentId: commentId,
          latestMentionElementId: elementId,
          mentionUnreadCount: incrementUnread ? s.mentionUnreadCount + 1 : s.mentionUnreadCount,
        })),
      setMentionInboxState: ({ unreadCount, latestCommentId, latestElementId }) =>
        set({
          mentionUnreadCount: Math.max(0, unreadCount),
          latestMentionCommentId: latestCommentId,
          latestMentionElementId: latestElementId,
        }),
      markMentionsRead: () => set({ mentionUnreadCount: 0 }),
      clearMentionContext: () =>
        set({
          mentionUnreadCount: 0,
          latestMentionCommentId: null,
          latestMentionElementId: null,
        }),
      requestElementFocus: (elementId) =>
        set({
          focusElementRequest: {
            elementId,
            token: Date.now() + Math.floor(Math.random() * 1000),
          },
        }),
      clearElementFocusRequest: () => set({ focusElementRequest: null }),
      setFilterQuery: (query) => set({ filterQuery: query }),
      setStrokeColor: (color) => set({ strokeColor: color }),
      setFillColor: (color) => set({ fillColor: color }),
      setReadOnly: (readOnly) => set({ isReadOnly: readOnly }),

      hydrateScene: ({ elements, camera }) =>
        set((s) => ({
          elements,
          camera: camera ? { ...s.camera, ...camera } : s.camera,
          selectedElementId: null,
          selectedElementIds: [],
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
      reorderElements: (ids, direction) =>
        set((s) => {
          const selected = s.elements.filter((el) => ids.includes(el.id));
          const unselected = s.elements.filter((el) => !ids.includes(el.id));
          const ordered =
            direction === "front"
              ? [...unselected, ...selected]
              : [...selected, ...unselected];
          return {
            elements: ordered.map((el, index) => ({ ...el, layerIndex: index })),
          };
        }),
      setElementsLocked: (ids, locked) =>
        set((s) => ({
          elements: s.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, locked } as CanvasElement) : el
          ),
        })),
      setElementsHidden: (ids, hidden) =>
        set((s) => ({
          elements: s.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, hidden } as CanvasElement) : el
          ),
        })),
      groupElements: (ids) => {
        if (!ids.length) return null;
        const groupId = generateId();
        set((s) => ({
          elements: s.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, groupId } as CanvasElement) : el
          ),
        }));
        return groupId;
      },
      ungroupElements: (groupId) =>
        set((s) => ({
          elements: s.elements.map((el) =>
            el.groupId === groupId ? ({ ...el, groupId: null } as CanvasElement) : el
          ),
        })),

      deleteElement: (id) =>
        (() => {
          set((s) => ({
            elements: s.elements.filter((el) => el.id !== id),
            selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
            selectedElementIds: s.selectedElementIds.filter((selectedId) => selectedId !== id),
          }));
        })(),

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
            selectedElementIds: [],
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
            selectedElementIds: [],
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
        selectedElementIds: true,
        activePresenterId: true,
        camera: true,
        viewportSize: true,
      },
    }
  )
);
