"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { getStroke } from "perfect-freehand";
import {
  useCanvasStore,
  type CanvasElement,
} from "@/store/canvasStore";
import { screenToCanvas, type Point } from "@/lib/utils";

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
  elementStartX: number;
  elementStartY: number;
  elementStartX2?: number;
  elementStartY2?: number;
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

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null);

  const elements = useCanvasStore((s) => s.elements);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectedElementId = useCanvasStore((s) => s.selectedElementId);
  const camera = useCanvasStore((s) => s.camera);
  const strokeColor = useCanvasStore((s) => s.strokeColor);
  const fillColor = useCanvasStore((s) => s.fillColor);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const addElement = useCanvasStore((s) => s.addElement);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const deleteElement = useCanvasStore((s) => s.deleteElement);
  const pushToHistory = useCanvasStore((s) => s.pushToHistory);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);

  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const textEditorRef = useRef<TextEditorState | null>(null);
  const textCommitGuard = useRef(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textEditor) return;

      if (e.key === " ") {
        e.preventDefault();
        setSpaceHeld(true);
      }

      const key = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey) {
        switch (key) {
          case "v": setActiveTool("select"); break;
          case "p": setActiveTool("pen"); break;
          case "r": setActiveTool("rectangle"); break;
          case "o": setActiveTool("ellipse"); break;
          case "l": setActiveTool("line"); break;
          case "a": setActiveTool("arrow"); break;
          case "t": setActiveTool("text"); break;
          case "delete":
          case "backspace":
            if (selectedElementId) {
              pushToHistory();
              deleteElement(selectedElementId);
            }
            break;
        }
      }

      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") setSpaceHeld(false);
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (textEditor) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (!dataUrl) return;

            const img = new Image();
            img.onload = () => {
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

              addElement({
                type: "image" as const,
                x: center.x - w / 2,
                y: center.y - h / 2,
                width: w,
                height: h,
                src: dataUrl,
                strokeColor: "transparent",
                fillColor: "transparent",
                strokeWidth: 0,
                opacity: 1,
              });
              pushToHistory();
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
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
  }, [textEditor, selectedElementId, setActiveTool, pushToHistory, deleteElement, undo, redo, camera, addElement]);

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
    return () => svg?.removeEventListener("wheel", handleWheel);
  }, [camera, setCamera]);

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || spaceHeld) {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (e.button !== 0) return;

      const pt = getCanvasPoint(e);

      if (activeTool === "select") {
        setSelectedElementId(null);
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

      // Drawing tools
      if (
        activeTool === "pen" ||
        activeTool === "rectangle" ||
        activeTool === "ellipse" ||
        activeTool === "line" ||
        activeTool === "arrow"
      ) {
        (e.target as Element)?.setPointerCapture?.(e.pointerId);
        setDrawing({
          type: activeTool,
          startX: pt.x,
          startY: pt.y,
          currentX: pt.x,
          currentY: pt.y,
          points: [[pt.x, pt.y, e.pressure || 0.5]],
        });
      }
    },
    [activeTool, getCanvasPoint, spaceHeld, setSelectedElementId]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
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
        const pt = getCanvasPoint(e);
        const dx = pt.x - dragging.startX;
        const dy = pt.y - dragging.startY;

        const updates: Record<string, number> = {
          x: dragging.elementStartX + dx,
          y: dragging.elementStartY + dy,
        };

        if (dragging.elementStartX2 !== undefined && dragging.elementStartY2 !== undefined) {
          updates.x2 = dragging.elementStartX2 + dx;
          updates.y2 = dragging.elementStartY2 + dy;
        }

        updateElement(dragging.elementId, updates);
        return;
      }

      if (!drawing) return;

      const pt = getCanvasPoint(e);

      if (drawing.type === "pen") {
        setDrawing({
          ...drawing,
          points: [...drawing.points, [pt.x, pt.y, e.pressure || 0.5]],
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
    [isPanning, panStart, resizing, dragging, drawing, camera, getCanvasPoint, setCamera, updateElement, elements]
  );

  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
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

    setDrawing(null);
  }, [drawing, dragging, resizing, isPanning, addElement, pushToHistory, strokeColor, fillColor, strokeWidth]);

  const handleElementSelect = useCallback(
    (id: string) => {
      setActiveTool("select");
      setSelectedElementId(id);

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
          setDragging({
            elementId: id,
            startX: pt.x,
            startY: pt.y,
            elementStartX: el.x,
            elementStartY: el.y,
            elementStartX2: (el as { x2?: number }).x2,
            elementStartY2: (el as { y2?: number }).y2,
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
    [elements, camera, setSelectedElementId, setActiveTool]
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
        updateElement(editor.editingId, {
          content,
          isLatex,
          width: measuredSize.width,
          height: measuredSize.height,
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
        });
      }

      pushToHistory();
      setTextEditor(null);
      textEditorRef.current = null;
    },
    [addElement, updateElement, pushToHistory, strokeColor]
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

    if (drawing.type === "pen" && drawing.points.length > 0) {
      const stroke = getStroke(drawing.points, {
        size: 8,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        simulatePressure: true,
      });
      const pathData = getSvgPathFromStroke(stroke);
      return <path d={pathData} fill={strokeColor} stroke="none" />;
    }

    if (drawing.type === "rectangle") {
      const x = Math.min(drawing.startX, drawing.currentX);
      const y = Math.min(drawing.startY, drawing.currentY);
      const w = Math.abs(drawing.currentX - drawing.startX);
      const h = Math.abs(drawing.currentY - drawing.startY);
      return (
        <rect
          x={x} y={y} width={w} height={h}
          fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
          strokeDasharray="6,3" opacity={0.6}
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
          fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
          strokeDasharray="6,3" opacity={0.6}
        />
      );
    }

    if (drawing.type === "line" || drawing.type === "arrow") {
      return (
        <line
          x1={drawing.startX} y1={drawing.startY}
          x2={drawing.currentX} y2={drawing.currentY}
          stroke={strokeColor} strokeWidth={strokeWidth}
          strokeDasharray="6,3" opacity={0.6}
        />
      );
    }

    return null;
  };

  const cursorStyle = spaceHeld || isPanning
    ? "grab"
    : activeTool === "select"
    ? "default"
    : activeTool === "text"
    ? "text"
    : "crosshair";

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
      >
        <defs>
          <pattern
            id="grid"
            width={20 * camera.zoom}
            height={20 * camera.zoom}
            patternUnits="userSpaceOnUse"
            x={camera.x % (20 * camera.zoom)}
            y={camera.y % (20 * camera.zoom)}
          >
            <circle
              cx={1}
              cy={1}
              r={1}
              fill="var(--border-oat)"
            />
          </pattern>
          <filter id="selection-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--color-slushie-500)" floodOpacity="0.6" />
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${camera.x},${camera.y}) scale(${camera.zoom})`}>
          {elements.map((el) => {
            switch (el.type) {
              case "pen":
                return (
                  <PenElement
                    key={el.id}
                    element={el}
                    isSelected={el.id === selectedElementId}
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
                    isSelected={el.id === selectedElementId}
                    onSelect={handleElementSelect}
                  />
                );
              case "text":
                return (
                  <TextElementRenderer
                    key={el.id}
                    element={el}
                    isSelected={el.id === selectedElementId}
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
                    isSelected={el.id === selectedElementId}
                    onSelect={handleElementSelect}
                  />
                );
              default:
                return null;
            }
          })}

          {renderDrawingPreview()}

          {/* Resize handles for selected element */}
          {selectedElementId && (() => {
            const sel = elements.find((e) => e.id === selectedElementId);
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
