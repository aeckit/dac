import type { SolvedPrimitive } from '@aeckit/dac-json-solver';
import { computeFilletedPolylinePath } from './polylinePath';

export type ShapeDrawer = (
  shape: SolvedPrimitive,
  scale: number,
  canvasHeight?: number
) => string;

// SVG Line Drawer (Cartesian +Y = UP)
export function drawLine(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x1 = Number(shape.x1 ?? 0);
  const y1 = canvasHeight - Number(shape.y1 ?? 0);
  const x2 = Number(shape.x2 ?? 0);
  const y2 = canvasHeight - Number(shape.y2 ?? 0);
  const strokeColor = shape.color || 'var(--cad-stroke)';
  const strokeWidth = ((Number(shape.strokeWidth) || 2) / 72) / scale;
  const dashArray = shape.strokeDasharray ? `stroke-dasharray="${shape.strokeDasharray}"` : '';

  const hitTarget = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />`;
  const visibleLine = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashArray} stroke-linecap="round" />`;

  return `${hitTarget}\n${visibleLine}`;
}

// SVG Circle Drawer (Cartesian +Y = UP)
export function drawCircle(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const cx = Number(shape.cx ?? 0);
  const cy = canvasHeight - Number(shape.cy ?? 0);
  const r = Number(shape.r ?? 0);
  const fillColor = shape.fill || 'none';
  const strokeColor = shape.color || 'var(--cad-stroke)';
  const strokeWidth = ((Number(shape.strokeWidth) || 2) / 72) / scale;

  const hitTarget = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />`;
  const visibleShape = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
  return `${hitTarget}\n${visibleShape}`;
}

// SVG Polyline / Polygon Drawer (Cartesian +Y = UP)
export function drawPolyline(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const points = (shape.points || []) as [number, number][];
  const strokeColor = shape.color || 'var(--cad-stroke)';
  const strokeWidth = ((Number(shape.strokeWidth) || 2) / 72) / scale;
  const dashAttr = shape.strokeDasharray ? ` stroke-dasharray="${shape.strokeDasharray}"` : '';
  const isClosed = Boolean(shape.closed);
  const cornerRadius = Number(shape.cornerRadius || 0);

  let fillStr = shape.fill ? `fill="${shape.fill}"` : 'fill="none"';
  let extraGraphics = '';

  if (isClosed && shape.hatch === 'Concrete') {
    const hatchId = `concrete-hatch-${shape.componentId || Math.random().toString(36).substring(2, 9)}`;
    fillStr = `fill="url(#${hatchId})"`;
    extraGraphics = `<pattern id="${hatchId}" href="#concrete-hatch" patternTransform="scale(${1 / scale})" />`;
  }

  const rot = Number(shape.rotation || 0);
  let transform = '';
  if (rot && points.length > 0) {
    const originX = Number(points[0][0]);
    const originY = canvasHeight - Number(points[0][1]);
    transform = ` transform="rotate(${-rot}, ${originX}, ${originY})"`;
  }

  let hitTarget = '';
  let visibleShape = '';

  if (cornerRadius > 0 && points.length >= 2) {
    const pathD = computeFilletedPolylinePath(points, cornerRadius, isClosed, canvasHeight);
    hitTarget = `<path d="${pathD}" stroke="transparent" stroke-width="0.5" fill="none" class="cad-hit-area" />`;
    visibleShape = `<path d="${pathD}" ${fillStr} stroke="${strokeColor}" stroke-width="${strokeWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
  } else {
    const tagName = isClosed ? 'polygon' : 'polyline';
    const svgCoords = points.map(([x, y]) => `${Number(x)},${canvasHeight - Number(y)}`);
    const pointsStr = svgCoords.join(' ');
    hitTarget = `<${tagName} points="${pointsStr}" stroke="transparent" stroke-width="0.5" fill="none" class="cad-hit-area" />`;
    visibleShape = `<${tagName} points="${pointsStr}" ${fillStr} stroke="${strokeColor}" stroke-width="${strokeWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
  }

  const content = extraGraphics
    ? `${hitTarget}\n${visibleShape}\n${extraGraphics}`
    : `${hitTarget}\n${visibleShape}`;

  if (transform) {
    return `<g${transform}>\n${content}\n</g>`;
  }
  return content;
}

// SVG Rectangle and Hatching Drawer (Cartesian +Y = UP)
export function drawRectangle(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x = Number(shape.x ?? 0);
  const rawY = Number(shape.y ?? 0);
  const w = Number(shape.width ?? 0);
  const h = Number(shape.height ?? 0);
  const y = canvasHeight - (rawY + h);
  const hatch = shape.hatch;

  let fillStr = 'fill="none"';
  let extraGraphics = '';

  if (hatch === 'Concrete') {
    const hatchId = `concrete-hatch-${shape.componentId || Math.random().toString(36).substring(2, 9)}`;
    fillStr = `fill="url(#${hatchId})"`;
    extraGraphics = `<pattern id="${hatchId}" href="#concrete-hatch" patternTransform="scale(${1 / scale})" />`;
  } else if (hatch === 'TimberCross') {
    fillStr = shape.fill && shape.fill !== 'transparent' ? `fill="${shape.fill}"` : 'fill="none"';
    extraGraphics = `
      <line x1="${x}" y1="${canvasHeight - rawY}" x2="${x + w}" y2="${canvasHeight - (rawY + h)}" class="cad-hatch" stroke-width="${(1.5 / 72) / scale}" />
      <line x1="${x + w}" y1="${canvasHeight - rawY}" x2="${x}" y2="${canvasHeight - (rawY + h)}" class="cad-hatch" stroke-width="${(1.5 / 72) / scale}" />
    `;
  } else if (shape.fill) {
    fillStr = `fill="${shape.fill}"`;
  }

  const strokeColor = shape.color || 'var(--cad-stroke)';
  const strokeWidth = ((Number(shape.strokeWidth) || 2) / 72) / scale;

  const rot = Number(shape.rotation || 0);
  const transform = rot ? ` transform="rotate(${-rot}, ${x}, ${canvasHeight - rawY})"` : '';

  return `
    <g${transform}>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />
      <rect x="${x}" y="${y}" width="${w}" height="${h}" ${fillStr} stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" />
      ${extraGraphics}
    </g>
  `;
}

// Annotative Dimension Line Drawer (Cartesian +Y = UP)
export function drawDimension(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x1 = Number(shape.x1 ?? 0);
  const y1 = canvasHeight - Number(shape.y1 ?? 0);
  const x2 = Number(shape.x2 ?? 0);
  const y2 = canvasHeight - Number(shape.y2 ?? 0);
  const rawOffset = ((Number(shape.offset) || 20) / 72) / scale;
  const offset = -rawOffset;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);

  if (len < 0.1) return '';

  // 1. Calculate actual measurement from endpoints
  let measuredValue = '';
  if (shape.format === 'architectural' || (shape.format !== 'decimal' && len >= 12 && Math.abs(len % 12) < 0.001)) {
    const feet = Math.floor(len / 12);
    const inches = Math.round((len % 12) * 100) / 100;
    measuredValue = `${feet}'-${inches}"`;
  } else {
    const cleanLen = Math.abs(len - Math.round(len)) < 0.001 
      ? Math.round(len) 
      : parseFloat(len.toFixed(2));
    measuredValue = `${cleanLen}"`;
  }

  // 2. Resolve core text: textOverride takes highest precedence, then text (for backwards compatibility), otherwise measuredValue
  let coreText = measuredValue;
  if (shape.textOverride !== undefined && String(shape.textOverride).trim() !== '') {
    coreText = String(shape.textOverride);
  } else if (shape.text !== undefined && String(shape.text).trim() !== '') {
    coreText = String(shape.text);
  }

  // 3. Apply optional prefix and suffix
  const prefix = shape.prefix ? String(shape.prefix) : '';
  const suffix = shape.suffix ? String(shape.suffix) : '';
  const text = `${prefix}${coreText}${suffix}`;

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

  const midX = (ox1 + ox2) / 2;
  const midY = (oy1 + oy2) / 2;

  // Calculate text rotation angle aligned with the primary dimension line
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle > 90) {
    angle -= 180;
  } else if (angle < -90) {
    angle += 180;
  }
  // For vertical dimensions, text must read strictly from bottom to top (-90° in SVG)
  if (Math.abs(Math.abs(angle) - 90) < 0.001) {
    angle = -90;
  }
  angle = Math.abs(angle) < 0.0001 ? 0 : Math.round(angle * 1000) / 1000;

  const strokeWidth = (1.5 / 72) / scale;
  
  // Helper to parse fractional strings like "1/8" or "3/32"
  let parsedFontSize = 11;
  if (typeof shape.fontSize === 'string' && shape.fontSize.includes('/')) {
    const parts = shape.fontSize.split('/');
    parsedFontSize = (Number(parts[0]) / Number(parts[1])) * 72;
  } else if (shape.fontSize !== undefined) {
    parsedFontSize = Number(shape.fontSize);
  }
  
  const fontSize = (parsedFontSize / 72) / scale;
  const secondaryFontSize = fontSize;
  const gap = (3 / 72) / scale;

  const isBelow = shape.textPosition === 'below';
  const primaryY = isBelow ? gap : -gap;
  const primaryBaseline = isBelow ? 'hanging' : 'alphabetic';

  const hasCustomColor = shape.color && shape.color !== 'auto';
  const lineColor = hasCustomColor ? shape.color : 'var(--cad-dim-line, #000000)';
  const textColor = hasCustomColor ? shape.color : 'var(--cad-dim-text, #000000)';

  let secondaryMarkup = '';
  if (shape.secondaryText !== undefined && String(shape.secondaryText).trim() !== '') {
    const secY = isBelow ? -gap : gap;
    const secBaseline = isBelow ? 'alphabetic' : 'hanging';
    secondaryMarkup = `\n      <text x="0" y="${secY}" font-size="${secondaryFontSize}" fill="${textColor}" style="fill: ${textColor};" dominant-baseline="${secBaseline}" text-anchor="middle" class="dim-text dim-secondary-text">${String(shape.secondaryText)}</text>`;
  }

  return `
    <!-- Hit targets -->
    <line x1="${ox1}" y1="${oy1}" x2="${ox2}" y2="${oy2}" stroke="transparent" stroke-width="0.5" class="cad-hit-area" />
    <line x1="${ex1_start}" y1="${ey1_start}" x2="${ex1_end}" y2="${ey1_end}" stroke="transparent" stroke-width="0.4" class="cad-hit-area" />
    <line x1="${ex2_start}" y1="${ey2_start}" x2="${ex2_end}" y2="${ey2_end}" stroke="transparent" stroke-width="0.4" class="cad-hit-area" />

    <!-- Extension lines -->
    <line x1="${ex1_start}" y1="${ey1_start}" x2="${ex1_end}" y2="${ey1_end}" class="dimension-line" stroke="${lineColor}" style="stroke: ${lineColor};" stroke-width="${strokeWidth}" />
    <line x1="${ex2_start}" y1="${ey2_start}" x2="${ex2_end}" y2="${ey2_end}" class="dimension-line" stroke="${lineColor}" style="stroke: ${lineColor};" stroke-width="${strokeWidth}" />
    
    <!-- Dimension line -->
    <line x1="${ox1}" y1="${oy1}" x2="${ox2}" y2="${oy2}" class="dimension-main-line" data-x1="${x1}" data-y1="${y1}" data-x2="${x2}" data-y2="${y2}" data-scale="${scale}" stroke="${lineColor}" color="${lineColor}" style="stroke: ${lineColor}; color: ${lineColor};" stroke-width="${strokeWidth}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
    <g transform="translate(${midX}, ${midY}) rotate(${angle})">
      <text x="0" y="${primaryY}" font-size="${fontSize}" fill="${textColor}" style="fill: ${textColor};" dominant-baseline="${primaryBaseline}" text-anchor="middle" class="dim-text">${text}</text>${secondaryMarkup}
    </g>
  `;
}

// Annotation: Text (Cartesian +Y = UP)
export function drawText(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x = Number(shape.x ?? 0);
  const y = canvasHeight - Number(shape.y ?? 0);
  const text = String(shape.text ?? '');
  
  let parsedFontSize = 11;
  if (typeof shape.fontSize === 'string' && shape.fontSize.includes('/')) {
    const parts = shape.fontSize.split('/');
    parsedFontSize = (Number(parts[0]) / Number(parts[1])) * 72;
  } else if (shape.fontSize !== undefined) {
    parsedFontSize = Number(shape.fontSize);
  }
  const fontSize = (parsedFontSize / 72) / scale;
  
  const color = shape.color || 'var(--cad-text)';

  const lines = text.split(/\\n|\n/);
  const rot = Number(shape.rotation || 0);
  const transform = rot ? ` transform="rotate(${-rot}, ${x}, ${y})"` : '';

  if (lines.length <= 1) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" class="cad-text" dominant-baseline="auto"${transform}>${text}</text>`;
  }

  const tspans = lines.map((line, index) => {
    const dy = index === 0 ? 0 : 1.2;
    return `<tspan x="${x}" dy="${dy}em">${line}</tspan>`;
  }).join('');
  
  return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" class="cad-text" dominant-baseline="auto"${transform}>${tspans}</text>`;
}


// Annotation: Leader (Cartesian +Y = UP)
export function drawLeader(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const anchorX = Number(shape.x ?? 0);
  const anchorY = canvasHeight - Number(shape.y ?? 0);

  const dx = Number(shape.dx || 0);
  const dy = Number(shape.dy || 0);

  const offsetX = dx / scale;
  const offsetY = -(dy / scale);

  const elbowX = anchorX + offsetX;
  const elbowY = anchorY + offsetY;

  const rawShoulderLength = shape.shoulderLength !== undefined ? Number(shape.shoulderLength) : 0.25;
  const shoulderLen = rawShoulderLength / scale;
  const dir = offsetX >= 0 ? 1 : -1;
  const endX = elbowX + dir * shoulderLen;
  const endY = elbowY;

  let parsedFontSize = 11;
  if (typeof shape.fontSize === 'string' && shape.fontSize.includes('/')) {
    const parts = shape.fontSize.split('/');
    parsedFontSize = (Number(parts[0]) / Number(parts[1])) * 72;
  } else if (shape.fontSize !== undefined) {
    parsedFontSize = Number(shape.fontSize);
  }
  const fontSize = (parsedFontSize / 72) / scale;
  
  const strokeWidth = ((Number(shape.strokeWidth) || 1.5) / 72) / scale;
  const dashArray = shape.strokeDasharray && shape.strokeDasharray !== 'none'
    ? ` stroke-dasharray="${shape.strokeDasharray}"`
    : ' stroke-dasharray="none"';
  const text = String(shape.text ?? '');
  const hasCustomColor = shape.color && shape.color !== 'auto';
  const color = hasCustomColor ? shape.color : 'var(--cad-dim-line, #000000)';

  const textPadding = (5 / 72) / scale;
  const textX = endX + dir * textPadding;
  const textY = endY + (3 / 72) / scale;
  const textAnchor = dir > 0 ? 'start' : 'end';

  const lines = text.split('\n');
  let textNode = '';
  if (lines.length <= 1) {
    textNode = `<text x="${textX}" y="${textY}" font-size="${fontSize}" fill="${color}" style="fill: ${color};" class="cad-text" text-anchor="${textAnchor}" dominant-baseline="middle">${text}</text>`;
  } else {
    const tspans = lines.map((line, index) => {
      const dyOffset = index === 0 ? 0 : 1.2;
      return `<tspan x="${textX}" dy="${dyOffset}em">${line}</tspan>`;
    }).join('');
    textNode = `<text x="${textX}" y="${textY}" font-size="${fontSize}" fill="${color}" style="fill: ${color};" class="cad-text" text-anchor="${textAnchor}" dominant-baseline="middle">${tspans}</text>`;
  }

  const hitTarget = `<polyline points="${anchorX},${anchorY} ${elbowX},${elbowY} ${endX},${endY}" stroke="transparent" stroke-width="0.5" fill="none" class="cad-hit-area" />`;
  const visibleLine = `<polyline points="${anchorX},${anchorY} ${elbowX},${elbowY} ${endX},${endY}" class="leader-line" stroke="${color}" color="${color}" style="stroke: ${color}; color: ${color};" stroke-width="${strokeWidth}"${dashArray} marker-start="url(#arrow)" fill="none" stroke-linejoin="round" />`;

  return `${hitTarget}\n${visibleLine}\n${textNode}`;
}

// Annotation: Image (Cartesian +Y = UP)
export function drawImage(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x = Number(shape.x ?? 0);
  const rawY = Number(shape.y ?? 0);
  const width = Number(shape.width ?? 0);
  const height = Number(shape.height ?? 0);
  const y = canvasHeight - (rawY + height);
  const cropX = Number(shape.cropX || 0);
  const cropY = Number(shape.cropY || 0);
  const imgWidth = Number(shape.imgWidth || width);
  const imgHeight = Number(shape.imgHeight || height);
  
  const clipId = `clip-img-${Math.random().toString(36).substring(2, 9)}`;
  const fallbackId = `img-fallback-${Math.random().toString(36).substring(2, 9)}`;
  const textLabel = shape.href ? shape.href : 'No Image';
  const placeholder = `
    <g id="${fallbackId}">
      <rect x="${x - cropX}" y="${y + cropY}" width="${imgWidth}" height="${imgHeight}" fill="var(--cad-image-bg)" />
      <path d="M ${x - cropX} ${y + cropY} L ${x - cropX + imgWidth} ${y + cropY + imgHeight} M ${x - cropX + imgWidth} ${y + cropY} L ${x - cropX} ${y + cropY + imgHeight}" stroke="var(--cad-image-border)" stroke-width="0.1" />
      <text x="${x - cropX + imgWidth/2}" y="${y + cropY + imgHeight/2}" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="${Math.min(imgHeight/4, imgWidth/8)}" fill="var(--cad-image-text)">${textLabel}</text>
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
  
  const rot = Number(shape.rotation || 0);
  const transform = rot ? ` transform="rotate(${-rot}, ${x}, ${canvasHeight - rawY})"` : '';
  
  return `<g${transform}>${imageContent}</g>`;
}

export const L1_REGISTRY: Record<string, ShapeDrawer> = {
  // Fully Qualified Types
  "CAD::Shape::Line": drawLine,
  "CAD::Shape::Circle": drawCircle,
  "CAD::Shape::Rectangle": drawRectangle,
  "CAD::Shape::Polyline": drawPolyline,
  "CAD::Annotation::Dimension": drawDimension,
  "CAD::Annotation::Text": drawText,
  "CAD::Annotation::Leader": drawLeader,
  "CAD::Annotation::Image": drawImage,
  
  // Strict Schema Aliases (PascalCase)
  "Line": drawLine,
  "Circle": drawCircle,
  "Rectangle": drawRectangle,
  "Polyline": drawPolyline,
  "Dimension": drawDimension,
  "Text": drawText,
  "Leader": drawLeader,
  "Image": drawImage,
};
