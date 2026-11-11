import {
  evaluateExpression,
  resolveConstructGeometry,
  type ConstructDocument,
} from '@aeckit/dac-json-solver';

export interface ConstructLengthAnchoring {
  isCentered: boolean;
  localEndX: number;
  localEndY: number;
  scaleFactor: number;
}

/**
 * Checks whether a value is a parametric expression string referencing `{parameters.*}`.
 */
export function isExpressionString(val: unknown): val is string {
  return typeof val === 'string' && val.includes('{parameters.');
}

/**
 * Evaluates a numeric or expression-driven property into a finite number, falling back safely instead of returning NaN.
 */
export function toFiniteNumber(
  val: unknown,
  params: Record<string, any> = {},
  fallback = 0
): number {
  if (val === undefined || val === null || val === '') return fallback;
  const evaluated = evaluateExpression(val, params);
  const num = Number(evaluated);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Checks whether a construct parameter definition represents a numeric `length` parameter.
 */
export function isNumericParameter(param: any): boolean {
  return Boolean(param && (param.type === 'number' || typeof param.default === 'number'));
}

function collectLocalExtents(shapes: any[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const pushX = (x: unknown) => {
    const n = Number(x);
    if (Number.isFinite(n)) {
      if (n < minX) minX = n;
      if (n > maxX) maxX = n;
    }
  };
  const pushY = (y: unknown) => {
    const n = Number(y);
    if (Number.isFinite(n)) {
      if (n < minY) minY = n;
      if (n > maxY) maxY = n;
    }
  };

  for (const s of shapes) {
    if (s.x !== undefined) {
      pushX(s.x);
      if (s.width !== undefined) pushX(Number(s.x) + Number(s.width));
    }
    if (s.y !== undefined) {
      pushY(s.y);
      if (s.height !== undefined) pushY(Number(s.y) + Number(s.height));
    }
    if (s.x1 !== undefined) pushX(s.x1);
    if (s.x2 !== undefined) pushX(s.x2);
    if (s.y1 !== undefined) pushY(s.y1);
    if (s.y2 !== undefined) pushY(s.y2);
    if (s.cx !== undefined && s.r !== undefined) {
      pushX(Number(s.cx) - Number(s.r));
      pushX(Number(s.cx) + Number(s.r));
    } else if (s.cx !== undefined) {
      pushX(s.cx);
    }
    if (s.cy !== undefined && s.r !== undefined) {
      pushY(Number(s.cy) - Number(s.r));
      pushY(Number(s.cy) + Number(s.r));
    } else if (s.cy !== undefined) {
      pushY(s.cy);
    }
    if (Array.isArray(s.points)) {
      for (const pt of s.points) {
        if (Array.isArray(pt)) {
          pushX(pt[0]);
          pushY(pt[1]);
        }
      }
    }
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Infers whether a construct's `length` parameter is centered symmetrically around X=0 (`[-length/2, +length/2]`)
 * or anchored at X=0 (`[0, +length]`), and returns the local `+length` handle endpoint and drag scale factor.
 */
export function inferConstructLengthAnchoring(
  constructDoc: ConstructDocument,
  currentLength: number,
  globalParams: Record<string, any> = {},
  overrides?: Record<string, any>
): ConstructLengthAnchoring {
  const localShapes = resolveConstructGeometry(
    {
      type: 'ConstructReference',
      x: 0,
      y: 0,
      rotation: 0,
      parameterOverrides: overrides,
    } as any,
    constructDoc,
    globalParams
  );

  const { minX, maxX, minY, maxY } = collectLocalExtents(localShapes);
  const localEndY = Number.isFinite(minY) && Number.isFinite(maxY) ? (minY + maxY) / 2 : 0;

  let isCentered = false;
  if (Number.isFinite(minX) && Number.isFinite(maxX) && maxX - minX > 1e-6) {
    const centerX = (minX + maxX) / 2;
    const span = maxX - minX;
    isCentered = minX < -1e-6 && maxX > 1e-6 && Math.abs(centerX) <= Math.max(0.05, span * 0.1);
  } else {
    const geomStr = JSON.stringify(constructDoc.geometry || []);
    isCentered =
      geomStr.includes('-{parameters.length}') ||
      /\{parameters\.length\}\s*\/\s*2\b/.test(geomStr) ||
      /0\.5\s*\*\s*\{parameters\.length\}/.test(geomStr) ||
      /\{parameters\.length\}\s*\*\s*0\.5\b/.test(geomStr);
  }

  if (isCentered) {
    return {
      isCentered: true,
      localEndX: currentLength / 2,
      localEndY,
      scaleFactor: 2,
    };
  }

  return {
    isCentered: false,
    localEndX: currentLength,
    localEndY,
    scaleFactor: 1,
  };
}

/**
 * Converts a construct's local `+length` endpoint into SVG user-space coordinates.
 */
export function computeConstructLengthEndpointSvg(params: {
  refX: number;
  refY: number;
  rotDeg: number;
  localEndX: number;
  localEndY: number;
  canvasHeight: number;
}): { svgX: number; svgY: number } {
  const { refX, refY, rotDeg, localEndX, localEndY, canvasHeight } = params;
  const rad = (rotDeg * Math.PI) / 180;
  const worldX = refX + localEndX * Math.cos(rad) - localEndY * Math.sin(rad);
  const worldY = refY + localEndX * Math.sin(rad) + localEndY * Math.cos(rad);
  return {
    svgX: worldX,
    svgY: canvasHeight - worldY,
  };
}

/**
 * Computes the next `length` override value from an SVG-space drag delta `(dx, dy)`,
 * projecting onto the construct's rotated local X axis and applying min/max clamping and step snapping.
 */
export function computeNextConstructLength(params: {
  initialLength: number;
  dx: number;
  dy: number;
  rotDeg: number;
  scaleFactor: number;
  min?: number;
  max?: number;
  step?: number;
}): number {
  const { initialLength, dx, dy, rotDeg, scaleFactor, min, max, step } = params;
  const rad = (rotDeg * Math.PI) / 180;
  // SVG +Y is down while Cartesian +Y is up, so Cartesian delta is (dx, -dy).
  const proj = dx * Math.cos(rad) + -dy * Math.sin(rad);
  const minLen = typeof min === 'number' && Number.isFinite(min) ? min : 0.1;

  let next = initialLength + scaleFactor * proj;
  next = Math.max(minLen, next);
  if (typeof max === 'number' && Number.isFinite(max)) {
    next = Math.min(max, next);
  }

  if (typeof step === 'number' && Number.isFinite(step) && step > 0) {
    const base = typeof min === 'number' && Number.isFinite(min) ? min : 0;
    next = base + Math.round((next - base) / step) * step;
    next = Math.max(minLen, next);
    if (typeof max === 'number' && Number.isFinite(max)) {
      next = Math.min(max, next);
    }
    return Number(next.toFixed(6));
  }

  return Math.round(next * 100) / 100;
}
