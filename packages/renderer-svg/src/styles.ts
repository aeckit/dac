export function getStyles(): string {
  return `
    <style>
      .blueprint-bg { fill: #0f172a; }
      .grid-line { stroke: #1e293b; stroke-width: 0.01; }
      .cad-outline { stroke: #f8fafc; stroke-width: 0.025; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .cad-hatch { stroke: #475569; }
      .dimension-line { stroke: #06b6d4; stroke-dasharray: 0.04,0.04; }
      .cad-text { fill: #f1f5f9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: bold; }
      .dim-text { fill: #06b6d4; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: bold; text-anchor: middle; }
      .pointer-cursor { cursor: pointer; }
      
      .interactive-component text {
        pointer-events: bounding-box;
        cursor: pointer;
      }

      .selected-highlight rect:not(.cad-hit-area), 
      .selected-highlight circle:not(.cad-hit-area),
      .selected-highlight line:not(.cad-hit-area),
      .selected-highlight path:not(.cad-hit-area) {
        stroke: #06b6d4 !important;
        stroke-width: 0.06 !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: stroke 0.2s ease, stroke-width 0.1s ease;
      }
      .selected-highlight text {
        fill: #06b6d4 !important;
        filter: drop-shadow(0 0 0.04 rgba(6, 182, 212, 0.4));
        transition: fill 0.2s ease;
      }
      .interactive-component:hover rect:not(.cad-hit-area),
      .interactive-component:hover circle:not(.cad-hit-area),
      .interactive-component:hover line:not(.cad-hit-area),
      .interactive-component:hover path:not(.cad-hit-area) {
        stroke: #38bdf8;
        stroke-width: 0.05 !important;
        transition: stroke 0.15s ease, stroke-width 0.15s ease;
      }
      
      .interactive-component:hover text {
        fill: #38bdf8 !important;
        filter: url(#hover-text-bg);
        transition: fill 0.15s ease;
      }
    </style>
  `;
}
