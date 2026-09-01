export interface GeometryPrimitive {
  type: string;
  x?: any;
  y?: any;
  x1?: any;
  y1?: any;
  x2?: any;
  y2?: any;
  cx?: any;
  cy?: any;
  r?: any;
  dx?: any;
  dy?: any;
  width?: any;
  height?: any;
  text?: any;
  fontSize?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  cropX?: any;
  cropY?: any;
  imgWidth?: any;
  imgHeight?: any;
  hatch?: string;
  offset?: number;
  href?: string;
  lockAspectRatio?: boolean;
  componentId?: string;
  componentType?: string;
  visible?: any;
  // Construct Reference properties
  constructId?: string;
  rotation?: number;
  parameterOverrides?: Record<string, any>;
}

export interface ParameterOption {
  label: string;
  value: any;
  variables?: Record<string, number | string | boolean>;
}

export interface ParameterDefinition {
  type: string;
  default: any;
  value?: any;
  componentId?: string;
  min?: number;
  max?: number;
  label?: string;
  options?: ParameterOption[];
}

export interface DetailDocument {
  type: 'CAD::Detail';
  version: string;
  scale: string;
  parameters?: Record<string, ParameterDefinition>;
  geometry: GeometryPrimitive[];
}

export interface Viewport {
  detail: string | DetailDocument;
  x: any;
  y: any;
  scale: string;
  width?: number;
  height?: number;
  cropX?: number;
  cropY?: number;
  title?: string;
  hideTitle?: boolean;
  hideScale?: boolean;
  detailNumber?: string;
  hideDetailNumber?: boolean;
  titlePosition?: 'top' | 'bottom';
  titleOffsetY?: number;
  titleNote?: string;
  componentId?: string;
}

export interface TitleBlockDocument {
  type: 'CAD::TitleBlock';
  version: string;
  parameters?: Record<string, ParameterDefinition>;
  geometry: GeometryPrimitive[];
}

export interface ConstructDocument {
  type: 'CAD::Construct';
  version: string;
  parameters?: Record<string, ParameterDefinition>;
  geometry: GeometryPrimitive[];
}

export interface SheetConfiguration {
  type: 'CAD::SheetConfiguration';
  sheetNumber: string;
  sheetName: string;
  titleBlockOffsetX?: number;
  titleBlockOffsetY?: number;
  viewports: Viewport[];
  geometry?: GeometryPrimitive[];
}

export interface ProjectDocument {
  type: 'CAD::Project';
  projectName: string;
  defaultTitleBlockRef?: string | TitleBlockDocument;
  defaultPaperSize?: string;
  titleBlockOffsetX?: number;
  titleBlockOffsetY?: number;
  parameters?: Record<string, any>;
  sheets: (string | SheetConfiguration)[];
}

export type VisualizerDocument = DetailDocument | ProjectDocument | SheetConfiguration | TitleBlockDocument | ConstructDocument;