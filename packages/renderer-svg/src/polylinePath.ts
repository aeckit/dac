export interface Point2D {
  x: number;
  y: number;
}

export interface CornerFillet {
  hasFillet: boolean;
  A: Point2D;
  B: Point2D;
  rEff: number;
  sweepFlag: number;
}

function formatCoord(n: number): string {
  if (Math.abs(n - Math.round(n)) < 1e-4) {
    return String(Math.round(n));
  }
  return String(parseFloat(n.toFixed(4)));
}

/**
 * Calculates the fillet arc tangent points, effective radius, and sweep flag for a corner vertex.
 */
export function calculateCornerFillet(
  prev: Point2D,
  curr: Point2D,
  next: Point2D,
  radius: number
): CornerFillet {
  const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
  const v2 = { x: next.x - curr.x, y: next.y - curr.y };
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);

  if (len1 < 1e-6 || len2 < 1e-6 || radius <= 0) {
    return { hasFillet: false, A: curr, B: curr, rEff: 0, sweepFlag: 0 };
  }

  const u1 = { x: v1.x / len1, y: v1.y / len1 };
  const u2 = { x: v2.x / len2, y: v2.y / len2 };

  const dot = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
  const theta = Math.acos(dot); // Interior angle in [0, PI]

  // If points are collinear or hairpin turn (within ~0.01 rad of 0 or PI), do not fillet
  if (theta < 0.01 || theta > Math.PI - 0.01) {
    return { hasFillet: false, A: curr, B: curr, rEff: 0, sweepFlag: 0 };
  }

  const halfTheta = theta / 2;
  const tanHalf = Math.tan(halfTheta);
  if (tanHalf < 1e-6) {
    return { hasFillet: false, A: curr, B: curr, rEff: 0, sweepFlag: 0 };
  }

  let t = radius / tanHalf;
  const maxT = Math.min(len1 / 2, len2 / 2);
  if (t > maxT) {
    t = maxT;
  }
  const rEff = t * tanHalf;

  if (t < 1e-4 || rEff < 1e-4) {
    return { hasFillet: false, A: curr, B: curr, rEff: 0, sweepFlag: 0 };
  }

  const A = { x: curr.x + t * u1.x, y: curr.y + t * u1.y };
  const B = { x: curr.x + t * u2.x, y: curr.y + t * u2.y };

  // In SVG coordinates (+Y down), cross product u1x * u2y - u1y * u2x < 0 denotes a clockwise turn
  const cross = u1.x * u2.y - u1.y * u2.x;
  const sweepFlag = cross < 0 ? 1 : 0;

  return { hasFillet: true, A, B, rEff, sweepFlag };
}

/**
 * Computes an SVG path 'd' string for a polyline with filleted corners.
 *
 * @param points Array of Cartesian [x, y] coordinates
 * @param radius Corner radius (fillet)
 * @param closed Whether the polyline is closed
 * @param canvasHeight Canvas height used for Cartesian (+Y UP) to SVG (+Y DOWN) conversion
 */
export function computeFilletedPolylinePath(
  points: [number, number][],
  radius: number,
  closed: boolean,
  canvasHeight = 18
): string {
  if (!points || points.length < 2) return '';

  // Convert Cartesian points to SVG coordinates (+Y downwards)
  const svgPts: Point2D[] = points.map(([x, y]) => ({
    x: Number(x),
    y: canvasHeight - Number(y)
  }));

  const n = svgPts.length;

  // For 2 points, open is a straight line and closed is degenerate
  if (n === 2) {
    const p0 = `${formatCoord(svgPts[0].x)} ${formatCoord(svgPts[0].y)}`;
    const p1 = `${formatCoord(svgPts[1].x)} ${formatCoord(svgPts[1].y)}`;
    return closed ? `M ${p0} L ${p1} Z` : `M ${p0} L ${p1}`;
  }

  if (closed) {
    const corners: CornerFillet[] = [];
    for (let i = 0; i < n; i++) {
      const prev = svgPts[(i - 1 + n) % n];
      const curr = svgPts[i];
      const next = svgPts[(i + 1) % n];
      corners.push(calculateCornerFillet(prev, curr, next, radius));
    }

    const startPt = corners[0].hasFillet ? corners[0].B : svgPts[0];
    let d = `M ${formatCoord(startPt.x)} ${formatCoord(startPt.y)}`;

    for (let i = 1; i < n; i++) {
      const corner = corners[i];
      if (corner.hasFillet) {
        d += ` L ${formatCoord(corner.A.x)} ${formatCoord(corner.A.y)}`;
        d += ` A ${formatCoord(corner.rEff)} ${formatCoord(corner.rEff)} 0 0 ${corner.sweepFlag} ${formatCoord(corner.B.x)} ${formatCoord(corner.B.y)}`;
      } else {
        d += ` L ${formatCoord(svgPts[i].x)} ${formatCoord(svgPts[i].y)}`;
      }
    }

    // Connect back to corner 0
    if (corners[0].hasFillet) {
      d += ` L ${formatCoord(corners[0].A.x)} ${formatCoord(corners[0].A.y)}`;
      d += ` A ${formatCoord(corners[0].rEff)} ${formatCoord(corners[0].rEff)} 0 0 ${corners[0].sweepFlag} ${formatCoord(corners[0].B.x)} ${formatCoord(corners[0].B.y)}`;
    } else {
      d += ` L ${formatCoord(svgPts[0].x)} ${formatCoord(svgPts[0].y)}`;
    }

    d += ' Z';
    return d;
  } else {
    // Open polyline: start at P0, fillet interior vertices 1 .. n-2, end at P_{n-1}
    let d = `M ${formatCoord(svgPts[0].x)} ${formatCoord(svgPts[0].y)}`;

    for (let i = 1; i < n - 1; i++) {
      const prev = svgPts[i - 1];
      const curr = svgPts[i];
      const next = svgPts[i + 1];
      const corner = calculateCornerFillet(prev, curr, next, radius);

      if (corner.hasFillet) {
        d += ` L ${formatCoord(corner.A.x)} ${formatCoord(corner.A.y)}`;
        d += ` A ${formatCoord(corner.rEff)} ${formatCoord(corner.rEff)} 0 0 ${corner.sweepFlag} ${formatCoord(corner.B.x)} ${formatCoord(corner.B.y)}`;
      } else {
        d += ` L ${formatCoord(curr.x)} ${formatCoord(curr.y)}`;
      }
    }

    d += ` L ${formatCoord(svgPts[n - 1].x)} ${formatCoord(svgPts[n - 1].y)}`;
    return d;
  }
}
