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
import { resolveConstructGeometry, resolveDocumentParameters } from './constructs';
import { getPaperDimensions } from './paper';
import { 
  RectangleSchema, LineSchema, CircleSchema, PolylineSchema, TextSchema, 
  DimensionSchema, LeaderSchema, ImageSchema, ConstructReferenceSchema 
} from '@aeckit/dac-schema';

/**
 * Solves geometry primitives for a single document into static groups of solved primitives.
 */
export function solveDocumentGeometry(
  doc: DetailDocument | TitleBlockDocument | ConstructDocument,
  scaleMultiplier: number,
  globalParams: Record<string, any> = {},
  canvasHeight = 18,
  constructResolver?: (id: string) => ConstructDocument | undefined
): SolvedGroup[] {
  const resolvedParams = resolveDocumentParameters(doc, globalParams);

  const groups: Record<string, { type: string; shapes: SolvedPrimitive[]; warnings: import('./types').DiagnosticWarning[] }> = {};
  let autoIndex = 0;

  for (const shape of doc.geometry) {
    const shapeWarnings: import('./types').DiagnosticWarning[] = [];
    if (!shape.componentId) {
      shapeWarnings.push({ message: 'Missing componentId. Interactivity may be unstable.' });
    }

    if (shape.type === 'ConstructReference') {
      const sRef: any = shape;
      const evaluatedRef = {
        ...sRef,
        ...(sRef.x !== undefined ? { x: evaluateExpression(sRef.x, resolvedParams) } : {}),
        ...(sRef.y !== undefined ? { y: evaluateExpression(sRef.y, resolvedParams) } : {}),
        ...(sRef.rotation !== undefined ? { rotation: evaluateExpression(sRef.rotation, resolvedParams) } : {}),
      };
      const validationResult = ConstructReferenceSchema.safeParse(evaluatedRef);
      if (!validationResult.success) {
        for (const err of validationResult.error.issues) {
          shapeWarnings.push({ message: `${err.path.join('.')}: ${err.message}` });
        }
      }

      if (constructResolver) {
        const constructDoc = constructResolver((shape as any).constructId!);
        if (constructDoc) {
          const resolvedShapes = resolveConstructGeometry(shape, constructDoc, resolvedParams);
          const cid: string = String(shape.componentId || `shape_${autoIndex++}`);
          const ctype: string = 'ConstructReference';
          
          if (!groups[cid]) groups[cid] = { type: ctype, shapes: [], warnings: shapeWarnings.map(w => ({...w, componentId: cid})) };

          for (const childShape of resolvedShapes) {
            if (childShape.visible !== undefined) {
              const isVisible = evaluateExpression(childShape.visible, {});
              if (isVisible === false || isVisible === 'false' || isVisible === 0) continue;
            }

            try {
              const solved = evaluatePrimitive(childShape, resolvedParams, scaleMultiplier, canvasHeight);
              groups[cid].shapes.push(solved);
            } catch (err) {
              console.warn('Skipped malformed construct child in solver:', err);
            }
          }
        }
      }
      continue;
    }

    if (shape.visible !== undefined) {
      const isVisible = evaluateExpression(shape.visible, resolvedParams);
      if (isVisible === false || isVisible === 'false' || isVisible === 0) continue;
    }

    try {
      const cid: string = String(shape.componentId || `shape_${autoIndex++}`);
      const ctype: string = shape.type ? String(shape.type.split('::').pop() || 'Shape') : 'Unknown';

      const solved = evaluatePrimitive(shape, resolvedParams, scaleMultiplier, canvasHeight);
      const validationWarnings = validateSolvedPrimitive(solved, ctype);
      shapeWarnings.push(...validationWarnings);

      if (!groups[cid]) groups[cid] = { type: ctype, shapes: [], warnings: shapeWarnings.map(w => ({...w, componentId: cid})) };
      groups[cid].shapes.push(solved);
    } catch (err) {
      console.warn('Skipped malformed shape in solver:', err);
    }
  }

  return Object.entries(groups).map(([cid, group]) => ({
    componentId: cid,
    componentType: group.type,
    shapes: group.shapes,
    warnings: group.warnings
  }));
}

/**
 * Validates a solved primitive against its corresponding Zod schema.
 */
function validateSolvedPrimitive(
  solved: SolvedPrimitive,
  ctype: string
): import('./types').DiagnosticWarning[] {
  let validationResult: any = { success: true };
  switch (ctype) {
    case 'Rectangle': validationResult = RectangleSchema.safeParse(solved); break;
    case 'Line': validationResult = LineSchema.safeParse(solved); break;
    case 'Circle': validationResult = CircleSchema.safeParse(solved); break;
    case 'Polyline': validationResult = PolylineSchema.safeParse(solved); break;
    case 'Text': validationResult = TextSchema.safeParse(solved); break;
    case 'Dimension': validationResult = DimensionSchema.safeParse(solved); break;
    case 'Leader': validationResult = LeaderSchema.safeParse(solved); break;
    case 'Image': validationResult = ImageSchema.safeParse(solved); break;
  }
  if (!validationResult.success) {
    return validationResult.error.issues.map((err: any) => ({
      message: `${err.path.join('.')}: ${err.message}`
    }));
  }
  return [];
}

/**
 * Solves a single GeometryPrimitive with expressions evaluated down to hard numbers.
 */
function evaluatePrimitive(
  shape: GeometryPrimitive,
  params: Record<string, any>,
  scaleMultiplier: number,
  canvasHeight: number
): SolvedPrimitive {
  const s: any = shape;
  const result: any = {
    ...s,
    type: s.type,
    componentId: s.componentId
  };

  // Normalize 'auto' keywords so downstream renderers can apply their own environment defaults
  if (result.color === 'auto') result.color = '';
  if (result.fill === 'auto') result.fill = '';

  if (s.x !== undefined) result.x = evaluateExpression(s.x, params);
  if (s.y !== undefined) result.y = evaluateExpression(s.y, params);
  if (Array.isArray(s.points)) {
    result.points = s.points.map((pt: any) => [
      evaluateExpression(pt[0], params),
      evaluateExpression(pt[1], params)
    ]);
  }
  if (s.closed !== undefined) {
    result.closed = typeof s.closed === 'boolean' ? s.closed : evaluateExpression(s.closed, params);
  }
  if (s.cornerRadius !== undefined) {
    result.cornerRadius = evaluateExpression(s.cornerRadius, params);
  }
  if (s.x1 !== undefined) result.x1 = evaluateExpression(s.x1, params);
  if (s.y1 !== undefined) result.y1 = evaluateExpression(s.y1, params);
  if (s.x2 !== undefined) result.x2 = evaluateExpression(s.x2, params);
  if (s.y2 !== undefined) result.y2 = evaluateExpression(s.y2, params);
  if (s.cx !== undefined) result.cx = evaluateExpression(s.cx, params);
  if (s.cy !== undefined) result.cy = evaluateExpression(s.cy, params);
  if (s.r !== undefined) result.r = evaluateExpression(s.r, params);
  if (s.width !== undefined) result.width = evaluateExpression(s.width, params);
  if (s.height !== undefined) result.height = evaluateExpression(s.height, params);
  if (s.dx !== undefined) result.dx = evaluateExpression(s.dx, params);
  if (s.dy !== undefined) result.dy = evaluateExpression(s.dy, params);
  if (s.shoulderLength !== undefined) result.shoulderLength = evaluateExpression(s.shoulderLength, params);
  if (s.text !== undefined) result.text = s.text === '' ? '' : String(evaluateExpression(s.text, params));
  if (s.textOverride !== undefined) result.textOverride = s.textOverride === '' ? '' : String(evaluateExpression(s.textOverride, params));
  if (s.prefix !== undefined) result.prefix = s.prefix === '' ? '' : String(evaluateExpression(s.prefix, params));
  if (s.suffix !== undefined) result.suffix = s.suffix === '' ? '' : String(evaluateExpression(s.suffix, params));
  if (s.secondaryText !== undefined) result.secondaryText = s.secondaryText === '' ? '' : String(evaluateExpression(s.secondaryText, params));
  if (s.textPosition !== undefined) result.textPosition = evaluateExpression(s.textPosition, params);
  if (s.format !== undefined) result.format = s.format === '' ? '' : String(evaluateExpression(s.format, params));
  if (s.fontSize !== undefined) result.fontSize = evaluateExpression(s.fontSize, params);
  if (s.rotation !== undefined) result.rotation = evaluateExpression(s.rotation, params);
  if (s.offset !== undefined) result.offset = evaluateExpression(s.offset, params);
  if (s.cropX !== undefined) result.cropX = evaluateExpression(s.cropX, params);
  if (s.cropY !== undefined) result.cropY = evaluateExpression(s.cropY, params);
  if (s.imgWidth !== undefined) result.imgWidth = evaluateExpression(s.imgWidth, params);
  if (s.imgHeight !== undefined) result.imgHeight = evaluateExpression(s.imgHeight, params);

  return result as SolvedPrimitive;
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
  projectTitleBlockParams: Record<string, any> = {},
  viewportsMap: Map<string, DetailDocument>,
  titleBlockDoc?: TitleBlockDocument,
  tbOffsetX = 0,
  tbOffsetY = 0,
  paperSize = 'ARCH D',
  constructResolver?: (id: string) => ConstructDocument | undefined
): SolvedSheetLayout {
  const { width: paperWidth, height: paperHeight } = getPaperDimensions(paperSize);

  const finalTitleBlockParams = {
    sheetNumber: sheet.sheetNumber,
    sheetName: sheet.sheetName,
    ...(sheet.titleBlockParameters || {}),
    ...projectTitleBlockParams,
    ...(sheet.overrideParameters || {})
  };

  let titleBlockGroups: SolvedGroup[] | undefined;
  if (titleBlockDoc) {
    titleBlockGroups = solveDocumentGeometry(titleBlockDoc, 1.0, finalTitleBlockParams, paperHeight, constructResolver);
  }

  let sheetGeometryGroups: SolvedGroup[] | undefined;
  if (sheet.geometry && sheet.geometry.length > 0) {
    const dummyDoc: DetailDocument = { type: 'CAD::Detail', version: '1.0', scale: '1:1', geometry: sheet.geometry };
    sheetGeometryGroups = solveDocumentGeometry(dummyDoc, 1.0, finalTitleBlockParams, paperHeight, constructResolver);
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
      const resolvedDetailGroups = solveDocumentGeometry(detailDoc, vpScaleMultiplier, finalTitleBlockParams, vpCanvasHeight, constructResolver);

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
        printBorder: vp.printBorder,
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
