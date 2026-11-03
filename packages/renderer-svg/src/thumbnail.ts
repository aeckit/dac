import type { DetailDocument, ConstructDocument } from '@aeckit/dac-json-solver';
import { solveDocumentGeometry } from '@aeckit/dac-json-solver';
import { computeBoundingBox } from './bounds';
import { renderSolvedGroups } from './renderer';
import { getDefs } from './defs';
import { getStyles } from './styles';
import { CadTheme, BlueprintTheme, PaperTheme } from './theme';

export type CadThemeInput = 'light' | 'dark' | CadTheme;

export function resolveCadTheme(theme?: CadThemeInput): CadTheme {
  if (!theme || theme === 'light') return PaperTheme;
  if (theme === 'dark') return BlueprintTheme;
  return theme;
}

export interface ThumbnailOptions {
  theme?: CadThemeInput;
  paddingRatio?: number;
  constructResolver?: (id: string) => ConstructDocument | undefined;
}

/**
 * Generates an auto-fitted standalone SVG string thumbnail for any DaC Detail or Construct document.
 */
export function renderThumbnailSvg(
  doc: DetailDocument | ConstructDocument,
  options: ThumbnailOptions = {}
): string {
  const { theme, paddingRatio = 0.15, constructResolver } = options;

  if (!doc || !Array.isArray(doc.geometry)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>`;
  }

  // Solve geometry with Cartesian Y=0 at origin
  const groups = solveDocumentGeometry(doc as any, 1, {}, 0, constructResolver);
  const geometries = renderSolvedGroups(groups, 1, 0, false);
  const bounds = computeBoundingBox(groups);

  const padding = Math.max(bounds.width, bounds.height) * paddingRatio + 1;
  const vbX = bounds.minX - padding;
  const vbY = -(bounds.maxY + padding);
  const vbW = bounds.width + padding * 2;
  const vbH = bounds.height + padding * 2;
  const resolvedTheme = resolveCadTheme(theme);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" class="w-full h-full pointer-events-none select-none">
  ${getDefs()}
  <g transform="scale(1, -1)">
    ${geometries}
  </g>
  ${getStyles(resolvedTheme)}
</svg>
  `.trim();
}
