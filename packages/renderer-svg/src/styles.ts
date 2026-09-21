import { CadTheme, BlueprintTheme } from './theme';

export function getStyles(theme: CadTheme = BlueprintTheme): string {
  return `
    <style>
      :root, svg {
        --cad-bg: ${theme.background};
        --cad-grid: ${theme.grid};
        --cad-stroke: ${theme.defaultStroke};
        --cad-hatch: ${theme.hatch};
        --cad-dim-line: ${theme.dimensionLine};
        --cad-text: ${theme.text};
        --cad-dim-text: ${theme.dimensionText};
        --cad-origin-x: ${theme.originX};
        --cad-origin-y: ${theme.originY};
        --cad-image-bg: ${theme.imageFallbackBg};
        --cad-image-border: ${theme.imageFallbackBorder};
        --cad-image-text: ${theme.imageFallbackText};
        --cad-sel-stroke: ${theme.selectionStroke};
        --cad-sel-hover: ${theme.selectionHover};
      }
      
      .blueprint-bg { fill: var(--cad-bg); }
      .grid-line { stroke: var(--cad-grid); stroke-width: 0.01; }
      .cad-outline { stroke: var(--cad-stroke); stroke-width: 0.025; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .cad-hatch { stroke: var(--cad-hatch); }
      .dimension-line { stroke: var(--cad-dim-line); stroke-dasharray: 0.04,0.04; }
      .cad-text { fill: var(--cad-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: bold; }
      .dim-text { fill: var(--cad-dim-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: bold; text-anchor: middle; }
      .pointer-cursor { cursor: pointer; }
      
      .interactive-component text {
        pointer-events: bounding-box;
        cursor: pointer;
      }

      .selected-highlight rect:not(.cad-hit-area), 
      .selected-highlight circle:not(.cad-hit-area),
      .selected-highlight line:not(.cad-hit-area),
      .selected-highlight path:not(.cad-hit-area) {
        stroke: var(--cad-sel-stroke) !important;
        stroke-width: 0.06 !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: stroke 0.2s ease, stroke-width 0.1s ease;
      }
      .selected-highlight text {
        fill: var(--cad-sel-stroke) !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: fill 0.2s ease;
      }
      .interactive-component:hover rect:not(.cad-hit-area),
      .interactive-component:hover circle:not(.cad-hit-area),
      .interactive-component:hover line:not(.cad-hit-area),
      .interactive-component:hover path:not(.cad-hit-area) {
        stroke: var(--cad-sel-hover);
        stroke-width: 0.05 !important;
        transition: stroke 0.15s ease, stroke-width 0.15s ease;
      }
      
      .interactive-component:hover text {
        fill: var(--cad-sel-hover) !important;
        filter: url(#hover-text-bg);
        transition: fill 0.15s ease;
      }
    </style>
  `;
}
