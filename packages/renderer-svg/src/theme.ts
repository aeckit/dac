export interface CadTheme {
  background: string;
  grid: string;
  defaultStroke: string;
  hatch: string;
  dimensionLine: string;
  text: string;
  dimensionText: string;
  originX: string;
  originY: string;
  imageFallbackBg: string;
  imageFallbackBorder: string;
  imageFallbackText: string;
  selectionStroke: string;
  selectionHover: string;
}

export const BlueprintTheme: CadTheme = {
  background: '#0f172a',
  grid: '#1e293b',
  defaultStroke: '#f8fafc',
  hatch: '#475569',
  dimensionLine: '#06b6d4',
  text: '#f1f5f9',
  dimensionText: '#06b6d4',
  originX: '#f43f5e',
  originY: '#38bdf8',
  imageFallbackBg: '#334155',
  imageFallbackBorder: '#475569',
  imageFallbackText: '#94a3b8',
  selectionStroke: '#06b6d4',
  selectionHover: '#38bdf8'
};

export const PaperTheme: CadTheme = {
  background: '#ffffff',
  grid: '#e2e8f0',
  defaultStroke: '#000000',
  hatch: '#94a3b8',
  dimensionLine: '#0284c7',
  text: '#000000',
  dimensionText: '#0284c7',
  originX: '#e11d48',
  originY: '#0284c7',
  imageFallbackBg: '#f1f5f9',
  imageFallbackBorder: '#cbd5e1',
  imageFallbackText: '#64748b',
  selectionStroke: '#3b82f6',
  selectionHover: '#2563eb'
};
