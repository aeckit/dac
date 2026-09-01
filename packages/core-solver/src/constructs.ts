import { GeometryPrimitive, ConstructDocument } from './types';
import { evaluateExpression } from './utils';

export function explodeConstruct(
  shape: GeometryPrimitive, 
  constructDoc: ConstructDocument, 
  globalParams: Record<string, number | boolean> = {}
): GeometryPrimitive[] {
  const resolvedParams: Record<string, number | boolean> = { ...globalParams };
  if (constructDoc.parameters) {
    for (const [key, param] of Object.entries(constructDoc.parameters)) {
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
  if (shape.parameterOverrides) {
    for (const [key, val] of Object.entries(shape.parameterOverrides)) {
      resolvedParams[key] = evaluateExpression(val, globalParams);
    }
  }

  const refX = evaluateExpression(shape.x || 0, globalParams);
  const refY = evaluateExpression(shape.y || 0, globalParams);
  const refRot = evaluateExpression(shape.rotation || 0, globalParams);

  const results: GeometryPrimitive[] = [];
  
  for (const child of constructDoc.geometry) {
    const cloned = JSON.parse(JSON.stringify(child));
    
    for (const key of Object.keys(cloned)) {
      if (typeof cloned[key] === 'string' && cloned[key].includes('{parameters.')) {
         cloned[key] = evaluateExpression(cloned[key], resolvedParams);
      }
    }

    const points = [
      ['x', 'y'],
      ['x1', 'y1'],
      ['x2', 'y2'],
      ['cx', 'cy']
    ];
    
    for (const [kx, ky] of points) {
      if (cloned[kx] !== undefined && cloned[ky] !== undefined) {
        const valX = evaluateExpression(cloned[kx], resolvedParams);
        const valY = evaluateExpression(cloned[ky], resolvedParams);
        if (refRot !== 0) {
          const rad = refRot * Math.PI / 180;
          const rx = valX * Math.cos(rad) - valY * Math.sin(rad);
          const ry = valX * Math.sin(rad) + valY * Math.cos(rad);
          cloned[kx] = rx + refX;
          cloned[ky] = ry + refY;
        } else {
          cloned[kx] = valX + refX;
          cloned[ky] = valY + refY;
        }
      } else if (cloned[kx] !== undefined) {
        cloned[kx] = evaluateExpression(cloned[kx], resolvedParams) + refX;
      } else if (cloned[ky] !== undefined) {
        cloned[ky] = evaluateExpression(cloned[ky], resolvedParams) + refY;
      }
    }

    if (cloned.dx !== undefined && cloned.dy !== undefined) {
      const valDX = evaluateExpression(cloned.dx, resolvedParams);
      const valDY = evaluateExpression(cloned.dy, resolvedParams);
      if (refRot !== 0) {
        const rad = refRot * Math.PI / 180;
        cloned.dx = valDX * Math.cos(rad) - valDY * Math.sin(rad);
        cloned.dy = valDX * Math.sin(rad) + valDY * Math.cos(rad);
      } else {
        cloned.dx = valDX;
        cloned.dy = valDY;
      }
    } else if (cloned.dx !== undefined) {
      cloned.dx = evaluateExpression(cloned.dx, resolvedParams);
    } else if (cloned.dy !== undefined) {
      cloned.dy = evaluateExpression(cloned.dy, resolvedParams);
    }
    
    if (cloned.width !== undefined) cloned.width = evaluateExpression(cloned.width, resolvedParams);
    if (cloned.height !== undefined) cloned.height = evaluateExpression(cloned.height, resolvedParams);
    if (cloned.r !== undefined) cloned.r = evaluateExpression(cloned.r, resolvedParams);
    if (cloned.fontSize !== undefined) cloned.fontSize = evaluateExpression(cloned.fontSize, resolvedParams);
    
    if (refRot !== 0) {
      cloned.rotation = (evaluateExpression(cloned.rotation || 0, resolvedParams)) + refRot;
    }

    if (child.componentId) {
      cloned.componentId = `${shape.componentId || 'construct'}_${child.componentId}`;
    } else {
      cloned.componentId = `${shape.componentId || 'construct'}_${Math.random().toString(36).substr(2, 5)}`;
    }

    results.push(cloned);
  }

  return results;
}
