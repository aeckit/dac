import type {
  DetailDocument,
  ProjectDocument,
  SheetConfiguration,
  TitleBlockDocument,
  ConstructDocument,
  VisualizerDocument,
  GeometryPrimitive,
  Viewport
} from '@dac/schema';

export type {
  DetailDocument,
  ProjectDocument,
  SheetConfiguration,
  TitleBlockDocument,
  ConstructDocument,
  VisualizerDocument,
  GeometryPrimitive,
  Viewport
};

export interface ShapeOptions {
  x?: number;
  y?: number;
  fill?: string;
  [key: string]: any;
}

export interface RectangleOptions extends ShapeOptions {
  width?: number;
  height?: number;
}

export interface LineOptions extends ShapeOptions {
  x2?: number;
  y2?: number;
}

export interface TextOptions extends ShapeOptions {
  text?: string;
  fontSize?: number;
}

export interface ImageOptions extends ShapeOptions {
  url?: string;
  width?: number;
  height?: number;
}

export interface ViewportOptions extends ShapeOptions {
  width?: number;
  height?: number;
}
