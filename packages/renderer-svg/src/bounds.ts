import type { SolvedGroup } from '@aeckit/dac-json-solver';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  hasGeometry: boolean;
}

/**
 * Computes the exact Cartesian 2D bounding box across all shapes in solved groups.
 */
export function computeBoundingBox(groups: SolvedGroup[]): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasGeometry = false;

  const include = (x: number, y: number) => {
    if (!isNaN(x) && !isNaN(y)) {
      hasGeometry = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  };

  for (const group of groups) {
    for (const shape of group.shapes as any[]) {
      if (shape.type === 'CAD::Shape::Rectangle') {
        include(shape.x, shape.y);
        include(shape.x + (shape.width || 0), shape.y + (shape.height || 0));
      } else if (
        shape.type === 'CAD::Shape::Line' ||
        shape.type === 'CAD::Annotation::Dimension' ||
        shape.type === 'Line' ||
        shape.type === 'Dimension'
      ) {
        include(shape.x1, shape.y1);
        include(shape.x2, shape.y2);
      } else if (shape.type === 'CAD::Shape::Circle' || shape.type === 'Circle') {
        const r = shape.radius || shape.r || 1;
        include(shape.cx - r, shape.cy - r);
        include(shape.cx + r, shape.cy + r);
      } else if (shape.type === 'CAD::Annotation::Text' || shape.type === 'Text') {
        include(shape.x, shape.y);
      } else if (shape.type === 'CAD::Annotation::Leader' || shape.type === 'Leader') {
        include(shape.anchorX, shape.anchorY);
        include(shape.landingX, shape.landingY);
      }
    }
  }

  if (!hasGeometry || maxX <= minX || maxY <= minY) {
    return {
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
      width: 10,
      height: 10,
      hasGeometry: false,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    hasGeometry: true,
  };
}
