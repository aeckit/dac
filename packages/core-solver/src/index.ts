export interface ParameterDefinition {
  type: 'Number' | 'Boolean';
  default: number | boolean;
  value?: number | boolean; // Current user adjusted value
  min?: number;
  max?: number;
  label: string;
  componentId?: string; // Links this parameter to a component ID for form grouping
}

export interface GeometryPrimitive {
  type: string;          // e.g. "AEC::Shape::Rectangle", "AEC::Shape::Line"
  componentId: string;   // The L2 component it belongs to (for visual grouping/clicks)
  componentType: string; // The L2 component type (for UI form header)
  [key: string]: any;    // Coordinates & attributes (which can be math expressions)
}

export interface DetailDocument {
  version: string;
  scale: string; // e.g. "1/2\" = 1'-0\""
  parameters: Record<string, ParameterDefinition>;
  geometry: GeometryPrimitive[];
}

/**
 * Parses scale strings like '1/2" = 1\'-0\'' (which is 1:24) or '1" = 1\'-0\'' (1:12)
 * Returns the scale multiplier (screen pixels per real-world inch).
 * Baseline scale: 12 pixels per inch at 1:1.
 */
export function resolveScaleMultiplier(scaleStr: string): number {
  const clean = scaleStr.replace(/\s+/g, '').replace(/\\"/g, '"').replace(/'/g, '');
  
  // Full size 1:1
  if (clean.includes('1:1') || clean.includes('FULL')) {
    return 12.0;
  }

  // E.g. "1/2\"=1-0\"" -> 1/2" is to 12" -> 0.5 / 12 = 1/24 scale
  const match = clean.match(/^([\d/]+)"=1-0"/);
  if (match) {
    const fraction = match[1];
    let val = 1.0;
    if (fraction.includes('/')) {
      const parts = fraction.split('/');
      val = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      val = parseFloat(fraction);
    }
    // Return pixels per real-world inch.
    // Let's say at 1/2" scale, 1 real-world foot (12") equals 60 screen pixels.
    // 60 pixels / 12 inches = 5 pixels per inch.
    // Scaling multiplier: 12 * (val / 12) * 10 = val * 10
    return val * 10.0;
  }

  return 6.0; // Default fallback
}

/**
 * Safely evaluates math expressions replacing parameters placeholder strings
 */
export function evaluateExpression(expr: any, params: Record<string, number | boolean>): any {
  if (typeof expr !== 'string') return expr;
  
  // Check if string contains parameters brackets
  if (!expr.includes('{parameters.')) {
    // If it's a numeric string, return it as a number if possible
    const num = Number(expr);
    return isNaN(num) ? expr : num;
  }

  let parsed = expr;
  for (const [key, val] of Object.entries(params)) {
    parsed = parsed.split(`{parameters.${key}}`).join(String(val));
  }

  // Remove units or letters that might cause evaluation errors, leaving pure algebra
  parsed = parsed.replace(/px/g, '');

  try {
    // Safely evaluate simple arithmetic using dynamic evaluation
    return new Function(`return (${parsed})`)();
  } catch (err) {
    // If it is a template string (e.g. "1.5 in"), it will fail arithmetic evaluation.
    // Return the replaced string so that it displays the updated parameter value.
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
  const x1 = evaluateExpression(shape.x1, params) * scale;
  const y1 = evaluateExpression(shape.y1, params) * scale;
  const x2 = evaluateExpression(shape.x2, params) * scale;
  const y2 = evaluateExpression(shape.y2, params) * scale;
  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = shape.strokeWidth || 2;
  const dashArray = shape.strokeDasharray ? `stroke-dasharray="${shape.strokeDasharray}"` : '';

  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashArray} stroke-linecap="round" />`;
}

// SVG Circle Drawer
function drawCircle(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const cx = evaluateExpression(shape.cx, params) * scale;
  const cy = evaluateExpression(shape.cy, params) * scale;
  const r = evaluateExpression(shape.r, params) * scale;
  const fillColor = shape.fill || 'none';
  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = shape.strokeWidth || 2;

  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
}

// SVG Rectangle and Hatching Drawer
function drawRectangle(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x = evaluateExpression(shape.x, params) * scale;
  const y = evaluateExpression(shape.y, params) * scale;
  const w = evaluateExpression(shape.width, params) * scale;
  const h = evaluateExpression(shape.height, params) * scale;
  const hatch = shape.hatch;
  
  let fillStr = 'fill="none"';
  let extraGraphics = '';

  if (hatch === 'Concrete') {
    fillStr = 'fill="url(#concrete-hatch)"';
  } else if (hatch === 'TimberCross') {
    fillStr = 'fill="rgba(120, 53, 15, 0.15)"'; // Amber tint
    // Draw wood diagonal end grain X
    extraGraphics = `
      <line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" class="cad-hatch" />
      <line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" class="cad-hatch" />
    `;
  } else if (shape.fill) {
    fillStr = `fill="${shape.fill}"`;
  }

  const strokeColor = shape.color || '#f8fafc';
  const strokeWidth = shape.strokeWidth || 2.5;

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" ${fillStr} stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" />
    ${extraGraphics}
  `;
}

// Annotative Dimension Line Drawer
function drawDimension(shape: GeometryPrimitive, params: Record<string, number | boolean>, scale: number): string {
  const x1 = evaluateExpression(shape.x1, params) * scale;
  const y1 = evaluateExpression(shape.y1, params) * scale;
  const x2 = evaluateExpression(shape.x2, params) * scale;
  const y2 = evaluateExpression(shape.y2, params) * scale;
  const offset = shape.offset || 40; // Perpendicular offset in screen pixels (Paper space)
  const text = String(evaluateExpression(shape.text, params));

  // Compute direction and normal vectors
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  
  if (len < 0.1) return ''; // Prevent division by zero

  const ux = dx / len;
  const uy = dy / len;

  // Normal vector pointing outwards (perpendicular)
  const nx = -uy;
  const ny = ux;

  // Dimension line endpoints shifted along the normal
  const ox1 = x1 + nx * offset;
  const oy1 = y1 + ny * offset;
  const ox2 = x2 + nx * offset;
  const oy2 = y2 + ny * offset;

  // Extension helper lines (with 5px overshoot)
  const extStart = 5;
  const extEnd = offset + (offset > 0 ? 5 : -5);

  const ex1_start = x1 + nx * extStart;
  const ey1_start = y1 + ny * extStart;
  const ex1_end = x1 + nx * extEnd;
  const ey1_end = y1 + ny * extEnd;

  const ex2_start = x2 + nx * extStart;
  const ey2_start = y2 + ny * extStart;
  const ex2_end = x2 + nx * extEnd;
  const ey2_end = y2 + ny * extEnd;

  // Text alignment center coordinates
  const tx = (ox1 + ox2) / 2;
  const ty = (oy1 + oy2) / 2;

  // Position text slightly off the dimension line (e.g. 7px along normal)
  const textOffset = offset > 0 ? 7 : -10;
  const textX = tx + nx * textOffset;
  const textY = ty + ny * textOffset + 3; // +3 for vertical text center align

  return `
    <!-- Extension lines -->
    <line x1="${ex1_start}" y1="${ey1_start}" x2="${ex1_end}" y2="${ey1_end}" class="dimension-line" />
    <line x1="${ex2_start}" y1="${ey2_start}" x2="${ex2_end}" y2="${ey2_end}" class="dimension-line" />
    
    <!-- Dimension line with arrowheads -->
    <line x1="${ox1}" y1="${oy1}" x2="${ox2}" y2="${oy2}" stroke="#06b6d4" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)" />
    
    <!-- Text annotation -->
    <text x="${textX}" y="${textY}" class="dim-text">${text}</text>
  `;
}

// L1 Renderer Registry Map
export const L1_REGISTRY: Record<string, ShapeDrawer> = {
  "AEC::Shape::Line": drawLine,
  "AEC::Shape::Circle": drawCircle,
  "AEC::Shape::Rectangle": drawRectangle,
  "AEC::Annotation::Dimension": drawDimension,
};

/**
 * Compiles a DetailDocument into a valid high-fidelity SVG string
 */
export function renderDetail(doc: DetailDocument): string {
  const scale = resolveScaleMultiplier(doc.scale);

  // SVG dimensions
  const width = 600;
  const height = 450;

  // 1. Resolve parameters values
  const resolvedParams: Record<string, number | boolean> = {};
  for (const [key, param] of Object.entries(doc.parameters)) {
    resolvedParams[key] = param.value !== undefined ? param.value : param.default;
  }

  // 2. Render and Group geometry shapes by componentId
  const groups: Record<string, { type: string; svgNodes: string[] }> = {};

  for (const shape of doc.geometry) {
    const drawer = L1_REGISTRY[shape.type];
    if (!drawer) {
      console.warn(`Unknown shape type encountered: ${shape.type}`);
      continue;
    }

    try {
      // Evaluate visibility condition if defined
      if (shape.visible !== undefined) {
        const isVisible = evaluateExpression(shape.visible, resolvedParams);
        if (isVisible === false || isVisible === 'false' || isVisible === 0) {
          continue; // Skip rendering this shape primitive
        }
      }

      const svg = drawer(shape, resolvedParams, scale);
      
      const cid = shape.componentId;
      const ctype = shape.componentType;
      
      if (!groups[cid]) {
        groups[cid] = { type: ctype, svgNodes: [] };
      }
      groups[cid].svgNodes.push(svg);
    } catch (err) {
      console.error(`Failed to render shape ID "${shape.id}" of type "${shape.type}":`, err);
    }
  }

  // 3. Compile SVG group strings
  const renderedGroups: string[] = [];
  for (const [cid, group] of Object.entries(groups)) {
    renderedGroups.push(`
      <g data-component-id="${cid}" data-component-type="${group.type}" class="interactive-component pointer-cursor">
        ${group.svgNodes.join('\n')}
      </g>
    `);
  }

  // 4. Generate drawing grid lines
  const gridLines: string[] = [];
  for (let i = 0; i <= height; i += 40) {
    gridLines.push(`<line x1="0" y1="${i}" x2="${width}" y2="${i}" class="grid-line" />`);
  }
  for (let i = 0; i <= width; i += 40) {
    gridLines.push(`<line x1="${i}" y1="0" x2="${i}" y2="${height}" class="grid-line" />`);
  }

  // Return SVG XML
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <style>
        .blueprint-bg { fill: #0f172a; }
        .grid-line { stroke: #1e293b; stroke-width: 1; }
        .cad-outline { stroke: #f8fafc; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .cad-hatch { stroke: #475569; stroke-width: 1.5; }
        .concrete-aggregate { fill: none; stroke: #64748b; stroke-width: 1.5; }
        .dimension-line { stroke: #06b6d4; stroke-width: 1.5; stroke-dasharray: 4,4; }
        .dimension-arrow { fill: #06b6d4; }
        .cad-text { fill: #f1f5f9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: bold; }
        .dim-text { fill: #06b6d4; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: bold; text-anchor: middle; }
        .pointer-cursor { cursor: pointer; }
        
        /* Highlight contour glow for interactive selections */
        .selected-highlight rect, 
        .selected-highlight circle {
          stroke: #06b6d4 !important;
          stroke-width: 3.5 !important;
          filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.4));
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

      <defs>
        <!-- Concrete aggregate hatch pattern -->
        <pattern id="concrete-hatch" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="15" r="1" fill="#475569"/>
          <circle cx="45" cy="20" r="1.5" fill="#475569"/>
          <circle cx="20" cy="45" r="1" fill="#475569"/>
          <circle cx="50" cy="50" r="1" fill="#475569"/>
          <path d="M 5,35 L 12,32 L 8,40 Z" class="concrete-aggregate"/>
          <path d="M 35,10 L 42,15 L 33,18 Z" class="concrete-aggregate"/>
          <path d="M 40,40 L 48,35 L 45,45 Z" class="concrete-aggregate"/>
        </pattern>

        <!-- Dimension Arrowhead -->
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 2 L 10 5 L 0 8 z" class="dimension-arrow" />
        </marker>
      </defs>

      <!-- Background & Grid -->
      <rect width="${width}" height="${height}" class="blueprint-bg" />
      <g>
        ${gridLines.join('\n')}
      </g>

      <!-- Rendered Groups -->
      <g id="drawings-layer">
        ${renderedGroups.join('\n')}
      </g>

      <!-- Visualizer Title Banner -->
      <g transform="translate(20, 20)">
        <rect x="0" y="0" width="220" height="45" fill="#1e293b" stroke="#334155" stroke-width="1.5" rx="4" />
        <text x="12" y="20" class="cad-text" style="fill: #38bdf8; font-size: 11px;">PARAMETRIC DAC VISUALIZER</text>
        <text x="12" y="34" class="cad-text" style="font-size: 9px; fill: #64748b;">
          SCALE: ${doc.scale} / prims = ${doc.geometry.length}
        </text>
      </g>
    </svg>
  `;
}
