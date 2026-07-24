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
  hatch?: string;
  offset?: number;
  space?: string;
  href?: string;
  componentId?: string;
  componentType?: string;
  visible?: any;
}

export interface DetailDocument {
  type: 'CAD::Detail';
  version: string;
  scale: string;
  parameters?: Record<string, { type: string; default: any; value?: any; componentId?: string; min?: number; max?: number; label?: string }>;
  geometry: GeometryPrimitive[];
}

export interface Viewport {
  detail: string | DetailDocument;
  x: any;
  y: any;
  scale: string;
}

export interface SheetDocument {
  type: 'CAD::Sheet';
  sheetNumber: string;
  sheetName: string;
  paperSize: string;
  titleBlock?: string | DetailDocument;
  viewports: Viewport[];
}

export interface DrawingSetDocument {
  type: 'CAD::DrawingSet';
  project: string;
  titleBlockData?: Record<string, any>;
  sheets: (string | SheetDocument)[];
}

export type VisualizerDocument = DetailDocument | DrawingSetDocument | SheetDocument;

/**
 * Returns the scale multiplier (model inches to paper inches).
 */
export function resolveScaleMultiplier(scaleStr: string): number {
  if (typeof scaleStr !== 'string') {
    console.warn('resolveScaleMultiplier called with non-string:', scaleStr);
    return 1.0;
  }
  const clean = scaleStr.replace(/\s+/g, '').replace(/\\"/g, '"').replace(/'/g, '');
  if (clean.includes('1:1') || clean.includes('FULL')) return 1.0;

  if (clean === '1"=1-0') return 1.0 / 12.0;
  if (clean === '1/2"=1-0') return 0.5 / 12.0;
  if (clean === '1/4"=1-0') return 0.25 / 12.0;
  if (clean === '1/8"=1-0') return 0.125 / 12.0;
  if (clean === '3"=1-0') return 3.0 / 12.0;
  if (clean === '1-1/2"=1-0') return 1.5 / 12.0;
  if (clean === '3/4"=1-0') return 0.75 / 12.0;
  if (clean === '3/8"=1-0') return 0.375 / 12.0;
  if (clean === '3/16"=1-0') return 0.1875 / 12.0;

  return 1.0 / 12.0;
}

export function evaluateExpression(expr: any, params: Record<string, number | boolean>): any {
  if (typeof expr !== 'string') return expr;

  if (!expr.includes('{parameters.')) {
    const num = Number(expr);
    return isNaN(num) ? expr : num;
  }

  let parsed = expr;
  for (const [key, val] of Object.entries(params)) {
    parsed = parsed.split(`{parameters.${key}}`).join(String(val));
  }

  parsed = parsed.replace(/px/g, '');

  try {
    return new Function(`return (${parsed})`)();
  } catch (err) {
    return parsed;
  }
}

type ShapeDrawer = (
  shape: GeometryPrimitive,
  resolvedParams: Record<string, number | boolean>,
  scale: number
) => string;

// SVG Line Drawer
function drawLine(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x1 = evaluateExpression(shape.x1, params);
  const y1 = evaluateExpression(shape.y1, params);
  const x2 = evaluateExpression(shape.x2, params);
  const y2 = evaluateExpression(shape.y2, params);
  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = ((shape.strokeWidth || 2) / 72) / scale;
  const dashArray = shape.strokeDasharray ? `stroke-dasharray="${shape.strokeDasharray}"` : '';

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashArray} stroke-linecap="round" />`;
}

// SVG Circle Drawer
function drawCircle(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const cx = evaluateExpression(shape.cx, params);
  const cy = evaluateExpression(shape.cy, params);
  const r = evaluateExpression(shape.r, params);
  const fillColor = shape.fill || 'none';
  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = ((shape.strokeWidth || 2) / 72) / scale;

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
}

// SVG Rectangle and Hatching Drawer
function drawRectangle(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x = evaluateExpression(shape.x, params);
  const y = evaluateExpression(shape.y, params);
  const w = evaluateExpression(shape.width, params);
  const h = evaluateExpression(shape.height, params);
  const hatch = shape.hatch;

  let fillStr = 'fill="none"';
  let extraGraphics = '';

  if (hatch === 'Concrete') {
    fillStr = 'fill="url(#concrete-hatch)"';
  } else if (hatch === 'TimberCross') {
    fillStr = 'fill="rgba(120, 53, 15, 0.15)"';
    extraGraphics = `
      <line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" class="cad-hatch" stroke-width="${(1.5 / 72) / scale}" />
      <line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" class="cad-hatch" stroke-width="${(1.5 / 72) / scale}" />
    `;
  } else if (shape.fill) {
    fillStr = `fill="${shape.fill}"`;
  }

  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = ((shape.strokeWidth || 2) / 72) / scale;

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" ${fillStr} stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" />
    ${extraGraphics}
  `;
}

// Annotative Dimension Line Drawer
function drawDimension(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x1 = evaluateExpression(shape.x1, params);
  const y1 = evaluateExpression(shape.y1, params);
  const x2 = evaluateExpression(shape.x2, params);
  const y2 = evaluateExpression(shape.y2, params);
  const offset = ((shape.offset || 20) / 72) / scale;
  const text = String(evaluateExpression(shape.text, params));

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  if (len < 0.1) return '';

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const ox1 = x1 + nx * offset;
  const oy1 = y1 + ny * offset;
  const ox2 = x2 + nx * offset;
  const oy2 = y2 + ny * offset;

  const extStart = (5 / 72) / scale;
  const extEnd = offset + (offset > 0 ? (5 / 72) / scale : -(5 / 72) / scale);

  const ex1_start = x1 + nx * extStart;
  const ey1_start = y1 + ny * extStart;
  const ex1_end = x1 + nx * extEnd;
  const ey1_end = y1 + ny * extEnd;

  const ex2_start = x2 + nx * extStart;
  const ey2_start = y2 + ny * extStart;
  const ex2_end = x2 + nx * extEnd;
  const ey2_end = y2 + ny * extEnd;

  const tx = (ox1 + ox2) / 2;
  const ty = (oy1 + oy2) / 2;

  const textOffset = offset > 0 ? (7 / 72) / scale : -(10 / 72) / scale;
  const textX = tx + nx * textOffset;
  const textY = ty + ny * textOffset + (3 / 72) / scale;

  const strokeWidth = (1.5 / 72) / scale;
  const fontSize = (11 / 72) / scale;

  return `
    <!-- Extension lines -->
    <line x1="${ex1_start}" y1="${ey1_start}" x2="${ex1_end}" y2="${ey1_end}" class="dimension-line" stroke-width="${strokeWidth}" />
    <line x1="${ex2_start}" y1="${ey2_start}" x2="${ex2_end}" y2="${ey2_end}" class="dimension-line" stroke-width="${strokeWidth}" />
    
    <!-- Dimension line -->
    <line x1="${ox1}" y1="${oy1}" x2="${ox2}" y2="${oy2}" stroke="#06b6d4" stroke-width="${strokeWidth}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
    <text x="${textX}" y="${textY}" font-size="${fontSize}" class="dim-text">${text}</text>
  `;
}

// Annotation: Text
function drawText(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x = evaluateExpression(shape.x, params);
  const y = evaluateExpression(shape.y, params);
  const text = evaluateExpression(shape.text, params);
  const fontSize = ((shape.fontSize || 11) / 72) / scale;
  const color = shape.color || '#f1f5f9';

  return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" class="cad-text" dominant-baseline="hanging">${text}</text>`;
}

// Annotation: TextBox (General Notes)
function drawTextBox(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x = evaluateExpression(shape.x, params);
  const y = evaluateExpression(shape.y, params);
  const width = evaluateExpression(shape.width, params);

  const rawFontSize = shape.fontSize || 11;
  const cssScale = (1 / 72) / scale;
  const cssWidth = width / cssScale;

  const text = evaluateExpression(shape.text, params);
  const color = shape.color || '#f1f5f9';

  return `
    <foreignObject x="${x}" y="${y}" width="${width}" height="${width * 10}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: ${rawFontSize}px; width: ${cssWidth}px; transform: scale(${cssScale}); transform-origin: top left; color: ${color}; font-family: monospace; white-space: pre-wrap; margin: 0; padding: 0; line-height: 1.4;">${text}</div>
    </foreignObject>
  `;
}

// Annotation: Leader
function drawLeader(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const anchorX = evaluateExpression(shape.x, params);
  const anchorY = evaluateExpression(shape.y, params);

  const dx = evaluateExpression(shape.dx || 0, params);
  const dy = evaluateExpression(shape.dy || 0, params);

  const offsetX = dx / scale;
  const offsetY = dy / scale;

  const textX = anchorX + offsetX;
  const textY = anchorY + offsetY;

  const fontSize = ((shape.fontSize || 11) / 72) / scale;
  const strokeWidth = (1.5 / 72) / scale;
  const text = evaluateExpression(shape.text, params);
  const color = shape.color || '#06b6d4';

  return `
    <line x1="${anchorX}" y1="${anchorY}" x2="${textX}" y2="${textY}" class="dimension-line" stroke="${color}" stroke-width="${strokeWidth}" marker-start="url(#arrow)" />
    <text x="${textX + (offsetX > 0 ? (5 / 72) / scale : -(5 / 72) / scale)}" y="${textY + (3 / 72) / scale}" font-size="${fontSize}" fill="${color}" class="cad-text" text-anchor="${offsetX > 0 ? 'start' : 'end'}" dominant-baseline="middle">${text}</text>
  `;
}

// Annotation: Image
function drawImage(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x = evaluateExpression(shape.x, params);
  const y = evaluateExpression(shape.y, params);
  const width = evaluateExpression(shape.width, params);
  const height = evaluateExpression(shape.height, params);
  const href = shape.href;

  return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${href}" preserveAspectRatio="xMidYMid meet" />`;
}

export const L1_REGISTRY: Record<string, ShapeDrawer> = {
  "CAD::Shape::Line": drawLine,
  "CAD::Shape::Circle": drawCircle,
  "CAD::Shape::Rectangle": drawRectangle,
  "CAD::Annotation::Dimension": drawDimension,
  "CAD::Annotation::Text": drawText,
  "CAD::Annotation::TextBox": drawTextBox,
  "CAD::Annotation::Leader": drawLeader,
  "CAD::Annotation::Image": drawImage,
};

function getDefs(): string {
  return `
    <defs>
      <pattern id="concrete-hatch" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="15" r="1" fill="#475569"/>
        <circle cx="45" cy="20" r="1.5" fill="#475569"/>
        <circle cx="20" cy="45" r="1" fill="#475569"/>
        <circle cx="50" cy="50" r="1" fill="#475569"/>
        <path d="M 5,35 L 12,32 L 8,40 Z" class="concrete-aggregate" fill="none" stroke="#64748b" stroke-width="1.5" />
        <path d="M 35,10 L 42,15 L 33,18 Z" class="concrete-aggregate" fill="none" stroke="#64748b" stroke-width="1.5" />
        <path d="M 40,40 L 48,35 L 45,45 Z" class="concrete-aggregate" fill="none" stroke="#64748b" stroke-width="1.5" />
      </pattern>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" class="dimension-arrow" fill="#06b6d4" />
      </marker>
    </defs>
  `;
}

function getStyles(): string {
  return `
    <style>
      .blueprint-bg { fill: #0f172a; }
      .grid-line { stroke: #1e293b; stroke-width: 0.01; }
      .cad-outline { stroke: #f8fafc; stroke-width: 0.025; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .cad-hatch { stroke: #475569; }
      .dimension-line { stroke: #06b6d4; stroke-dasharray: 0.04,0.04; }
      .cad-text { fill: #f1f5f9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: bold; }
      .dim-text { fill: #06b6d4; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: bold; text-anchor: middle; }
      .pointer-cursor { cursor: pointer; }
      
      .selected-highlight rect, 
      .selected-highlight circle {
        stroke: #06b6d4 !important;
        stroke-width: 0.05 !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: stroke 0.2s ease, stroke-width 0.1s ease;
      }
      .selected-highlight line {
        stroke: #06b6d4 !important;
        transition: stroke 0.2s ease;
      }
      
      .interactive-component:hover rect,
      .interactive-component:hover circle {
        stroke: #38bdf8;
        transition: stroke 0.15s ease;
      }
    </style>
  `;
}

/**
 * Evaluates geometry shapes and groups them by componentId
 */
function compileGeometryGroups(doc: DetailDocument, scale: number, globalParams: Record<string, number | boolean> = {}): string {
  const resolvedParams: Record<string, number | boolean> = { ...globalParams };

  if (doc.parameters) {
    for (const [key, param] of Object.entries(doc.parameters)) {
      resolvedParams[key] = param.value !== undefined ? param.value : param.default;
    }
  }

  const groups: Record<string, { type?: string; svgNodes: string[] }> = {};
  const renderedGroups: string[] = [];

  for (const shape of doc.geometry) {
    const drawer = L1_REGISTRY[shape.type];
    if (!drawer) {
      console.warn(`Unknown shape type encountered: ${shape.type}`);
      continue;
    }

    try {
      if (shape.visible !== undefined) {
        const isVisible = evaluateExpression(shape.visible, resolvedParams);
        if (isVisible === false || isVisible === 'false' || isVisible === 0) continue;
      }

      const svg = drawer(shape, resolvedParams, scale);
      const cid = shape.componentId;
      const ctype = shape.componentType;

      if (cid) {
        if (!groups[cid]) groups[cid] = { type: ctype, svgNodes: [] };
        groups[cid].svgNodes.push(svg);
      } else {
        renderedGroups.push(svg);
      }
    } catch (err) {
      console.error(`Failed to render shape type "${shape.type}":`, err);
    }
  }

  for (const [cid, group] of Object.entries(groups)) {
    renderedGroups.push(`
      <g data-component-id="${cid}" data-component-type="${group.type || ''}" class="interactive-component pointer-cursor">
        ${group.svgNodes.join('\n')}
      </g>
    `);
  }

  return renderedGroups.join('\n');
}

/**
 * Renders a single DetailDocument into a standalone SVG (legacy mode / visualizer mode)
 */
export function renderDetail(doc: DetailDocument, sandboxWidth: number = 24, sandboxHeight: number = 18): string {
  const scale = resolveScaleMultiplier(doc.scale);
  const width = sandboxWidth;
  const height = sandboxHeight;

  const geometries = compileGeometryGroups(doc, scale);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
      ${getStyles()}
      ${getDefs()}
      <defs>
        <pattern id="infinite-grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="1" y2="0" class="grid-line" />
          <line x1="0" y1="0" x2="0" y2="1" class="grid-line" />
        </pattern>
      </defs>
      <rect x="-5000" y="-5000" width="10000" height="10000" class="blueprint-bg" />
      <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#infinite-grid)" />
      <g transform="translate(1, 1) scale(${scale})">
        ${geometries}
      </g>
    </svg>
  `;
}

/**
 * Maps paper sizes to physical inches
 */
function getPaperDimensions(size: string): { width: number; height: number } {
  switch (size.toLowerCase()) {
    case 'arch d': return { width: 36, height: 24 };
    case 'arch c': return { width: 24, height: 18 };
    case 'ansi b': return { width: 17, height: 11 };
    case 'letter': return { width: 11, height: 8.5 };
    default: return { width: 36, height: 24 };
  }
}

/**
 * Renders a full SheetDocument with an embedded title block and viewports
 */
export function renderSheet(
  sheet: SheetDocument,
  titleBlockData: Record<string, any>,
  viewportsMap: Map<string, DetailDocument>,
  titleBlockDoc?: DetailDocument
): string {
  const { width, height } = getPaperDimensions(sheet.paperSize);
  let sheetContent = '';

  // Render Title Block
  if (titleBlockDoc) {
    // Title block is rendered at 1:1 scale
    const tbScale = resolveScaleMultiplier('1:1');
    const tbSvg = compileGeometryGroups(titleBlockDoc, tbScale, titleBlockData);
    sheetContent += `\n<!-- Title Block -->\n<g id="title-block-layer">${tbSvg}</g>`;
  }

  // Render Viewports
  sheetContent += '\n<!-- Viewports -->\n';
  for (const vp of sheet.viewports) {
    const detailId = typeof vp.detail === 'string' ? vp.detail : 'inline-detail';
    const detailDoc = typeof vp.detail === 'string' ? viewportsMap.get(vp.detail) : vp.detail;

    if (detailDoc) {
      const vpScaleMultiplier = resolveScaleMultiplier(vp.scale);
      const vpSvg = compileGeometryGroups(detailDoc, vpScaleMultiplier, titleBlockData);

      sheetContent += `
        <g id="viewport-${detailId}" transform="translate(${vp.x}, ${vp.y}) scale(${vpScaleMultiplier})">
          ${vpSvg}
        </g>
      `;
    } else {
      console.warn(`Detail not found for viewport: ${detailId}`);
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #0f172a; overflow: visible;">
      ${getStyles()}
      ${getDefs()}
      <rect x="0" y="0" width="${width}" height="${height}" class="blueprint-bg" />
      ${sheetContent}
    </svg>
  `;
}
