import { DetailDocument } from '@aeckit/core-solver';

export function getVisualizerShellTemplate(doc: any, globalSettingsHtml: string = ''): string {
  const scaleSelectOptions = doc.type === 'CAD::Detail' ? `
    <div style="margin-bottom: 12px; padding: 12px; background-color: #1e293b; border-radius: 6px; border: 1px solid #334155;">
      <div style="font-size: 11px; font-weight: bold; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase;">Detail Settings</div>
      <div class="control-label-row">
        <label>Drawing Scale</label>
        <select id="scale-select" class="precise-input" style="width: 120px;">
          <option value="1/2=1-0" ${((doc as DetailDocument).scale || '').includes('1/2') ? 'selected' : ''}>1/2" = 1'-0" (1:24)</option>
          <option value="1=1-0" ${((doc as DetailDocument).scale || '').includes('1=') || ((doc as DetailDocument).scale || '').includes('1"') ? 'selected' : ''}>1" = 1'-0" (1:12)</option>
          <option value="3=1-0" ${((doc as DetailDocument).scale || '').includes('3=') || ((doc as DetailDocument).scale || '').includes('3"') ? 'selected' : ''}>3" = 1'-0" (1:4)</option>
          <option value="1:1" ${((doc as DetailDocument).scale || '').includes('1:1') ? 'selected' : ''}>1:1 (Full Size)</option>
        </select>
      </div>
    </div>
  ` : '';

  return `
    <div class="panel left-panel" id="left-sidebar">
      <div class="control-header" style="padding: 0; border: none; min-height: 0;">
        <div class="status-pill" id="json-validity-status" style="display: none; color: #ef4444;"><span class="status-indicator" style="background-color: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5);"></span>JSON Error</div>
      </div>
      
      <div id="sheet-dropdown-container"></div>
      
      ${scaleSelectOptions}
      ${globalSettingsHtml}

      <!-- Component-specific dynamic properties form -->
      <div id="properties-card-container"></div>
    </div>
    
    <div class="panel right-panel" id="right-canvas">
      <div class="canvas-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="reset-btn icon-btn" id="btn-toggle-left-pane" title="Toggle Left Sidebar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v6h3V5H3zm4 0v6h7V5H7z"/>
            </svg>
          </button>
          <span id="canvas-view-type-badge" style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; background: #1e293b; padding: 2px 6px; border-radius: 4px;">VIEW TYPE</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1;">
          <button class="reset-btn icon-btn" id="btn-add-rect" title="Add Rectangle">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/></svg>
          </button>
          <button class="reset-btn icon-btn" id="btn-add-line" title="Add Line">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="13" x2="13" y2="3"/><circle cx="3" cy="13" r="1.5" fill="currentColor"/><circle cx="13" cy="3" r="1.5" fill="currentColor"/></svg>
          </button>
          <button class="reset-btn icon-btn" id="btn-add-text" title="Add Text">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4V3h10v1M8 3v10M6 13h4"/></svg>
          </button>
          <button class="reset-btn icon-btn" id="btn-add-image" title="Add Image">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="5.5" cy="6.5" r="1.5"/><path d="M14 10L10.5 6L6 11L4 9L2 11"/></svg>
          </button>
          <button class="reset-btn icon-btn" id="btn-add-viewport" title="Add Viewport">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="10" height="10" rx="1"/><rect x="5" y="5" width="6" height="6" stroke-dasharray="1 1"/></svg>
          </button>
          <div id="canvas-header-divider" style="width: 1px; height: 16px; background: #334155; margin: 0 4px;"></div>
          <button class="reset-btn icon-btn" id="reset-view-btn" title="Reset View (Zoom Extents)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/><rect x="5" y="5" width="6" height="6" rx="0.5"/></svg>
          </button>
        </div>
        <div style="display: flex; align-items: center;">
          <button class="reset-btn icon-btn" id="btn-toggle-right-pane" title="Toggle Inspector/JSON">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><line x1="10" y1="3" x2="10" y2="13"/></svg>
          </button>
        </div>
      </div>
      <div class="svg-viewport" id="svg-viewport-container" style="cursor: crosshair; overflow: hidden; background: #000; position: relative;">
        <div id="svg-viewport-wrapper" style="transform-origin: 0 0; min-width: 100%; min-height: 100%;"></div>
        <div id="canvas-edit-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 10;">
          <style>
            .interactive-component.pointer-cursor { cursor: pointer; transition: filter 0.1s ease, opacity 0.1s ease; }
            .interactive-component.pointer-cursor:hover { opacity: 0.8; filter: drop-shadow(0px 0px 4px rgba(56, 189, 248, 0.6)); }
            .edit-grabber {
              display: none; position: absolute; pointer-events: auto;
              width: 8px; height: 8px; background: #3b82f6; border: 1px solid #ffffff;
              box-shadow: 0 1px 2px rgba(0,0,0,0.5); transform: translate(-50%, -50%);
            }
            .edit-grabber[data-dir="nw"] { cursor: nwse-resize; }
            .edit-grabber[data-dir="n"] { cursor: ns-resize; }
            .edit-grabber[data-dir="ne"] { cursor: nesw-resize; }
            .edit-grabber[data-dir="e"] { cursor: ew-resize; }
            .edit-grabber[data-dir="se"] { cursor: nwse-resize; }
            .edit-grabber[data-dir="s"] { cursor: ns-resize; }
            .edit-grabber[data-dir="sw"] { cursor: nesw-resize; }
            .edit-grabber[data-dir="w"] { cursor: ew-resize; }
            .edit-grabber[data-dir="line-start"], .edit-grabber[data-dir="line-end"] { cursor: crosshair; }
            
            #canvas-edit-overlay.crop-mode .edit-grabber {
              background: transparent; border: none; box-shadow: none; width: 20px; height: 20px;
            }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="nw"] { border-top: 4px solid #111; border-left: 4px solid #111; border-radius: 2px 0 0 0; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8)); transform: translate(-2px, -2px); }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="ne"] { border-top: 4px solid #111; border-right: 4px solid #111; border-radius: 0 2px 0 0; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8)); transform: translate(-18px, -2px); }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="se"] { border-bottom: 4px solid #111; border-right: 4px solid #111; border-radius: 0 0 2px 0; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8)); transform: translate(-18px, -18px); }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="sw"] { border-bottom: 4px solid #111; border-left: 4px solid #111; border-radius: 0 0 0 2px; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8)); transform: translate(-2px, -18px); }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="n"], #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="s"] { width: 24px; height: 4px; border-radius: 2px; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8)); }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="n"] { border-top: 4px solid #111; }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="s"] { border-bottom: 4px solid #111; }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="e"], #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="w"] { width: 4px; height: 24px; border-radius: 2px; filter: drop-shadow(0px 0px 1px rgba(255,255,255,0.8)); }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="e"] { border-right: 4px solid #111; }
            #canvas-edit-overlay.crop-mode .edit-grabber[data-dir="w"] { border-left: 4px solid #111; }
          </style>
          <div id="edit-overlay-btn-move" style="display: none; position: absolute; pointer-events: auto; width: 24px; height: 24px; background: #1e293b; border: 1px solid #475569; border-radius: 4px; color: #f8fafc; cursor: move; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 14px;" title="Move">
            <svg style="pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M9 19l3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
          </div>
          <div id="edit-overlay-btn-open" style="display: none; position: absolute; pointer-events: auto; width: 24px; height: 24px; background: #1e293b; border: 1px solid #475569; border-radius: 4px; color: #f8fafc; cursor: pointer; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 14px;" title="Open Detail">
            <svg style="pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </div>
          <div id="edit-overlay-btn-crop" style="display: none; position: absolute; pointer-events: auto; width: 24px; height: 24px; background: #1e293b; border: 1px solid #475569; border-radius: 4px; color: #f8fafc; cursor: pointer; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 14px;" title="Toggle Crop Mode">
            <svg style="pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>
          </div>
          <div id="edit-overlay-btn-delete" style="display: none; position: absolute; pointer-events: auto; width: 24px; height: 24px; background: #7f1d1d; border: 1px solid #b91c1c; border-radius: 4px; color: #f8fafc; cursor: pointer; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: 14px;">
            <svg style="pointer-events: none;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
          </div>
          <div class="edit-grabber" data-dir="nw"></div>
          <div class="edit-grabber" data-dir="n"></div>
          <div class="edit-grabber" data-dir="ne"></div>
          <div class="edit-grabber" data-dir="e"></div>
          <div class="edit-grabber" data-dir="se"></div>
          <div class="edit-grabber" data-dir="s"></div>
          <div class="edit-grabber" data-dir="sw"></div>
          <div class="edit-grabber" data-dir="w"></div>
          <div class="edit-grabber" data-dir="line-start" style="border-radius: 50%;"></div>
          <div class="edit-grabber" data-dir="line-end" style="border-radius: 50%;"></div>
        </div>
      </div>
    </div>
  `;
}
