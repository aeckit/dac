import { VisualizerUI } from '../index';
import { DetailDocument, SheetConfiguration, ProjectDocument, TitleBlockDocument } from '@aeckit/core-solver';
import { getEditorForShape, ParametricEditor, DocumentEditor, ViewportEditor } from '../editors';

export class PropertiesManager {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  /**
   * Generates dynamic form sliders for parameter variables associated with the selection
   */
  public renderPropertyEditor() {
    if (!this.ui.propertiesCardContainer) return;

    if (this.ui.selectedComponentIds.size === 0) {
      // Nothing selected, render Document Properties
      let scheduleHtml = '';
      if (this.ui.doc.type === 'CAD::SheetConfiguration') {
        const sheet = this.ui.getActiveSheet();
        if (sheet && sheet.viewports && sheet.viewports.length > 0) {
          scheduleHtml = `
            <div class="card" style="margin-top: 12px;">
              <h3 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Detail Schedule</h3>
              <div class="properties-editor-body" style="padding: 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                  <thead>
                    <tr style="border-bottom: 1px solid #334155;">
                      <th style="padding: 6px 4px; color: #94a3b8; font-weight: normal; width: 30px;">#</th>
                      <th style="padding: 6px 4px; color: #94a3b8; font-weight: normal;">Title</th>
                      <th style="padding: 6px 4px; color: #94a3b8; font-weight: normal; width: 60px;">Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sheet.viewports.map(vp => `
                      <tr class="schedule-row" data-cid="${vp.componentId}" style="border-bottom: 1px solid #1e293b; cursor: pointer; transition: background 0.1s;">
                        <td style="padding: 6px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${vp.hideDetailNumber ? '-' : (vp.detailNumber || '1')}</td>
                        <td style="padding: 6px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;" title="${vp.title || (typeof vp.detail === 'string' ? vp.detail.split('/').pop()?.replace('.json', '') : 'Detail')}">${vp.title || (typeof vp.detail === 'string' ? vp.detail.split('/').pop()?.replace('.json', '') : 'Detail')}</td>
                        <td style="padding: 6px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${vp.hideScale ? '-' : (vp.scale || '')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
      }

      let tbDoc: any = null;
      if (this.ui.doc.type === 'CAD::Project') {
        const ds = this.ui.doc as any;
        tbDoc = typeof ds.defaultTitleBlockRef === 'string' ? this.ui.titleBlockMap.get(ds.defaultTitleBlockRef) : ds.defaultTitleBlockRef;
      }

      this.ui.propertiesCardContainer.innerHTML = `
        <div class="card">
          <div class="properties-editor-body">
            ${DocumentEditor.renderHTML(this.ui.doc, this.ui.getActiveSheet(), tbDoc)}
          </div>
        </div>
        ${scheduleHtml}
      `;
      DocumentEditor.bindListeners({
        container: this.ui.propertiesCardContainer,
        getLatestDoc: () => {
          this.ui.lastUpdateTime = Date.now();
          return this.ui.doc;
        },
        getActiveSheet: () => {
          this.ui.lastUpdateTime = Date.now();
          return this.ui.getActiveSheet();
        },
        updateAndNotify: () => this.ui.updateAndNotify()
      });
      this.injectInlineApplyButtons();

      if (scheduleHtml) {
        const rows = this.ui.propertiesCardContainer.querySelectorAll('.schedule-row');
        rows.forEach(row => {
          row.addEventListener('click', () => {
            if (this.ui.isProject()) return;
            const cid = row.getAttribute('data-cid');
            if (cid) {
              this.ui.selectedComponentIds.clear();
              this.ui.selectedComponentIds.add(cid);
              this.ui.primaryComponentType = 'CAD::Viewport';
              if (this.ui.options.onSelectionChange) this.ui.options.onSelectionChange(this.ui.getSelectedComponentIds(), this.ui.primaryComponentType);
              this.ui.render();
            }
          });
          row.addEventListener('mouseenter', () => {
            (row as HTMLElement).style.backgroundColor = '#1e293b';
          });
          row.addEventListener('mouseleave', () => {
            (row as HTMLElement).style.backgroundColor = 'transparent';
          });
        });
      }

      return;
    }

    if (this.ui.selectedComponentIds.size > 1) {
      this.ui.propertiesCardContainer.innerHTML = `
        <div class="card">
          <div class="properties-editor-body" style="text-align: center; color: #94a3b8; padding: 16px;">
            <p style="margin-bottom: 8px;">${this.ui.selectedComponentIds.size} Items Selected</p>
            <p style="font-size: 11px;">Property editing is disabled for multiple selections.</p>
          </div>
        </div>
      `;
      return;
    }

    const cid = Array.from(this.ui.selectedComponentIds)[0];

    if (this.ui.primaryComponentType === 'CAD::Viewport') {
      const activeSheet = this.ui.getActiveSheet();
      if (!activeSheet || !activeSheet.viewports) return;
      
      const vpIndex = activeSheet.viewports.findIndex(v => v.componentId === cid);
      if (vpIndex === -1) return;
      const vp = activeSheet.viewports[vpIndex];

      this.ui.propertiesCardContainer.innerHTML = `
        <div class="card">
          <h3>Viewport Properties</h3>
          <div class="properties-editor-body">
            ${ViewportEditor.renderHTML(vp, vpIndex)}
          </div>
        </div>
      `;

      ViewportEditor.bindListeners({
        container: this.ui.propertiesCardContainer,
        shapeIndex: vpIndex,
        getLatestShape: () => {
          this.ui.lastUpdateTime = Date.now();
          const sheet = this.ui.getActiveSheet();
          return sheet && sheet.viewports ? sheet.viewports[vpIndex] : null;
        },
        updateAndNotify: () => this.ui.updateAndNotify()
      });
      this.injectInlineApplyButtons();
      return;
    }

    // We must find which detail document the component belongs to.
    const targetDoc = this.ui.findDocumentForComponent(cid);

    if (!targetDoc) {
      this.ui.propertiesCardContainer.innerHTML = `
        <div class="card">
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center;">
            No document found for selection.
          </div>
        </div>
      `;
      return;
    }

    // Filter parameters belonging to the selected componentId
    const componentParams: [string, any][] = [];
    if (targetDoc.parameters) {
      for (const [key, param] of Object.entries(targetDoc.parameters)) {
        if (param.componentId === cid) {
          componentParams.push([key, param]);
        }
      }
    }

    // Find matching geometry shapes for direct property editing (Text, Font Size, Stroke Width)
    const matchingShapes: { shape: any; index: number }[] = [];
    if (targetDoc.geometry && Array.isArray(targetDoc.geometry)) {
      let autoIndex = 0;
      targetDoc.geometry.forEach((shape, idx) => {
        const sid = shape.componentId || 'shape_' + autoIndex++;
        if (sid === cid) {
          matchingShapes.push({ shape, index: idx });
        }
      });
    }

    const niceName = this.ui.primaryComponentType?.split('::').pop() || 'Selected Component';

    if (componentParams.length === 0 && matchingShapes.length === 0) {
      this.ui.propertiesCardContainer.innerHTML = `
        <div class="card">
          <h3>${niceName}</h3>
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center; padding: 16px;">
            This component contains no editable properties.
          </div>
        </div>
      `;
      return;
    }

    let controlsHtml = '';
    let shapesHtml = '';

    const isParametricConstruct = componentParams.length > 0;

    if (isParametricConstruct) {
      controlsHtml = ParametricEditor.renderHTML(componentParams);
    } else {
      shapesHtml = matchingShapes.map(({ shape, index }) => {
        const editor = getEditorForShape(shape.type);
        return editor.renderHTML(shape, index);
      }).join('');
    }

    this.ui.propertiesCardContainer.innerHTML = `
      <div class="card">
        <h3>${niceName}</h3>
        <div class="properties-editor-body">
          ${controlsHtml}
          ${shapesHtml}
        </div>
      </div>
    `;

    if (isParametricConstruct) {
      ParametricEditor.bindListeners({
        container: this.ui.propertiesCardContainer,
        componentParams,
        getLatestDoc: () => {
          this.ui.lastUpdateTime = Date.now();
          return this.ui.findDocumentForComponent(cid) || (this.ui.doc as DetailDocument);
        },
        updateAndNotify: () => this.ui.updateAndNotify()
      });
    } else {
      matchingShapes.forEach(({ shape, index }) => {
        const editor = getEditorForShape(shape.type);
        editor.bindListeners({
          container: this.ui.propertiesCardContainer,
          shapeIndex: index,
          getLatestShape: () => {
            this.ui.lastUpdateTime = Date.now();
            const latestDoc = this.ui.findDocumentForComponent(cid) || (this.ui.doc as DetailDocument);
            return latestDoc.geometry && Array.isArray(latestDoc.geometry) ? latestDoc.geometry[index] : null;
          },
          updateAndNotify: () => this.ui.updateAndNotify()
        });
      });
    }
    
    this.injectInlineApplyButtons();
  }

  public injectInlineApplyButtons() {
    if (!this.ui.propertiesCardContainer) return;
    
    const textInputs = this.ui.propertiesCardContainer.querySelectorAll('input[type="text"], input[type="number"]');
    textInputs.forEach(input => {
      // Don't inject if it already has one or is part of a complex slider group
      if (input.parentElement && input.parentElement.classList.contains('param-slider-group')) return;

      const htmlInput = input as HTMLInputElement;

      // Create a wrapper to contain the input and the absolutely positioned button
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: flex-end;';
      
      // Give the wrapper flex-grow so it expands to match dropdowns
      wrapper.style.flex = '1';
      wrapper.style.minWidth = '0';
      wrapper.classList.add('precise-input-wrapper');

      // Insert wrapper and move input inside
      htmlInput.parentNode?.insertBefore(wrapper, htmlInput);
      wrapper.appendChild(htmlInput);

      // Make input fill wrapper and leave padding for the button
      htmlInput.style.width = '100%';
      htmlInput.style.boxSizing = 'border-box';
      htmlInput.style.paddingRight = '18px';

      const btn = document.createElement('button');
      btn.innerHTML = '✓';
      btn.title = "Apply Change";
      btn.className = 'inline-apply-btn';
      btn.style.cssText = 'display: none; background: transparent; border: none; color: #22c55e; cursor: pointer; padding: 0; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-weight: bold; font-size: 14px; outline: none; z-index: 10;';
      
      wrapper.appendChild(btn);

      htmlInput.addEventListener('input', () => {
        btn.style.display = 'block';
      });

      // Use mousedown so it fires before the input loses focus and triggers 'change' automatically
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        htmlInput.blur();
      });

      htmlInput.addEventListener('change', () => {
        btn.style.display = 'none';
      });
    });
  }
}
