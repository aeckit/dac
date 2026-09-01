import { DetailDocument, TitleBlockDocument, SheetConfiguration, GeometryPrimitive, ConstructDocument } from './types';
import { resolveScaleMultiplier, evaluateExpression } from './utils';
import { L1_REGISTRY } from './drawers';
import { explodeConstruct } from './constructs';

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
      <filter id="hover-text-bg" x="-2%" y="-5%" width="104%" height="110%">
        <feFlood flood-color="rgba(148, 163, 184, 0.2)" result="bg" />
        <feMerge>
          <feMergeNode in="bg" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
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

      .selected-highlight rect:not(.cad-hit-area), 
      .selected-highlight circle:not(.cad-hit-area),
      .selected-highlight line:not(.cad-hit-area),
      .selected-highlight path:not(.cad-hit-area) {
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
      .interactive-component:hover rect:not(.cad-hit-area),
      .interactive-component:hover circle:not(.cad-hit-area),
      .interactive-component:hover line:not(.cad-hit-area),
      .interactive-component:hover path:not(.cad-hit-area) {
        stroke: #38bdf8;
        stroke-width: 0.05 !important;
        transition: stroke 0.15s ease, stroke-width 0.15s ease;
      }
      
      .interactive-component:hover text {
        fill: #38bdf8 !important;
        filter: url(#hover-text-bg);
        transition: fill 0.15s ease;
      }
    </style>
  `;
}



/**
 * Evaluates geometry shapes and groups them by componentId
 */
export function compileGeometryGroups(
  doc: DetailDocument | TitleBlockDocument | ConstructDocument, 
  scale: number, 
  globalParams: Record<string, number | boolean> = {}, 
  canvasHeight = 18, 
  isInteractive = true,
  constructResolver?: (id: string) => ConstructDocument | undefined
): string {
  const resolvedParams: Record<string, number | boolean> = { ...globalParams };

  if (doc.parameters) {
    for (const [key, param] of Object.entries(doc.parameters)) {
      if (resolvedParams[key] === undefined) {
        const val = param.value !== undefined ? param.value : param.default;
        resolvedParams[key] = val;
        
        if (param.options) {
          const selectedOpt = param.options.find((opt: any) => opt.value === val);
          if (selectedOpt && selectedOpt.variables) {
            for (const [vKey, vVal] of Object.entries(selectedOpt.variables)) {
              resolvedParams[`${key}.${vKey}`] = vVal as any;
            }
          }
        }
      }
    }
  }

  const groups: Record<string, { type?: string; svgNodes: string[] }> = {};
  const renderedGroups: string[] = [];
  let autoIndex = 0;

  for (const shape of doc.geometry) {
    if (shape.type === 'ConstructReference' && constructResolver) {
      const constructDoc = constructResolver(shape.constructId!);
      if (constructDoc) {
        const exploded = explodeConstruct(shape, constructDoc, resolvedParams);
        const cid = shape.componentId || `shape_${autoIndex++}`;
        const ctype = shape.componentType || 'ConstructReference';

        for (const childShape of exploded) {
          const drawer = L1_REGISTRY[childShape.type];
          if (!drawer) continue;
          
          try {
            if (childShape.visible !== undefined) {
              const isVisible = evaluateExpression(childShape.visible, {});
              if (isVisible === false || isVisible === 'false' || isVisible === 0) continue;
            }
            
            const svg = drawer(childShape, {}, scale, canvasHeight);

            if (!groups[cid]) groups[cid] = { type: ctype, svgNodes: [] };
            groups[cid].svgNodes.push(svg);
          } catch (err) {
            console.error(`Failed to render shape type "${childShape.type}":`, err);
          }
        }
      } else {
        console.warn(`ConstructReference failed to resolve constructId: ${shape.constructId}`);
      }
      continue;
    }

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

export function renderDetail(doc: DetailDocument, sandboxWidth: number = 24, sandboxHeight: number = 18, constructResolver?: (id: string) => ConstructDocument | undefined): string {
  const scale = resolveScaleMultiplier(doc.scale);
  const width = sandboxWidth;
  const height = sandboxHeight;

  const geometries = compileGeometryGroups(doc, scale, {}, sandboxHeight, true, constructResolver);
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
    case 'arch e': return { width: 48, height: 36 };
    case 'arch d': return { width: 36, height: 24 };
    case 'arch c': return { width: 24, height: 18 };
    case 'ansi b': return { width: 17, height: 11 };
    case 'letter': return { width: 11, height: 8.5 };
    case 'a0': return { width: 46.8, height: 33.1 };
    case 'a1': return { width: 33.1, height: 23.4 };
    default: return { width: 36, height: 24 };
  }
}

/**
 * Renders a full SheetConfiguration with an embedded title block and viewports
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
  const { width, height } = getPaperDimensions(paperSize);
  let sheetContent = '';

  // Render Title Block
  if (titleBlockDoc) {
    // Title block is rendered at 1:1 scale
    const tbScale = resolveScaleMultiplier('1:1');
    const tbSvg = compileGeometryGroups(titleBlockDoc, tbScale, titleBlockData, height, false, constructResolver);
    
    // translating by (x, -y) is correct in SVG coordinate space (since +Y is down in SVG, and we want to move it UP).
    sheetContent += `\n<!-- Title Block -->\n<g id="title-block-layer" transform="translate(${tbOffsetX}, ${-tbOffsetY})">${tbSvg}</g>`;
  }

  // Render Sheet-level Geometry (Annotations/Images)
  if (sheet.geometry && sheet.geometry.length > 0) {
    const geomScale = resolveScaleMultiplier('1:1');
    const dummyDoc: DetailDocument = { type: 'CAD::Detail', version: '1.0', scale: '1:1', geometry: sheet.geometry };
    const geomSvg = compileGeometryGroups(dummyDoc, geomScale, titleBlockData, height, false, constructResolver);
    sheetContent += `\n<!-- Sheet Geometry -->\n<g id="sheet-geometry-layer">${geomSvg}</g>`;
  }

  // Render Viewports
  sheetContent += '\n<!-- Viewports -->\n';
  for (const vp of sheet.viewports) {
    const detailId = typeof vp.detail === 'string' ? vp.detail : 'inline-detail';
    const detailDoc = typeof vp.detail === 'string' ? viewportsMap.get(vp.detail) : vp.detail;

    if (detailDoc) {
      const vpScaleMultiplier = resolveScaleMultiplier(vp.scale);
      const vpCanvasHeight = 18;
      const vpSvg = compileGeometryGroups(detailDoc, vpScaleMultiplier, titleBlockData, vpCanvasHeight, false, constructResolver);
      const vpX = Number(vp.x);
      const vpY = Number(vp.y);
      const vpSvgY = height - vpY - (vpCanvasHeight * vpScaleMultiplier);
      const cidAttr = vp.componentId ? ` data-component-id="${vp.componentId}" data-component-type="CAD::Viewport"` : '';
      
      // Use a unique random suffix to force browser cache invalidation for the clipPath on every render
      const clipId = `clip-img-${vp.componentId || 'auto'}-${Math.random().toString(36).substring(2, 9)}`;
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
        displayTitle = basename.replace('.json', '').split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
          ${hasDimensions ? `<rect x="0" y="${vpCanvasHeight - vp.height! / vpScaleMultiplier}" width="${vp.width! / vpScaleMultiplier}" height="${vp.height! / vpScaleMultiplier}" fill="transparent" stroke="#475569" stroke-width="${1 / 72 / vpScaleMultiplier}" stroke-dasharray="0.1, 0.1" pointer-events="all" />` : ''}
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