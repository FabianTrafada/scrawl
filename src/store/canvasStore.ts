import { create } from "zustand";
import { generateId } from "@/lib/utils";

export type ToolType =
  | "select"
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
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string; // data URL
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
  elements: CanvasElement[];
  activeTool: ToolType;
  selectedElementId: string | null;
  camera: Camera;
  history: CanvasElement[][];
  historyIndex: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;

  setActiveTool: (tool: ToolType) => void;
  setSelectedElementId: (id: string | null) => void;
  setCamera: (camera: Partial<Camera>) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;

  addElement: (element: Omit<CanvasElement, "id"> | Record<string, unknown>) => string;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  pushToHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  activeTool: "select",
  selectedElementId: null,
  camera: { x: 0, y: 0, zoom: 1 },
  history: [[]],
  historyIndex: 0,
  strokeColor: "#1e1e1e",
  fillColor: "transparent",
  strokeWidth: 2,

  setActiveTool: (tool) => set({ activeTool: tool, selectedElementId: null }),
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  setCamera: (partial) =>
    set((s) => ({ camera: { ...s.camera, ...partial } })),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),

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

  pushToHistory: () =>
    set((s) => {
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(structuredClone(s.elements));
      const maxHistory = 50;
      if (newHistory.length > maxHistory) newHistory.shift();
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return s;
      const newIndex = s.historyIndex - 1;
      return {
        elements: structuredClone(s.history[newIndex]),
        historyIndex: newIndex,
        selectedElementId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const newIndex = s.historyIndex + 1;
      return {
        elements: structuredClone(s.history[newIndex]),
        historyIndex: newIndex,
        selectedElementId: null,
      };
    }),
}));
