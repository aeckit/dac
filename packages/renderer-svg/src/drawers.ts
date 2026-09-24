import type { SolvedPrimitive } from '@aeckit/dac-json-solver';

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
  const text = String(shape.text ?? '');

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
export function drawText(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x = Number(shape.x ?? 0);
  const y = canvasHeight - Number(shape.y ?? 0);
  const text = String(shape.text ?? '');
  const fontSize = ((Number(shape.fontSize) || 11) / 72) / scale;
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

// Annotation: TextBox (Cartesian +Y = UP)
export function drawTextBox(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const x = Number(shape.x ?? 0);
  const rawY = Number(shape.y ?? 0);
  const width = Number(shape.width || 8);
  const y = canvasHeight - rawY;
  const text = String(shape.text ?? '');
  const fontSize = ((Number(shape.fontSize) || 11) / 72) / scale;
  const color = shape.color || 'var(--cad-text)';

  return `<foreignObject x="${x}" y="${y}" width="${width}" height="100"><div xmlns="http://www.w3.org/1999/xhtml" style="color: ${color}; font-size: ${fontSize}px; white-space: pre-wrap; font-family: monospace;">${text}</div></foreignObject>`;
}

// Annotation: Leader (Cartesian +Y = UP)
export function drawLeader(shape: SolvedPrimitive, scale: number, canvasHeight = 18): string {
  const anchorX = Number(shape.x ?? 0);
  const anchorY = canvasHeight - Number(shape.y ?? 0);

  const dx = Number(shape.dx || 0);
  const dy = Number(shape.dy || 0);

  const offsetX = dx / scale;
  const offsetY = -(dy / scale);

  const textX = anchorX + offsetX;
  const textY = anchorY + offsetY;

  const fontSize = ((Number(shape.fontSize) || 11) / 72) / scale;
  const strokeWidth = (1.5 / 72) / scale;
  const text = String(shape.text ?? '');
  const color = shape.color || '#06b6d4';

  return `
    <line x1="${anchorX}" y1="${anchorY}" x2="${textX}" y2="${textY}" class="dimension-line" stroke="${color}" stroke-width="${strokeWidth}" marker-start="url(#arrow)" />
    <text x="${textX + (offsetX > 0 ? (5 / 72) / scale : -(5 / 72) / scale)}" y="${textY + (3 / 72) / scale}" font-size="${fontSize}" fill="${color}" class="cad-text" text-anchor="${offsetX > 0 ? 'start' : 'end'}" dominant-baseline="middle">${text}</text>
  `;
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
