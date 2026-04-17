import { useCanvasStore } from "@/store/canvasStore";
import { getMathTemplateElements } from "@/lib/math-templates";
import type { MathTemplateId } from "@/types/collab";

type CanvasCenter = { x: number; y: number };

function getCanvasCenter(): CanvasCenter {
  const state = useCanvasStore.getState();
  const { camera, viewportSize } = state;
  const width = Math.max(320, viewportSize.width || window.innerWidth);
  const height = Math.max(240, viewportSize.height || window.innerHeight);

  return {
    x: (width / 2 - camera.x) / camera.zoom,
    y: (height / 2 - camera.y) / camera.zoom,
  };
}

function getTemplateOrigin(templateId: MathTemplateId, center: CanvasCenter): { x: number; y: number } {
  switch (templateId) {
    case "coord-plane":
    case "number-line":
      return center;
    case "table":
      return { x: center.x - 280, y: center.y - 120 };
    case "proof":
      return { x: center.x - 360, y: center.y - 210 };
    default:
      return center;
  }
}

export function insertMathTemplate(templateId: MathTemplateId): string[] {
  const state = useCanvasStore.getState();
  const center = getCanvasCenter();
  const origin = getTemplateOrigin(templateId, center);
  const elements = getMathTemplateElements(templateId, origin);
  if (!elements.length) return [];

  state.pushToHistory();

  const insertedIds: string[] = [];
  for (const element of elements) {
    const insertedId = state.addElement(element);
    insertedIds.push(insertedId);
  }

  const groupId = state.groupElements(insertedIds);
  if (groupId) {
    state.setSelectedElementIds(insertedIds);
    state.setSelectedElementId(insertedIds.length === 1 ? insertedIds[0] : null);
  }
  state.setActiveTool("select");
  return insertedIds;
}
