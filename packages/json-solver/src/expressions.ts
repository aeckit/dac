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
