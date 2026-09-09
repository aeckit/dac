/**
 * Maps paper sizes to physical inches
 */
export function getPaperDimensions(size: string): { width: number; height: number } {
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
