import type {
  DetailDocument,
  TitleBlockDocument,
  ConstructDocument,
  SheetConfiguration,
  GeometryPrimitive,
  SolvedPrimitive,
  SolvedGroup,
  SolvedDetailLayout,
  SolvedSheetLayout,
  SolvedViewport
} from './types';
import { evaluateExpression } from './expressions';
import { resolveScaleMultiplier } from './scale';
import { explodeConstruct } from './constructs';
import { getPaperDimensions } from './paper';

/**
 * Solves geometry primitives for a single document into static groups of solved primitives.
 */
export function solveDocumentGeometry(
  doc: DetailDocument | TitleBlockDocument | ConstructDocument,
  scaleMultiplier: number,
  globalParams: Record<string, number | boolean> = {},
  canvasHeight = 18,
  constructResolver?: (id: string) => ConstructDocument | undefined
): SolvedGroup[] {
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

  const groups: Record<string, { type: string; shapes: SolvedPrimitive[] }> = {};
  let autoIndex = 0;

  for (const shape of doc.geometry) {
    if (shape.type === 'ConstructReference' && constructResolver) {
      const constructDoc = constructResolver(shape.constructId!);
      if (constructDoc) {
        const exploded = explodeConstruct(shape, constructDoc, resolvedParams);
        const cid = shape.componentId || `shape_${autoIndex++}`;
        const ctype = shape.componentType || 'ConstructReference';

        for (const childShape of exploded) {
          if (childShape.visible !== undefined) {
            const isVisible = evaluateExpression(childShape.visible, {});
            if (isVisible === false || isVisible === 'false' || isVisible === 0) continue;
          }

          const solved = evaluatePrimitive(childShape, resolvedParams, scaleMultiplier, canvasHeight);
          if (!groups[cid]) groups[cid] = { type: ctype, shapes: [] };
          groups[cid].shapes.push(solved);
        }
      }
      continue;
    }

    if (shape.visible !== undefined) {
      const isVisible = evaluateExpression(shape.visible, resolvedParams);
      if (isVisible === false || isVisible === 'false' || isVisible === 0) continue;
    }

    const cid = shape.componentId || `shape_${autoIndex++}`;
    const ctype = shape.componentType || shape.type.split('::').pop() || 'Shape';

    const solved = evaluatePrimitive(shape, resolvedParams, scaleMultiplier, canvasHeight);
    if (!groups[cid]) groups[cid] = { type: ctype, shapes: [] };
    groups[cid].shapes.push(solved);
  }

  return Object.entries(groups).map(([cid, group]) => ({
    componentId: cid,
    componentType: group.type,
    shapes: group.shapes
  }));
}

/**
 * Solves a single GeometryPrimitive with expressions evaluated down to hard numbers.
 */
function evaluatePrimitive(
  shape: GeometryPrimitive,
  params: Record<string, number | boolean>,
  scaleMultiplier: number,
  canvasHeight: number
): SolvedPrimitive {
  const result: SolvedPrimitive = {
    ...shape,
    type: shape.type,
    componentId: shape.componentId,
    componentType: shape.componentType
  };

  if (shape.x !== undefined) result.x = evaluateExpression(shape.x, params);
  if (shape.y !== undefined) result.y = evaluateExpression(shape.y, params);
  if (shape.x1 !== undefined) result.x1 = evaluateExpression(shape.x1, params);
  if (shape.y1 !== undefined) result.y1 = evaluateExpression(shape.y1, params);
  if (shape.x2 !== undefined) result.x2 = evaluateExpression(shape.x2, params);
  if (shape.y2 !== undefined) result.y2 = evaluateExpression(shape.y2, params);
  if (shape.cx !== undefined) result.cx = evaluateExpression(shape.cx, params);
  if (shape.cy !== undefined) result.cy = evaluateExpression(shape.cy, params);
  if (shape.r !== undefined) result.r = evaluateExpression(shape.r, params);
  if (shape.width !== undefined) result.width = evaluateExpression(shape.width, params);
  if (shape.height !== undefined) result.height = evaluateExpression(shape.height, params);
  if (shape.dx !== undefined) result.dx = evaluateExpression(shape.dx, params);
  if (shape.dy !== undefined) result.dy = evaluateExpression(shape.dy, params);
  if (shape.text !== undefined) result.text = String(evaluateExpression(shape.text, params));
  if (shape.fontSize !== undefined) result.fontSize = evaluateExpression(shape.fontSize, params);
  if (shape.rotation !== undefined) result.rotation = evaluateExpression(shape.rotation, params);
  if (shape.offset !== undefined) result.offset = evaluateExpression(shape.offset, params);
  if (shape.cropX !== undefined) result.cropX = evaluateExpression(shape.cropX, params);
  if (shape.cropY !== undefined) result.cropY = evaluateExpression(shape.cropY, params);
  if (shape.imgWidth !== undefined) result.imgWidth = evaluateExpression(shape.imgWidth, params);
  if (shape.imgHeight !== undefined) result.imgHeight = evaluateExpression(shape.imgHeight, params);

  return result;
}

/**
 * Solves a complete Detail document into an IR layout.
 */
export function solveDetailDocument(
  doc: DetailDocument,
  canvasWidth = 24,
  canvasHeight = 18,
  constructResolver?: (id: string) => ConstructDocument | undefined
): SolvedDetailLayout {
  const scaleMultiplier = resolveScaleMultiplier(doc.scale);
  const groups = solveDocumentGeometry(doc, scaleMultiplier, {}, canvasHeight, constructResolver);

  return {
    scaleMultiplier,
    canvasWidth,
    canvasHeight,
    groups
  };
}

/**
 * Solves a full Sheet configuration including referenced viewports.
 */
export function solveSheetDocument(
  sheet: SheetConfiguration,
  titleBlockData: Record<string, any>,
  viewportsMap: Map<string, DetailDocument>,
  titleBlockDoc?: TitleBlockDocument,
  tbOffsetX = 0,
  tbOffsetY = 0,
  paperSize = 'ARCH D',
  constructResolver?: (id: string) => ConstructDocument | undefined
): SolvedSheetLayout {
  const { width: paperWidth, height: paperHeight } = getPaperDimensions(paperSize);

  let titleBlockGroups: SolvedGroup[] | undefined;
  if (titleBlockDoc) {
    titleBlockGroups = solveDocumentGeometry(titleBlockDoc, 1.0, titleBlockData, paperHeight, constructResolver);
  }

  let sheetGeometryGroups: SolvedGroup[] | undefined;
  if (sheet.geometry && sheet.geometry.length > 0) {
    const dummyDoc: DetailDocument = { type: 'CAD::Detail', version: '1.0', scale: '1:1', geometry: sheet.geometry };
    sheetGeometryGroups = solveDocumentGeometry(dummyDoc, 1.0, titleBlockData, paperHeight, constructResolver);
  }

  const solvedViewports: SolvedViewport[] = [];
  let autoIndex = 0;

  for (const vp of sheet.viewports) {
    const detailId = typeof vp.detail === 'string' ? vp.detail : 'inline-detail';
    const detailDoc = typeof vp.detail === 'string' ? viewportsMap.get(vp.detail) : vp.detail;
    const vpId = vp.componentId || 'vp_' + autoIndex++;

    if (detailDoc) {
      const vpScaleMultiplier = resolveScaleMultiplier(vp.scale);
      const vpCanvasHeight = 18;
      const resolvedDetailGroups = solveDocumentGeometry(detailDoc, vpScaleMultiplier, titleBlockData, vpCanvasHeight, constructResolver);

      let displayTitle = vp.title || '';
      if (!displayTitle && typeof vp.detail === 'string') {
        const basename = vp.detail.split('/').pop() || '';
        displayTitle = basename.replace('.json', '').split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      solvedViewports.push({
        viewportId: vpId,
        detailId,
        detailNumber: vp.detailNumber || String(autoIndex),
        displayTitle,
        x: Number(vp.x),
        y: Number(vp.y),
        scaleMultiplier: vpScaleMultiplier,
        width: vp.width,
        height: vp.height,
        cropX: vp.cropX,
        cropY: vp.cropY,
        hideDetailNumber: vp.hideDetailNumber,
        hideTitle: vp.hideTitle,
        hideScale: vp.hideScale,
        titlePosition: vp.titlePosition,
        titleOffsetY: vp.titleOffsetY,
        titleNote: vp.titleNote,
        resolvedDetailGroups
      });
    }
  }

  return {
    sheetNumber: sheet.sheetNumber,
    sheetName: sheet.sheetName,
    paperWidth,
    paperHeight,
    titleBlockGroups,
    titleBlockOffsetX: tbOffsetX,
    titleBlockOffsetY: tbOffsetY,
    sheetGeometryGroups,
    viewports: solvedViewports
  };
}
