import { GeometryPrimitive } from './types';
import { evaluateExpression } from './utils';

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

  const hitTarget = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />`;
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

  const hitTarget = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />`;
  const visibleShape = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  return `${hitTarget}\n${visibleShape}`;
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
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />
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

  const lines = String(text).split(/\\n|\n/);
  if (lines.length <= 1) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" class="cad-text" dominant-baseline="auto">${text}</text>`;
  }

  const tspans = lines.map((line, index) => {
    const dy = index === 0 ? 0 : 1.2;
    return `<tspan x="${x}" dy="${dy}em">${line}</tspan>`;
  }).join('');
  
  return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" class="cad-text" dominant-baseline="auto">${tspans}</text>`;
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
  const cropX = evaluateExpression(shape.cropX || 0, params);
  const cropY = evaluateExpression(shape.cropY || 0, params);
  const imgWidth = evaluateExpression(shape.imgWidth || width, params);
  const imgHeight = evaluateExpression(shape.imgHeight || height, params);
  
  // Generate a unique ID for the clip path
  const clipId = `clip-img-${Math.random().toString(36).substring(2, 9)}`;
  
  // The clip-path rect defines the visible "window"
  const clipDef = `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" /></clipPath>`;
  
  // The image itself is offset by -cropX and +cropY (because SVG Y goes down, so +cropY pushes the image down, revealing the top)
  const imgX = x - cropX;
  const imgY = y + cropY;

  const fallbackId = `img-fallback-${Math.random().toString(36).substring(2, 9)}`;
  const textLabel = shape.href ? shape.href : 'No Image';
  const placeholder = `
    <g id="${fallbackId}">
      <rect x="${imgX}" y="${imgY}" width="${imgWidth}" height="${imgHeight}" fill="#334155" />
      <path d="M ${imgX} ${imgY} L ${imgX + imgWidth} ${imgY + imgHeight} M ${imgX + imgWidth} ${imgY} L ${imgX} ${imgY + imgHeight}" stroke="#475569" stroke-width="0.1" />
      <text x="${imgX + imgWidth/2}" y="${imgY + imgHeight/2}" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(imgHeight/4, imgWidth/8)}" fill="#94a3b8">${textLabel}</text>
    </g>
  `;

  let imageContent = placeholder;
  if (shape.href) {
    imageContent = `
      ${placeholder}
      <svg x="${x}" y="${y}" width="${width}" height="${height}">
        <image x="${-cropX}" y="${cropY}" width="${imgWidth}" height="${imgHeight}" href="${shape.href}" preserveAspectRatio="none" data-fallback-id="${fallbackId}" />
      </svg>
    `;
  }
  
  return imageContent;
}

export const L1_REGISTRY: Record<string, ShapeDrawer> = {
  "CAD::Shape::Line": drawLine,
  "CAD::Shape::Circle": drawCircle,
  "CAD::Shape::Rectangle": drawRectangle,
  "CAD::Annotation::Dimension": drawDimension,
  "CAD::Annotation::Text": drawText,
  "CAD::Annotation::Leader": drawLeader,
  "CAD::Annotation::Image": drawImage,
  // Shorthand aliases for convenience
  "line": drawLine,
  "circle": drawCircle,
  "rect": drawRectangle,
  "dimension": drawDimension,
  "text": drawText,
  "leader": drawLeader,
  "image": drawImage,
};
