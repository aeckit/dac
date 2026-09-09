import type { SolvedGroup, SolvedDetailLayout, SolvedSheetLayout, DetailDocument, SheetConfiguration, TitleBlockDocument, ConstructDocument } from '@dac/json-solver';
import { solveDetailDocument, solveSheetDocument } from '@dac/json-solver';
import { L1_REGISTRY } from './drawers';
import { getDefs } from './defs';
import { getStyles } from './styles';

/**
 * Converts SolvedGroups into SVG markup string
 */
export function renderSolvedGroups(
  groups: SolvedGroup[],
  scale: number,
  canvasHeight = 18,
  isInteractive = true
): string {
  const renderedGroups: string[] = [];

  for (const group of groups) {
    const svgNodes: string[] = [];

    for (const shape of group.shapes) {
      const drawer = L1_REGISTRY[shape.type];
      if (!drawer) continue;

      try {
        const svg = drawer(shape, scale, canvasHeight);
        svgNodes.push(svg);
      } catch (err) {
        console.error(`Failed to render shape "${shape.type}":`, err);
      }
    }

    const interactiveClasses = isInteractive ? 'interactive-component pointer-cursor' : '';
    renderedGroups.push(`
      <g data-component-id="${group.componentId}" data-component-type="${group.componentType || ''}" class="${interactiveClasses}">
        ${svgNodes.join('\n')}
      </g>
    `);
  }

  return renderedGroups.join('\n');
}

/**
 * Generates CAD UCS / Origin indicator at (0,0)
 */
export function getOriginIndicator(canvasHeight = 18, scale = 1): string {
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

/**
 * Renders a full SolvedDetailLayout into a standalone SVG string
 */
export function renderSolvedDetail(layout: SolvedDetailLayout, isInteractive = true): string {
  const { scaleMultiplier, canvasWidth, canvasHeight, groups } = layout;
  const geometries = renderSolvedGroups(groups, scaleMultiplier, canvasHeight, isInteractive);
  const originIndicator = getOriginIndicator(canvasHeight, scaleMultiplier);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="100%" height="100%" style="overflow: visible;">
      ${getDefs()}
      <defs>
        <pattern id="infinite-grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="1" y2="0" class="grid-line" />
          <line x1="0" y1="0" x2="0" y2="1" class="grid-line" />
        </pattern>
      </defs>
      <rect x="-5000" y="-5000" width="10000" height="10000" class="blueprint-bg" />
      <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#infinite-grid)" />
      <g class="drawing-extents" transform="translate(1, 1) scale(${scaleMultiplier})">
        ${originIndicator}
        ${geometries}
      </g>
      ${getStyles()}
    </svg>
  `;
}

/**
 * Renders a full SolvedSheetLayout into an SVG string
 */
export function renderSolvedSheet(sheetLayout: SolvedSheetLayout): string {
  const { paperWidth, paperHeight } = sheetLayout;
  let sheetContent = '';

  if (sheetLayout.titleBlockGroups) {
    const tbSvg = renderSolvedGroups(sheetLayout.titleBlockGroups, 1.0, paperHeight, false);
    sheetContent += `\n<!-- Title Block -->\n<g id="title-block-layer" transform="translate(${sheetLayout.titleBlockOffsetX}, ${-sheetLayout.titleBlockOffsetY})">${tbSvg}</g>`;
  }

  if (sheetLayout.sheetGeometryGroups) {
    const geomSvg = renderSolvedGroups(sheetLayout.sheetGeometryGroups, 1.0, paperHeight, false);
    sheetContent += `\n<!-- Sheet Geometry -->\n<g id="sheet-geometry-layer">${geomSvg}</g>`;
  }

  sheetContent += '\n<!-- Viewports -->\n';
  for (const vp of sheetLayout.viewports) {
    const vpCanvasHeight = 18;
    const vpSvg = renderSolvedGroups(vp.resolvedDetailGroups, vp.scaleMultiplier, vpCanvasHeight, false);

    const vpSvgY = paperHeight - vp.y - (vpCanvasHeight * vp.scaleMultiplier);
    const cidAttr = ` data-component-id="${vp.viewportId}" data-component-type="CAD::Viewport"`;

    const clipId = `clip-img-${vp.viewportId}-${Math.random().toString(36).substring(2, 9)}`;
    const hasDimensions = vp.width !== undefined && vp.height !== undefined;
    const clipDef = hasDimensions ? `<clipPath id="${clipId}"><rect x="0" y="${vpCanvasHeight - vp.height! / vp.scaleMultiplier}" width="${vp.width! / vp.scaleMultiplier}" height="${vp.height! / vp.scaleMultiplier}" /></clipPath>` : '';
    const clipAttr = hasDimensions ? ` clip-path="url(#${clipId})"` : '';

    let labelsSvg = '';
    if (hasDimensions) {
      const titlePos = vp.titlePosition || 'bottom';
      const titleOffsetY = (vp.titleOffsetY || 0) / vp.scaleMultiplier;
      const topEdge = vpCanvasHeight - (vp.height! / vp.scaleMultiplier);
      const bottomEdge = vpCanvasHeight;

      const circleRadius = 0.25 / vp.scaleMultiplier;
      const lineY = titlePos === 'top'
        ? topEdge - circleRadius - (0.125 / vp.scaleMultiplier) - titleOffsetY
        : bottomEdge + circleRadius + (0.125 / vp.scaleMultiplier) + titleOffsetY;

      const circleCx = circleRadius;
      const circleCy = lineY;
      const lineStartX = circleCx + circleRadius;
      const lineEndX = vp.width! / vp.scaleMultiplier;

      const displayDetailNumber = vp.hideDetailNumber ? '' : (vp.detailNumber || '1');
      const textStartX = vp.hideDetailNumber ? 0 : lineStartX + (0.1 / vp.scaleMultiplier);

      if (!vp.hideDetailNumber) {
        labelsSvg += `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" fill="none" stroke="#f1f5f9" stroke-width="${1.5 / 72 / vp.scaleMultiplier}" />\n`;
        labelsSvg += `<text x="${circleCx}" y="${circleCy}" font-size="${0.25 / vp.scaleMultiplier}" fill="#f1f5f9" font-family="monospace" text-anchor="middle" dominant-baseline="central">${displayDetailNumber}</text>\n`;
      }

      labelsSvg += `<line x1="${vp.hideDetailNumber ? 0 : lineStartX}" y1="${lineY}" x2="${lineEndX}" y2="${lineY}" stroke="#f1f5f9" stroke-width="${1.5 / 72 / vp.scaleMultiplier}" />\n`;

      if (!vp.hideTitle) {
        const textY = lineY - (0.1 / vp.scaleMultiplier);
        labelsSvg += `<text x="${textStartX}" y="${textY}" font-size="${0.2 / vp.scaleMultiplier}" fill="#f1f5f9" font-family="monospace" font-weight="bold" dominant-baseline="alphabetic">${vp.displayTitle.toUpperCase()}</text>\n`;
      }

      if (!vp.hideScale) {
        const textY = lineY + (0.1 / vp.scaleMultiplier);
        labelsSvg += `<text x="${textStartX}" y="${textY}" font-size="${0.125 / vp.scaleMultiplier}" fill="#94a3b8" font-family="monospace" dominant-baseline="hanging">${vp.scaleMultiplier}</text>\n`;
      }

      if (vp.titleNote) {
        const textX = lineEndX;
        const textY = lineY + (0.1 / vp.scaleMultiplier);
        labelsSvg += `<text x="${textX}" y="${textY}" font-size="${0.125 / vp.scaleMultiplier}" fill="#94a3b8" font-family="monospace" text-anchor="end" dominant-baseline="hanging">${vp.titleNote}</text>\n`;
      }
    } else {
      const titleY = vpCanvasHeight - (0.5 / vp.scaleMultiplier);
      if (!vp.hideTitle) {
        labelsSvg += `<text x="0" y="${titleY}" font-size="${0.5 / vp.scaleMultiplier}" fill="#f1f5f9" font-family="monospace" font-weight="bold">${vp.displayTitle.toUpperCase()}</text>\n`;
      }
    }

    sheetContent += `
      ${hasDimensions ? `<defs>${clipDef}</defs>` : ''}
      <g${cidAttr} class="interactive-component pointer-cursor" data-viewport-id="viewport-${vp.detailId}" transform="translate(${vp.x}, ${vpSvgY}) scale(${vp.scaleMultiplier})">
        <g${clipAttr}>
          <g transform="translate(${-(vp.cropX || 0)}, ${vp.cropY || 0})">
            ${vpSvg}
          </g>
        </g>
        ${labelsSvg}
        ${hasDimensions ? `<rect x="0" y="${vpCanvasHeight - vp.height! / vp.scaleMultiplier}" width="${vp.width! / vp.scaleMultiplier}" height="${vp.height! / vp.scaleMultiplier}" fill="transparent" stroke="#475569" stroke-width="${1.0 / 72 / vp.scaleMultiplier}" stroke-dasharray="0.1, 0.1" pointer-events="all" />` : ''}
      </g>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${paperWidth} ${paperHeight}" width="100%" height="100%">
      ${getDefs()}
      <rect width="${paperWidth}" height="${paperHeight}" class="blueprint-bg" />
      <g id="sheet-content">
        ${sheetContent}
      </g>
      ${getStyles()}
    </svg>
  `;
}

/**
 * Drop-in convenience function to solve and render a DetailDocument
 */
export function renderDetail(
  doc: DetailDocument,
  sandboxWidth = 24,
  sandboxHeight = 18,
  constructResolver?: (id: string) => ConstructDocument | undefined
): string {
  const layout = solveDetailDocument(doc, sandboxWidth, sandboxHeight, constructResolver);
  return renderSolvedDetail(layout);
}

/**
 * Drop-in convenience function to solve and render a SheetConfiguration
 */
export function renderSheet(
  sheet: SheetConfiguration,
  titleBlockData: Record<string, any>,
  viewportsMap: Map<string, DetailDocument>,
  titleBlockDoc?: TitleBlockDocument,
  tbOffsetX = 0,
  tbOffsetY = 0,
  paperSize = 'ARCH D',
  constructResolver?: (id: string) => ConstructDocument | undefined
): string {
  const layout = solveSheetDocument(sheet, titleBlockData, viewportsMap, titleBlockDoc, tbOffsetX, tbOffsetY, paperSize, constructResolver);
  return renderSolvedSheet(layout);
}

