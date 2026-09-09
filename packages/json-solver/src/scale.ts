/**
 * Returns the scale multiplier (model inches to paper inches).
 */
export function resolveScaleMultiplier(scaleStr: string): number {
  if (typeof scaleStr !== 'string') {
    return 1.0;
  }
  const clean = scaleStr.replace(/\s+/g, '').replace(/['"]/g, '');
  if (clean === '1:1' || clean === 'FULL') return 1.0;

  if (clean === '1=1-0') return 1.0 / 12.0;
  if (clean === '1/2=1-0') return 0.5 / 12.0;
  if (clean === '1/4=1-0') return 0.25 / 12.0;
  if (clean === '1/8=1-0') return 0.125 / 12.0;
  if (clean === '3=1-0') return 3.0 / 12.0;
  if (clean === '1-1/2=1-0') return 1.5 / 12.0;
  if (clean === '3/4=1-0') return 0.75 / 12.0;
  if (clean === '3/8=1-0') return 0.375 / 12.0;
  if (clean === '3/16=1-0') return 0.1875 / 12.0;

  // Handle ratios like "1:1.5" or "1:2"
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return num / den;
    }
  }

  return 1.0 / 12.0;
}
