import type {
  GeometryPrimitive,
  DetailDocument,
  ConstructDocument,
  TitleBlockDocument,
  SheetConfiguration,
  ProjectDocument,
  Viewport,
  VisualizerDocument,
  ParameterDefinition
} from '@aeckit/dac-schema';

export type {
  GeometryPrimitive,
  DetailDocument,
  ConstructDocument,
  TitleBlockDocument,
  SheetConfiguration,
  ProjectDocument,
  Viewport,
  VisualizerDocument,
  ParameterDefinition
};

export interface SolvedPrimitive {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  dx?: number;
  dy?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number | string;
  color?: string;
  fill?: string;
  strokeWidth?: number | string;
  strokeDasharray?: string;
  cropX?: number;
  cropY?: number;
  imgWidth?: number;
  imgHeight?: number;
  hatch?: string;
  offset?: number | string;
  href?: string;
  lockAspectRatio?: boolean;
  componentId?: string;
  componentType?: string;
  visible?: boolean;
  rotation?: number | string;
  [key: string]: any;
}

export interface SolvedGroup {
  componentId: string;
  componentType: string;
  shapes: SolvedPrimitive[];
}

export interface SolvedDetailLayout {
  scaleMultiplier: number;
  canvasWidth: number;
  canvasHeight: number;
  groups: SolvedGroup[];
}

export interface SolvedViewport {
  viewportId: string;
  detailId: string;
  detailNumber: string;
  displayTitle: string;
  x: number;
  y: number;
  scaleMultiplier: number;
  width?: number;
  height?: number;
  cropX?: number;
  cropY?: number;
  hideDetailNumber?: boolean;
  hideTitle?: boolean;
  hideScale?: boolean;
  titlePosition?: 'top' | 'bottom';
  titleOffsetY?: number;
  titleNote?: string;
  resolvedDetailGroups: SolvedGroup[];
}

export interface SolvedSheetLayout {
  sheetNumber: string;
  sheetName: string;
  paperWidth: number;
  paperHeight: number;
  titleBlockGroups?: SolvedGroup[];
  titleBlockOffsetX: number;
  titleBlockOffsetY: number;
  sheetGeometryGroups?: SolvedGroup[];
  viewports: SolvedViewport[];
}
