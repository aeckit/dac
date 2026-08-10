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

export interface SheetDocument {
  type: 'CAD::Sheet';
  sheetNumber: string;
  sheetName: string;
  paperSize: string;
  titleBlock?: string | DetailDocument;
  titleBlockOffsetX?: number;
  titleBlockOffsetY?: number;
  viewports: Viewport[];
}

export interface DrawingSetDocument {
  type: 'CAD::DrawingSet';
  project: string;
  titleBlockData?: Record<string, any>;
  titleBlock?: string | DetailDocument;
  titleBlockOffsetX?: number;
  titleBlockOffsetY?: number;
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
  const clean = scaleStr.replace(/\s+/g, '').replace(/['"]/g, '');
  if (clean.includes('1:1') || clean.includes('FULL')) return 1.0;

  if (clean === '1=1-0') return 1.0 / 12.0;
  if (clean === '1/2=1-0') return 0.5 / 12.0;
  if (clean === '1/4=1-0') return 0.25 / 12.0;
  if (clean === '1/8=1-0') return 0.125 / 12.0;
  if (clean === '3=1-0') return 3.0 / 12.0;
  if (clean === '1-1/2=1-0') return 1.5 / 12.0;
  if (clean === '3/4=1-0') return 0.75 / 12.0;
  if (clean === '3/8=1-0') return 0.375 / 12.0;
  if (clean === '3/16=1-0') return 0.1875 / 12.0;

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
  scale: number,
  canvasHeight?: number
) => string;

// SVG Line Drawer (Cartesian +Y = UP)
function drawLine(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const x1 = evaluateExpression(shape.x1, params);
  const y1 = canvasHeight - evaluateExpression(shape.y1, params);
  const x2 = evaluateExpression(shape.x2, params);
  const y2 = canvasHeight - evaluateExpression(shape.y2, params);
  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = ((shape.strokeWidth || 2) / 72) / scale;
  const dashArray = shape.strokeDasharray ? `stroke-dasharray="${shape.strokeDasharray}"` : '';

  const hitTarget = `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="transparent" stroke-width="0.5" pointer-events="stroke" class="line-hit-target" />`;
  const visibleLine = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashArray} stroke-linecap="round" />`;

  return `${hitTarget}\n${visibleLine}`;
}

// SVG Circle Drawer (Cartesian +Y = UP)
function drawCircle(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const cx = evaluateExpression(shape.cx, params);
  const cy = canvasHeight - evaluateExpression(shape.cy, params);
  const r = evaluateExpression(shape.r, params);
  const fillColor = shape.fill || 'none';
  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = ((shape.strokeWidth || 2) / 72) / scale;

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
}

// SVG Rectangle and Hatching Drawer (Cartesian +Y = UP)
function drawRectangle(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const x = evaluateExpression(shape.x, params);
  const rawY = evaluateExpression(shape.y, params);
  const w = evaluateExpression(shape.width, params);
  const h = evaluateExpression(shape.height, params);
  const y = canvasHeight - (rawY + h);
  const hatch = shape.hatch;

  let fillStr = 'fill="none"';
  let extraGraphics = '';

  if (hatch === 'Concrete') {
    fillStr = 'fill="url(#concrete-hatch)"';
  } else if (hatch === 'TimberCross') {
    fillStr = 'fill="rgba(120, 53, 15, 0.15)"';
    extraGraphics = `
      <line x1="${x}" y1="${canvasHeight - rawY}" x2="${x + w}" y2="${canvasHeight - (rawY + h)}" class="cad-hatch" stroke-width="${(1.5 / 72) / scale}" />
      <line x1="${x + w}" y1="${canvasHeight - rawY}" x2="${x}" y2="${canvasHeight - (rawY + h)}" class="cad-hatch" stroke-width="${(1.5 / 72) / scale}" />
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

// Annotative Dimension Line Drawer (Cartesian +Y = UP)
function drawDimension(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const x1 = evaluateExpression(shape.x1, params);
  const y1 = canvasHeight - evaluateExpression(shape.y1, params);
  const x2 = evaluateExpression(shape.x2, params);
  const y2 = canvasHeight - evaluateExpression(shape.y2, params);
  const rawOffset = ((shape.offset || 20) / 72) / scale;
  const offset = -rawOffset;
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

  const textOffset = rawOffset > 0 ? -(7 / 72) / scale : (10 / 72) / scale;
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

// Annotation: Text (Cartesian +Y = UP)
function drawText(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const x = evaluateExpression(shape.x, params);
  const y = canvasHeight - evaluateExpression(shape.y, params);
  const text = evaluateExpression(shape.text, params);
  const fontSize = ((shape.fontSize || 11) / 72) / scale;
  const color = shape.color || '#f1f5f9';

  return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" class="cad-text" dominant-baseline="auto">${text}</text>`;
}

// Annotation: TextBox (General Notes - Cartesian +Y = UP)
function drawTextBox(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const x = evaluateExpression(shape.x, params);
  const rawY = evaluateExpression(shape.y, params);
  const width = evaluateExpression(shape.width, params);

  const rawFontSize = shape.fontSize || 11;
  const cssScale = (1 / 72) / scale;
  const cssWidth = width / cssScale;

  const text = evaluateExpression(shape.text, params);
  const color = shape.color || '#f1f5f9';

  const y = canvasHeight - rawY;

  return `
    <foreignObject x="${x}" y="${y}" width="${width}" height="${width * 10}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: ${rawFontSize}px; width: ${cssWidth}px; transform: scale(${cssScale}); transform-origin: top left; color: ${color}; font-family: monospace; white-space: pre-wrap; margin: 0; padding: 0; line-height: 1.4;">${text}</div>
    </foreignObject>
  `;
}

// Annotation: Leader (Cartesian +Y = UP)
function drawLeader(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const anchorX = evaluateExpression(shape.x, params);
  const anchorY = canvasHeight - evaluateExpression(shape.y, params);

  const dx = evaluateExpression(shape.dx || 0, params);
  const dy = evaluateExpression(shape.dy || 0, params);

  const offsetX = dx / scale;
  const offsetY = -(dy / scale);

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

// Annotation: Image (Cartesian +Y = UP)
function drawImage(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number, canvasHeight = 18): string {
  const x = evaluateExpression(shape.x, params);
  const rawY = evaluateExpression(shape.y, params);
  const width = evaluateExpression(shape.width, params);
  const height = evaluateExpression(shape.height, params);
  const y = canvasHeight - (rawY + height);
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
  // Shorthand aliases for convenience
  "line": drawLine,
  "circle": drawCircle,
  "rect": drawRectangle,
  "dimension": drawDimension,
  "text": drawText,
  "textbox": drawTextBox,
  "leader": drawLeader,
  "image": drawImage,
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
      <marker id="origin-arrow-x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" fill="#f43f5e" />
      </marker>
      <marker id="origin-arrow-y" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" fill="#38bdf8" />
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
      
      .interactive-component text {
        pointer-events: bounding-box;
        cursor: pointer;
      }

      .selected-highlight rect, 
      .selected-highlight circle,
      .selected-highlight line {
        stroke: #06b6d4 !important;
        stroke-width: 0.06 !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: stroke 0.2s ease, stroke-width 0.1s ease;
      }
      .selected-highlight text {
        fill: #06b6d4 !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: fill 0.2s ease;
      }
      
      .interactive-component:hover rect,
      .interactive-component:hover circle,
      .interactive-component:hover line {
        stroke: #38bdf8;
        stroke-width: 0.05 !important;
        transition: stroke 0.15s ease, stroke-width 0.15s ease;
      }
      .interactive-component:hover text {
        fill: #38bdf8 !important;
        transition: fill 0.15s ease;
      }
    </style>
  `;
}

/**
 * Evaluates geometry shapes and groups them by componentId
 */
export function compileGeometryGroups(doc: DetailDocument, scale: number, globalParams: Record<string, number | boolean> = {}, canvasHeight = 18, isInteractive = true): string {
  const resolvedParams: Record<string, number | boolean> = { ...globalParams };

  if (doc.parameters) {
    for (const [key, param] of Object.entries(doc.parameters)) {
      if (resolvedParams[key] === undefined) {
        resolvedParams[key] = param.value !== undefined ? param.value : param.default;
      }
    }
  }

  const groups: Record<string, { type?: string; svgNodes: string[] }> = {};
  const renderedGroups: string[] = [];
  let autoIndex = 0;

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

      const svg = drawer(shape, resolvedParams, scale, canvasHeight);
      const cid = shape.componentId || `shape_${autoIndex++}`;
      const ctype = shape.componentType || shape.type.split('::').pop() || 'Shape';

      if (!groups[cid]) groups[cid] = { type: ctype, svgNodes: [] };
      groups[cid].svgNodes.push(svg);
    } catch (err) {
      console.error(`Failed to render shape type "${shape.type}":`, err);
    }
  }

  for (const [cid, group] of Object.entries(groups)) {
    const interactiveClasses = isInteractive ? 'interactive-component pointer-cursor' : '';
    renderedGroups.push(`
      <g data-component-id="${cid}" data-component-type="${group.type || ''}" class="${interactiveClasses}">
        ${group.svgNodes.join('\n')}
      </g>
    `);
  }

  return renderedGroups.join('\n');
}

/**
 * Renders a single DetailDocument into a standalone SVG (legacy mode / visualizer mode)
 */
/**
 * Generates a CAD UCS / Origin Indicator at (0,0) of model space
 */
function getOriginIndicator(canvasHeight = 18, scale = 1): string {
  const originX = 0;
  const originY = canvasHeight; // SVG Y coordinate corresponding to Cartesian Y = 0
  const arrowLen = 1.0 / scale; // Exactly 1 inch on paper (1 grid square)
  const strokeWidth = (2 / 72) / scale;
  const fontSize = (11 / 72) / scale;
  const circleRadius = (4 / 72) / scale;
  const labelOffsetX = (8 / 72) / scale;
  const labelOffsetY = (14 / 72) / scale;

  return `
    <!-- CAD Origin (0,0) / UCS Axis Indicator -->
    <g class="cad-origin-indicator" opacity="0.85" style="pointer-events: none;">
      <!-- Origin Dot -->
      <circle cx="${originX}" cy="${originY}" r="${circleRadius}" fill="#f43f5e" />
      
      <!-- X Axis (+X -> Right, Red/Pink) -->
      <line x1="${originX}" y1="${originY}" x2="${originX + arrowLen}" y2="${originY}" stroke="#f43f5e" stroke-width="${strokeWidth}" marker-end="url(#origin-arrow-x)" />
      <text x="${originX + arrowLen + labelOffsetX}" y="${originY}" font-size="${fontSize}" fill="#f43f5e" font-family="monospace" font-weight="bold" dominant-baseline="middle">X</text>
      
      <!-- Y Axis (+Y -> Up in Cartesian, -Y in SVG screen space, Cyan/Blue) -->
      <line x1="${originX}" y1="${originY}" x2="${originX}" y2="${originY - arrowLen}" stroke="#38bdf8" stroke-width="${strokeWidth}" marker-end="url(#origin-arrow-y)" />
      <text x="${originX}" y="${originY - arrowLen - labelOffsetY}" font-size="${fontSize}" fill="#38bdf8" font-family="monospace" font-weight="bold" text-anchor="middle">Y</text>
      
      <!-- (0,0) Coordinate Label -->
      <text x="${originX - labelOffsetX}" y="${originY + labelOffsetY}" font-size="${(9 / 72) / scale}" fill="#94a3b8" font-family="monospace" text-anchor="end">(0,0)</text>
    </g>
  `;
}

export function renderDetail(doc: DetailDocument, sandboxWidth: number = 24, sandboxHeight: number = 18): string {
  const scale = resolveScaleMultiplier(doc.scale);
  const width = sandboxWidth;
  const height = sandboxHeight;

  const geometries = compileGeometryGroups(doc, scale, {}, sandboxHeight);
  const originIndicator = getOriginIndicator(sandboxHeight, scale);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow: visible;">
      ${getDefs()}
      <defs>
        <pattern id="infinite-grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="1" y2="0" class="grid-line" />
          <line x1="0" y1="0" x2="0" y2="1" class="grid-line" />
        </pattern>
      </defs>
      <rect x="-5000" y="-5000" width="10000" height="10000" class="blueprint-bg" />
      <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#infinite-grid)" />
      <g class="drawing-extents" transform="translate(1, 1) scale(${scale})">
        ${originIndicator}
        ${geometries}
      </g>
      ${getStyles()}
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
  titleBlockDoc?: DetailDocument,
  tbOffsetX = 0,
  tbOffsetY = 0
): string {
  const { width, height } = getPaperDimensions(sheet.paperSize);
  let sheetContent = '';

  // Render Title Block
  if (titleBlockDoc) {
    // Title block is rendered at 1:1 scale
    const tbScale = resolveScaleMultiplier('1:1');
    const tbSvg = compileGeometryGroups(titleBlockDoc, tbScale, titleBlockData, height, false);
    
    // translating by (x, -y) is correct in SVG coordinate space (since +Y is down in SVG, and we want to move it UP).
    sheetContent += `\n<!-- Title Block -->\n<g id="title-block-layer" transform="translate(${tbOffsetX}, ${-tbOffsetY})">${tbSvg}</g>`;
  }

  // Render Viewports
  sheetContent += '\n<!-- Viewports -->\n';
  for (const vp of sheet.viewports) {
    const detailId = typeof vp.detail === 'string' ? vp.detail : 'inline-detail';
    const detailDoc = typeof vp.detail === 'string' ? viewportsMap.get(vp.detail) : vp.detail;

    if (detailDoc) {
      const vpScaleMultiplier = resolveScaleMultiplier(vp.scale);
      const vpCanvasHeight = 18;
      const vpSvg = compileGeometryGroups(detailDoc, vpScaleMultiplier, titleBlockData, vpCanvasHeight, false);
      const vpX = Number(vp.x);
      const vpY = Number(vp.y);
      const vpSvgY = height - vpY - (vpCanvasHeight * vpScaleMultiplier);
      const cidAttr = vp.componentId ? ` data-component-id="${vp.componentId}" data-component-type="CAD::Viewport"` : '';
      
      const clipId = `clip-${vp.componentId || Math.random().toString(36).substring(7)}`;
      const hasDimensions = vp.width !== undefined && vp.height !== undefined;
      const clipDef = hasDimensions ? `<clipPath id="${clipId}"><rect x="0" y="${vpCanvasHeight - vp.height! / vpScaleMultiplier}" width="${vp.width! / vpScaleMultiplier}" height="${vp.height! / vpScaleMultiplier}" /></clipPath>` : '';
      const clipAttr = hasDimensions ? ` clip-path="url(#${clipId})"` : '';
      
      const cropX = vp.cropX || 0;
      const cropY = vp.cropY || 0;
      
      // Compute actual Title
      let displayTitle = vp.title || '';
      if (!displayTitle && typeof vp.detail === 'string') {
        // Fallback to filename (e.g. "../detail-prototype.json" -> "Detail Prototype")
        const basename = vp.detail.split('/').pop() || '';
        displayTitle = basename.replace('.json', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      
      // Title and Scale label SVG elements
      let labelsSvg = '';
      if (hasDimensions) {
        const titlePos = vp.titlePosition || 'bottom';
        const titleOffsetY = (vp.titleOffsetY || 0) / vpScaleMultiplier;
        
        const topEdge = vpCanvasHeight - (vp.height! / vpScaleMultiplier);
        const bottomEdge = vpCanvasHeight;
        
        const circleRadius = 0.25 / vpScaleMultiplier;
        const lineY = titlePos === 'top' 
            ? topEdge - circleRadius - (0.125 / vpScaleMultiplier) - titleOffsetY
            : bottomEdge + circleRadius + (0.125 / vpScaleMultiplier) + titleOffsetY;
            
        const circleCx = circleRadius;
        const circleCy = lineY;
        const lineStartX = circleCx + circleRadius;
        const lineEndX = vp.width! / vpScaleMultiplier;
        
        const displayDetailNumber = vp.hideDetailNumber ? '' : (vp.detailNumber || '1');
        const textStartX = vp.hideDetailNumber ? 0 : lineStartX + (0.1 / vpScaleMultiplier);
        
        if (!vp.hideDetailNumber) {
          labelsSvg += `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" fill="none" stroke="#f1f5f9" stroke-width="${1.5 / 72 / vpScaleMultiplier}" />\n`;
          labelsSvg += `<text x="${circleCx}" y="${circleCy}" font-size="${0.25 / vpScaleMultiplier}" fill="#f1f5f9" font-family="monospace" text-anchor="middle" dominant-baseline="central">${displayDetailNumber}</text>\n`;
        }
        
        // The line
        labelsSvg += `<line x1="${vp.hideDetailNumber ? 0 : lineStartX}" y1="${lineY}" x2="${lineEndX}" y2="${lineY}" stroke="#f1f5f9" stroke-width="${1.5 / 72 / vpScaleMultiplier}" />\n`;
        
        // Title Text
        if (!vp.hideTitle) {
          const textY = lineY - (0.1 / vpScaleMultiplier);
          labelsSvg += `<text x="${textStartX}" y="${textY}" font-size="${0.2 / vpScaleMultiplier}" fill="#f1f5f9" font-family="monospace" font-weight="bold" dominant-baseline="alphabetic">${displayTitle.toUpperCase()}</text>\n`;
        }
        
        // Scale Text
        if (!vp.hideScale) {
          const textY = lineY + (0.1 / vpScaleMultiplier);
          labelsSvg += `<text x="${textStartX}" y="${textY}" font-size="${0.125 / vpScaleMultiplier}" fill="#94a3b8" font-family="monospace" dominant-baseline="hanging">${vp.scale}</text>\n`;
        }
        
        // Optional Title Note
        if (vp.titleNote) {
          const textX = lineEndX;
          const textY = lineY + (0.1 / vpScaleMultiplier);
          labelsSvg += `<text x="${textX}" y="${textY}" font-size="${0.125 / vpScaleMultiplier}" fill="#94a3b8" font-family="monospace" text-anchor="end" dominant-baseline="hanging">${vp.titleNote}</text>\n`;
        }
      } else {
        const titleY = vpCanvasHeight - (0.5 / vpScaleMultiplier);
        if (!vp.hideTitle) {
          labelsSvg += `<text x="0" y="${titleY}" font-size="${0.5 / vpScaleMultiplier}" fill="#f1f5f9" font-family="monospace" font-weight="bold">${displayTitle.toUpperCase()}</text>\n`;
        }
        if (!vp.hideScale) {
          labelsSvg += `<text x="0" y="${titleY - (0.5 / vpScaleMultiplier)}" font-size="${0.35 / vpScaleMultiplier}" fill="#94a3b8" font-family="monospace">SCALE: ${vp.scale}</text>\n`;
        }
      }

      sheetContent += `
        ${hasDimensions ? `<defs>${clipDef}</defs>` : ''}
        <g${cidAttr} class="${vp.componentId ? 'interactive-component pointer-cursor ' : ''}" data-viewport-id="viewport-${detailId}" transform="translate(${vpX}, ${vpSvgY}) scale(${vpScaleMultiplier})">
          <g${clipAttr}>
            <g transform="translate(${-cropX}, ${cropY})">
              ${vpSvg}
            </g>
          </g>
          ${labelsSvg}
          ${hasDimensions ? `<rect x="0" y="${vpCanvasHeight - vp.height! / vpScaleMultiplier}" width="${vp.width! / vpScaleMultiplier}" height="${vp.height! / vpScaleMultiplier}" fill="none" stroke="#475569" stroke-width="${1 / 72 / vpScaleMultiplier}" stroke-dasharray="0.1, 0.1" />` : ''}
        </g>
      `;
    } else {
      console.warn(`Detail not found for viewport: ${detailId}`);
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background-color: #0f172a; overflow: visible;">
      ${getDefs()}
      <g class="drawing-extents">
        <rect x="0" y="0" width="${width}" height="${height}" class="blueprint-bg" />
        ${sheetContent}
      </g>
      ${getStyles()}
    </svg>
  `;
}
