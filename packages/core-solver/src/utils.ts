/**
 * Returns the scale multiplier (model inches to paper inches).
 */
export function resolveScaleMultiplier(scaleStr: string): number {
  if (typeof scaleStr !== 'string') {
    console.warn('resolveScaleMultiplier called with non-string:', scaleStr);
    return 1.0;
  }
  const clean = scaleStr.replace(/\s+/g, '').replace(/['"]/g, '');
  if (clean.includes('1:1') || clean.includes('FULL')) return 1.0;

  if (clean === '1=1-0') return 1.0 / 12.0;
  if (clean === '1/2=1-0') return 0.5 / 12.0;
  if (clean === '1/4=1-0') return 0.25 / 12.0;
  if (clean === '1/8=1-0') return 0.125 / 12.0;
  if (clean === '3=1-0') return 3.0 / 12.0;
  if (clean === '1-1/2=1-0') return 1.5 / 12.0;
  if (clean === '3/4=1-0') return 0.75 / 12.0;
  if (clean === '3/8=1-0') return 0.375 / 12.0;
  if (clean === '3/16=1-0') return 0.1875 / 12.0;

  return 1.0 / 12.0;
}

export function evaluateExpression(expr: any, params: Record<string, number | boolean>): any {
  if (typeof expr !== 'string') return expr;

  if (!expr.includes('{parameters.')) {
    const num = Number(expr);
    return isNaN(num) ? expr : num;
  }

  let parsed = expr;
  for (const [key, val] of Object.entries(params)) {
    parsed = parsed.split(`{parameters.${key}}`).join(String(val));
  }

  parsed = parsed.replace(/px/g, '');

  try {
    return new Function(`return (${parsed})`)();
  } catch (err) {
    return parsed;
  }
}