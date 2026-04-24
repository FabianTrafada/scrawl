import { toast } from "sonner";
import type { ExportPageFrame, ExportSettings, Rect } from "@/lib/export/types";
import { mmToPx, getA4PageMm, buildAutoFrames } from "@/lib/export/pagination";

type ExportContext = {
  svgRoot: SVGSVGElement;
  camera: { x: number; y: number; zoom: number };
  viewport: { width: number; height: number };
  roomId?: string;
  contentBounds: Rect | null;
};

const EXPORT_CSS_VARIABLES = [
  "--background",
  "--border-oat",
  "--color-slushie-500",
  "--tool-default-stroke",
  "--tool-default-stroke-glow",
  "--font-hand",
  "--color-warm-charcoal",
  "--color-warm-silver",
] as const;

function unionRect(a: Rect, b: Rect): Rect {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.w, b.x + b.w);
  const maxY = Math.max(a.y + a.h, b.y + b.h);
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function timestampSlug() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mm = `${now.getMinutes()}`.padStart(2, "0");
  return `${y}${m}${d}-${hh}${mm}`;
}

function getExportFilename(base: string, extension: string) {
  return `${base}-${timestampSlug()}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function serializeSvg(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

function encodeSvg(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

async function rasterizeSvgToBlob(params: {
  svgString: string;
  crop: Rect;
  outWidth: number;
  outHeight: number;
  mimeType: "image/png" | "image/jpeg";
  quality?: number;
  includeBackground: boolean;
}): Promise<Blob> {
  const img = new Image();
  img.decoding = "sync";
  const src = encodeSvg(params.svgString);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to decode SVG for export"));
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(params.outWidth));
  canvas.height = Math.max(1, Math.round(params.outHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create export canvas context");

  if (params.includeBackground) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const sourceW = img.width;
  const sourceH = img.height;

  const crop = params.crop;
  const ix = Math.max(0, crop.x);
  const iy = Math.max(0, crop.y);
  const iRight = Math.min(sourceW, crop.x + crop.w);
  const iBottom = Math.min(sourceH, crop.y + crop.h);
  const iw = Math.max(0, iRight - ix);
  const ih = Math.max(0, iBottom - iy);

  if (iw > 0 && ih > 0) {
    const dx = ((ix - crop.x) / crop.w) * canvas.width;
    const dy = ((iy - crop.y) / crop.h) * canvas.height;
    const dw = (iw / crop.w) * canvas.width;
    const dh = (ih / crop.h) * canvas.height;
    ctx.drawImage(img, ix, iy, iw, ih, dx, dy, dw, dh);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, params.mimeType, params.quality);
  });
  if (!blob) throw new Error("Failed to create image blob");
  return blob;
}

function cloneSceneSvg(svgRoot: SVGSVGElement, canvasRect: Rect): SVGSVGElement {
  const clone = svgRoot.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", `${canvasRect.w}`);
  clone.setAttribute("height", `${canvasRect.h}`);
  clone.setAttribute("viewBox", `${canvasRect.x} ${canvasRect.y} ${canvasRect.w} ${canvasRect.h}`);

  clone.querySelectorAll("[data-export-scene='true']").forEach((node) => {
    node.removeAttribute("transform");
  });

  const removableSelectors = [
    "[data-export-ignore='true']",
    "[data-export-guide='true']",
    "[data-export-hitbox='true']",
  ];
  for (const selector of removableSelectors) {
    clone.querySelectorAll(selector).forEach((node) => node.remove());
  }

  clone.querySelectorAll("[filter='url(#selection-glow)']").forEach((node) => {
    node.removeAttribute("filter");
  });

  const css = collectExportCssText();
  if (css.trim().length > 0) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = css;
    clone.prepend(styleEl);
  }

  const rootStyles = getComputedStyle(document.documentElement);
  for (const variable of EXPORT_CSS_VARIABLES) {
    const value = rootStyles.getPropertyValue(variable).trim();
    if (!value) continue;
    clone.style.setProperty(variable, value);
  }

  return clone;
}

function collectExportCssText(): string {
  const collected = new Set<string>();

  const includeSheet = (sheet: CSSStyleSheet): string[] => {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      return [];
    }

    const hasKatex = Array.from(rules).some((rule) => rule.cssText.includes(".katex"));
    if (hasKatex) {
      return Array.from(rules, (rule) => rule.cssText);
    }

    const focusedRules = Array.from(rules)
      .map((rule) => rule.cssText)
      .filter(
        (text) =>
          text.includes(".canvas-text-latex") ||
          text.includes(".katex-display")
      );
    return focusedRules;
  };

  for (const sheet of Array.from(document.styleSheets)) {
    for (const cssText of includeSheet(sheet as CSSStyleSheet)) {
      collected.add(cssText);
    }
  }

  return Array.from(collected).join("\n");
}

function removeOptionalBackground(svg: SVGSVGElement) {
  svg.querySelectorAll("[data-export-background='true']").forEach((node) => node.remove());
}

function getViewportRect(camera: { x: number; y: number; zoom: number }, viewport: { width: number; height: number }): Rect {
  return {
    x: -camera.x / camera.zoom,
    y: -camera.y / camera.zoom,
    w: viewport.width / camera.zoom,
    h: viewport.height / camera.zoom,
  };
}

function normalizeBaseRect(ctx: ExportContext, settings: ExportSettings): Rect {
  if (settings.scope === "viewport") {
    return getViewportRect(ctx.camera, ctx.viewport);
  }
  if (ctx.contentBounds) {
    return {
      x: ctx.contentBounds.x,
      y: ctx.contentBounds.y,
      w: Math.max(1, ctx.contentBounds.w),
      h: Math.max(1, ctx.contentBounds.h),
    };
  }
  return getViewportRect(ctx.camera, ctx.viewport);
}

function getPageFrames(ctx: ExportContext, settings: ExportSettings, baseRect: Rect): ExportPageFrame[] {
  if (settings.pdfMode === "manual" && settings.manualFrames.length > 0) {
    return settings.manualFrames;
  }

  return buildAutoFrames(baseRect, {
    orientation: settings.orientation,
    marginMm: settings.marginMm,
    scalePercent: settings.scalePercent,
    maxPages: 300,
  });
}

async function exportSvg(ctx: ExportContext, settings: ExportSettings) {
  const base = normalizeBaseRect(ctx, settings);
  const svg = cloneSceneSvg(ctx.svgRoot, base);
  if (!settings.includeBackground) {
    removeOptionalBackground(svg);
  }
  const blob = new Blob([serializeSvg(svg)], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, getExportFilename(`scrawl-${ctx.roomId ? `room-${ctx.roomId.slice(0, 8)}` : "local"}`, "svg"));
}

async function exportRaster(ctx: ExportContext, settings: ExportSettings, kind: "png" | "jpg") {
  const base = normalizeBaseRect(ctx, settings);
  const svg = cloneSceneSvg(ctx.svgRoot, base);
  if (!settings.includeBackground) {
    removeOptionalBackground(svg);
  }
  const svgString = serializeSvg(svg);

  const outWidth = Math.max(1, Math.round(base.w * settings.rasterScale));
  const outHeight = Math.max(1, Math.round(base.h * settings.rasterScale));

  const blob = await rasterizeSvgToBlob({
    svgString,
    crop: { x: 0, y: 0, w: base.w, h: base.h },
    outWidth,
    outHeight,
    mimeType: kind === "png" ? "image/png" : "image/jpeg",
    quality: kind === "jpg" ? 0.92 : undefined,
    includeBackground: kind === "jpg" ? true : settings.includeBackground,
  });

  downloadBlob(blob, getExportFilename(`scrawl-${ctx.roomId ? `room-${ctx.roomId.slice(0, 8)}` : "local"}`, kind));
}

async function exportPdf(ctx: ExportContext, settings: ExportSettings) {
  const base = normalizeBaseRect(ctx, settings);
  const frames = getPageFrames(ctx, settings, base);
  if (frames.length === 0) {
    throw new Error("No pages to export");
  }

  const pageMm = getA4PageMm(settings.orientation);
  const printableMm = {
    width: Math.max(1, pageMm.width - settings.marginMm * 2),
    height: Math.max(1, pageMm.height - settings.marginMm * 2),
  };
  const printablePx = {
    width: mmToPx(printableMm.width, settings.dpi),
    height: mmToPx(printableMm.height, settings.dpi),
  };

  const sourceRect = frames.reduce<Rect>((acc, frame) => {
    return unionRect(acc, {
      x: frame.x,
      y: frame.y,
      w: frame.width,
      h: frame.height,
    });
  }, base);

  const svgRoot = cloneSceneSvg(ctx.svgRoot, sourceRect);
  if (!settings.includeBackground) {
    removeOptionalBackground(svgRoot);
  }
  const svgString = serializeSvg(svgRoot);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: settings.orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    const blob = await rasterizeSvgToBlob({
      svgString,
      crop: {
        x: frame.x - sourceRect.x,
        y: frame.y - sourceRect.y,
        w: frame.width,
        h: frame.height,
      },
      outWidth: printablePx.width,
      outHeight: printablePx.height,
      mimeType: "image/png",
      includeBackground: settings.includeBackground,
    });

    const dataUrl = await blobToDataUrl(blob);
    if (i > 0) pdf.addPage();
    pdf.addImage(
      dataUrl,
      "PNG",
      settings.marginMm,
      settings.marginMm,
      printableMm.width,
      printableMm.height,
      undefined,
      "FAST"
    );
  }

  const out = pdf.output("blob");
  downloadBlob(out, getExportFilename(`scrawl-${ctx.roomId ? `room-${ctx.roomId.slice(0, 8)}` : "local"}`, "pdf"));
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function performCanvasExport(ctx: ExportContext, settings: ExportSettings): Promise<void> {
  try {
    if (settings.format === "svg") {
      await exportSvg(ctx, settings);
      toast.success("SVG exported");
      return;
    }
    if (settings.format === "png") {
      await exportRaster(ctx, settings, "png");
      toast.success("PNG exported");
      return;
    }
    if (settings.format === "jpg") {
      await exportRaster(ctx, settings, "jpg");
      toast.success("JPG exported");
      return;
    }

    await exportPdf(ctx, settings);
    toast.success("PDF exported");
  } catch (err) {
    console.error(err);
    toast.error("Export failed", {
      description: "Try lower DPI or check image CORS permissions.",
    });
  }
}
