import type {
  DetailDocument,
  ProjectDocument,
  SheetConfiguration,
  TitleBlockDocument,
  ConstructDocument,
  VisualizerDocument,
  GeometryPrimitive,
  Viewport
} from '@aeckit/dac-schema';

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

export interface LeaderOptions extends ShapeOptions {
  dx?: number;
  dy?: number;
  shoulderLength?: number;
  strokeWidth?: number | string;
  strokeDasharray?: string;
  color?: string;
  text?: string;
  fontSize?: number | string;
}

export interface DimensionOptions extends ShapeOptions {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  offset?: number | string;
  text?: string;
  textOverride?: string;
  prefix?: string;
  suffix?: string;
  secondaryText?: string;
  textPosition?: 'above' | 'below';
  format?: 'decimal' | 'architectural';
  fontSize?: number | string;
  color?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
}

export interface CircleOptions extends ShapeOptions {
  cx?: number;
  cy?: number;
  r?: number;
}

export interface PolylineOptions extends ShapeOptions {
  closed?: boolean;
  cornerRadius?: number | string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
  color?: string;
  rotation?: number | string;
  visible?: any;
  hatch?: string;
}

export interface ImageOptions extends ShapeOptions {
  url?: string;
  width?: number;
  height?: number;
}

export interface ViewportOptions extends ShapeOptions {
  width?: number;
  height?: number;
  printBorder?: boolean;
}
