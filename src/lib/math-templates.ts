import type {
  ArrowElement,
  CanvasElement,
  LineElement,
  RectangleElement,
  TextElement,
} from "@/store/canvasStore";
import { generateId } from "@/lib/utils";
import type { MathTemplateId } from "@/types/collab";

type Origin = { x: number; y: number };

function mkLine(origin: Origin, dx1: number, dy1: number, dx2: number, dy2: number): LineElement {
  return {
    id: generateId(),
    type: "line",
    x: origin.x + dx1,
    y: origin.y + dy1,
    x2: origin.x + dx2,
    y2: origin.y + dy2,
    strokeColor: "#000000",
    fillColor: "transparent",
    strokeWidth: 2,
    opacity: 1,
  };
}

function mkArrow(origin: Origin, dx1: number, dy1: number, dx2: number, dy2: number): ArrowElement {
  return {
    id: generateId(),
    type: "arrow",
    x: origin.x + dx1,
    y: origin.y + dy1,
    x2: origin.x + dx2,
    y2: origin.y + dy2,
    strokeColor: "#000000",
    fillColor: "transparent",
    strokeWidth: 2,
    opacity: 1,
  };
}

function mkText(origin: Origin, dx: number, dy: number, content: string): TextElement {
  return {
    id: generateId(),
    type: "text",
    x: origin.x + dx,
    y: origin.y + dy,
    content,
    fontSize: 20,
    isLatex: false,
    strokeColor: "#000000",
    fillColor: "transparent",
    strokeWidth: 0,
    opacity: 1,
    width: Math.max(50, content.length * 10),
    height: 30,
    userResized: false,
  };
}

function mkRect(origin: Origin, dx: number, dy: number, width: number, height: number): RectangleElement {
  return {
    id: generateId(),
    type: "rectangle",
    x: origin.x + dx,
    y: origin.y + dy,
    width,
    height,
    strokeColor: "#000000",
    fillColor: "transparent",
    strokeWidth: 2,
    opacity: 1,
  };
}

function coordinatePlane(origin: Origin): CanvasElement[] {
  const elements: CanvasElement[] = [];
  elements.push(mkArrow(origin, -220, 0, 220, 0));
  elements.push(mkArrow(origin, 0, 180, 0, -180));

  for (let i = -10; i <= 10; i += 1) {
    if (i === 0) continue;
    const x = i * 20;
    elements.push(mkLine(origin, x, -4, x, 4));
    if (i % 2 === 0) {
      elements.push(mkText(origin, x - 6, 8, `${i}`));
    }
  }

  for (let i = -8; i <= 8; i += 1) {
    if (i === 0) continue;
    const y = i * 20;
    elements.push(mkLine(origin, -4, y, 4, y));
    if (i % 2 === 0) {
      elements.push(mkText(origin, 8, y - 8, `${-i}`));
    }
  }

  elements.push(mkText(origin, 224, 4, "x"));
  elements.push(mkText(origin, 8, -190, "y"));
  return elements;
}

function numberLine(origin: Origin): CanvasElement[] {
  const elements: CanvasElement[] = [];
  elements.push(mkArrow(origin, -260, 0, 260, 0));
  for (let i = -10; i <= 10; i += 1) {
    const x = i * 24;
    elements.push(mkLine(origin, x, -8, x, 8));
    elements.push(mkText(origin, x - 7, 12, `${i}`));
  }
  elements.push(mkText(origin, -260, -30, "Number line"));
  return elements;
}

function tableTemplate(origin: Origin): CanvasElement[] {
  const elements: CanvasElement[] = [];
  const cols = 4;
  const rows = 4;
  const cellW = 140;
  const cellH = 64;
  elements.push(mkRect(origin, 0, 0, cols * cellW, rows * cellH));

  for (let c = 1; c < cols; c += 1) {
    elements.push(mkLine(origin, c * cellW, 0, c * cellW, rows * cellH));
  }
  for (let r = 1; r < rows; r += 1) {
    elements.push(mkLine(origin, 0, r * cellH, cols * cellW, r * cellH));
  }

  elements.push(mkText(origin, 16, 18, "Given"));
  elements.push(mkText(origin, 156, 18, "Work"));
  elements.push(mkText(origin, 296, 18, "Result"));
  elements.push(mkText(origin, 436, 18, "Check"));
  return elements;
}

function proofTemplate(origin: Origin): CanvasElement[] {
  const elements: CanvasElement[] = [];
  elements.push(mkRect(origin, 0, 0, 720, 420));
  elements.push(mkLine(origin, 240, 0, 240, 420));
  elements.push(mkLine(origin, 0, 72, 720, 72));
  elements.push(mkText(origin, 16, 18, "Statement"));
  elements.push(mkText(origin, 256, 18, "Reason"));

  for (let r = 1; r <= 5; r += 1) {
    const y = 72 + r * 58;
    elements.push(mkLine(origin, 0, y, 720, y));
    elements.push(mkText(origin, 16, y - 36, `${r}.`));
  }

  elements.push(mkText(origin, 16, 392, "QED"));
  return elements;
}

export function getMathTemplateElements(templateId: MathTemplateId, origin: Origin): CanvasElement[] {
  switch (templateId) {
    case "coord-plane":
      return coordinatePlane(origin);
    case "number-line":
      return numberLine(origin);
    case "table":
      return tableTemplate(origin);
    case "proof":
      return proofTemplate(origin);
    default:
      return [];
  }
}
