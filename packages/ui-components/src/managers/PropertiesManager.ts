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

    const applyHtml = (htmlContent: string) => {
      this.ui.propertiesCardContainer.innerHTML = htmlContent;
      const filenameInput = this.ui.propertiesCardContainer.querySelector('.doc-filename-input') as HTMLInputElement;
      if (filenameInput && this.ui.options.onFileRename) {
        filenameInput.addEventListener('change', () => {
          const newName = filenameInput.value.trim();
          if (newName && newName !== this.ui.options.activeFilename) {
            this.ui.options.onFileRename!(newName);
          }
        });
      }
    };

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

    let filenameHtml = '';
    if (this.ui.options.activeFilename && this.ui.options.onFileRename) {
      filenameHtml = `
        <div class="card" style="margin-bottom: 12px;">
          <div class="properties-editor-body">
            <div class="form-group" style="margin-bottom: 0;">
              <div class="control-label-row">
                <label class="control-label">File Name</label>
                <input type="text" class="precise-input doc-filename-input" value="${this.ui.options.activeFilename}" />
              </div>
            </div>
          </div>
        </div>
      `;
    }

    let html = `
      ${filenameHtml}
      <div class="card">
        <div class="properties-editor-body">
          ${DocumentEditor.renderHTML(this.ui.doc, this.ui.getActiveSheet(), tbDoc)}
        </div>
      </div>
    `;

    if (this.ui.selectedComponentIds.size === 0) {
      let constructParamsHtml = '';
      if (this.ui.doc.type === 'CAD::Construct' && this.ui.doc.parameters) {
        const allParams = Object.entries(this.ui.doc.parameters);
        if (allParams.length > 0) {
          constructParamsHtml = `
            <div class="card" style="margin-top: 12px;">
              <h3 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8;">Construct Parameters (Preview)</h3>
              <div class="properties-editor-body">
                ${ParametricEditor.renderHTML(allParams)}
              </div>
            </div>
          `;
        }
      }

      html += scheduleHtml;
      html += constructParamsHtml;
      applyHtml(html);
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
      
      if (this.ui.doc.type === 'CAD::Construct' && this.ui.doc.parameters) {
        ParametricEditor.bindListeners({
          container: this.ui.propertiesCardContainer,
          componentParams: Object.entries(this.ui.doc.parameters),
          getLatestDoc: () => {
            this.ui.lastUpdateTime = Date.now();
            return this.ui.doc;
          },
          updateAndNotify: () => this.ui.updateAndNotify()
        });
      }
      return;
    }

    if (this.ui.selectedComponentIds.size > 1) {
      html += `
        <div class="card">
          <div class="properties-editor-body" style="text-align: center; color: #94a3b8; padding: 16px;">
            <p style="margin-bottom: 8px;">${this.ui.selectedComponentIds.size} Items Selected</p>
            <p style="font-size: 11px;">Property editing is disabled for multiple selections.</p>
          </div>
        </div>
      `;
      applyHtml(html);
      
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
      return;
    }

    const cid = Array.from(this.ui.selectedComponentIds)[0];

    if (this.ui.primaryComponentType === 'CAD::Viewport') {
      const activeSheet = this.ui.getActiveSheet();
      if (!activeSheet || !activeSheet.viewports) return;
      
      const vpIndex = activeSheet.viewports.findIndex(v => v.componentId === cid);
      if (vpIndex === -1) return;
      const vp = activeSheet.viewports[vpIndex];

      html += `
        <div class="card">
          <div class="properties-editor-body">
            ${ViewportEditor.renderHTML(vp, vpIndex)}
          </div>
        </div>
      `;
      applyHtml(html);

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
      html += `
        <div class="card">
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center; padding: 16px;">
            This component contains no editable properties.
          </div>
        </div>
      `;
      applyHtml(html);
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

    html += `
      <div class="card">
        <div class="properties-editor-body">
          ${controlsHtml}
          ${shapesHtml}
        </div>
      </div>
    `;
    applyHtml(html);

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
  }
}
