export type ExportFormat = "pdf" | "png" | "jpg" | "svg";
export type ExportScope = "content" | "viewport";
export type ExportPdfMode = "auto" | "manual";
export type ExportOrientation = "portrait" | "landscape";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExportPageFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportSettings {
  format: ExportFormat;
  scope: ExportScope;
  includeBackground: boolean;
  rasterScale: number;
  pdfMode: ExportPdfMode;
  orientation: ExportOrientation;
  dpi: 150 | 300 | 600;
  marginMm: number;
  scalePercent: number;
  manualFrames: ExportPageFrame[];
}

export interface CanvasExportRequest {
  requestId: string;
  roomId?: string;
  settings: ExportSettings;
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: "pdf",
  scope: "content",
  includeBackground: true,
  rasterScale: 2,
  pdfMode: "auto",
  orientation: "portrait",
  dpi: 300,
  marginMm: 10,
  scalePercent: 100,
  manualFrames: [],
};
