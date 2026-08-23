import { PropertyEditor, ParametricEditorContext } from './types';
import { DetailDocument, SheetConfiguration, ProjectDocument } from '@aeckit/core-solver';

export interface DocumentEditorContext {
  container: HTMLElement;
  getLatestDoc: () => any | null;
  getActiveSheet?: () => SheetConfiguration | null;
  updateAndNotify: () => void;
}

export const DocumentEditor = {
  renderHTML(doc: any, sheet?: any, tbDoc?: any): string {
    if (doc.type === 'CAD::Detail') {
      return `
        <div class="form-group" data-doc-prop="scale">
          <div class="control-label-row">
            <label class="control-label">Scale</label>
            <input type="text" class="precise-input doc-scale-input" value="${doc.scale}" />
          </div>
        </div>
      `;
    }

    if (doc.type === 'CAD::Project' || doc.type === 'CAD::SheetConfiguration') {
      const isSheet = doc.type === 'CAD::SheetConfiguration';
      const dset = doc.type === 'CAD::Project' ? doc : null;
      
      let html = '';
      if (dset) {
        html += `
          <div class="form-group" data-doc-prop="project">
            <div class="control-label-row">
              <label class="control-label">Project Name</label>
              <input type="text" class="precise-input doc-project-input" value="${dset.projectName || ''}" />
            </div>
          </div>
        `;
        
        let dsetTbName = typeof dset.defaultTitleBlockRef === 'string' ? dset.defaultTitleBlockRef : '';
        let dsetTbX = dset.titleBlockOffsetX || 0;
        let dsetTbY = dset.titleBlockOffsetY || 0;
        
        html += `
          <div class="sidebar-section-title" style="margin-top: 16px; margin-bottom: 8px;">GLOBAL TITLE BLOCK</div>
          <div class="form-group" data-doc-prop="titleBlock">
            <div class="control-label-row">
              <label class="control-label">Source File</label>
              <input type="text" class="precise-input doc-titleblock-input" data-target="dset" placeholder="e.g. titleblock.json" value="${dsetTbName}" />
            </div>
            <div class="control-label-row" style="margin-top: 8px;">
              <label class="control-label">Origin X</label>
              <input type="number" class="precise-input doc-tbx-input" data-target="dset" value="${dsetTbX}" />
            </div>
            <div class="control-label-row" style="margin-top: 8px;">
              <label class="control-label">Origin Y</label>
              <input type="number" class="precise-input doc-tby-input" data-target="dset" value="${dsetTbY}" />
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid var(--vscode-panel-border); margin: 16px 0;" />
        `;

        if (tbDoc && tbDoc.parameters) {
          html += `<div class="sidebar-section-title" style="margin-bottom: 8px;">TITLE BLOCK PARAMETERS</div>`;
          html += `<div class="form-group" data-doc-prop="tbParams">`;
          for (const [key, paramDefRaw] of Object.entries(tbDoc.parameters)) {
            const paramDef = paramDefRaw as any;
            const val = (dset.parameters && dset.parameters[key] !== undefined) ? dset.parameters[key] : (paramDef.default !== undefined ? paramDef.default : '');
            html += `
              <div class="control-label-row">
                <label class="control-label" title="${key}">${paramDef.label || key}</label>
                <input type="text" class="precise-input doc-tbparam-input" data-param-key="${key}" value="${val}" />
              </div>
            `;
          }
          html += `</div><hr style="border: 0; border-top: 1px solid var(--vscode-panel-border); margin: 16px 0;" />`;
        }
      }

      if (sheet && !dset) {
        html += `
          <div class="sidebar-section-title" style="margin-bottom: 8px;">${dset ? 'ACTIVE SHEET PROPERTIES' : 'SHEET PROPERTIES'}</div>
          <div class="form-group" data-doc-prop="sheetName">
            <div class="control-label-row">
              <label class="control-label">Sheet Name</label>
              <input type="text" class="precise-input doc-sheetname-input" value="${sheet.sheetName || ''}" />
            </div>
          </div>
          <div class="form-group" data-doc-prop="sheetNumber">
            <div class="control-label-row">
              <label class="control-label">Sheet Number</label>
              <input type="text" class="precise-input doc-sheetnum-input" value="${sheet.sheetNumber || ''}" />
            </div>
          </div>
          <div class="form-group" data-doc-prop="paperSize">
            <div class="control-label-row">
              <label class="control-label">Paper Size</label>
              <select class="precise-input doc-papersize-input">
                <option value="ARCH D" ${sheet.paperSize === 'ARCH D' ? 'selected' : ''}>ARCH D</option>
                <option value="ARCH E" ${sheet.paperSize === 'ARCH E' ? 'selected' : ''}>ARCH E</option>
                <option value="A1" ${sheet.paperSize === 'A1' ? 'selected' : ''}>A1</option>
                <option value="A0" ${sheet.paperSize === 'A0' ? 'selected' : ''}>A0</option>
              </select>
            </div>
          </div>
        `;
        
        let sheetTbName = typeof sheet.titleBlockOverride === 'string' ? sheet.titleBlockOverride : '';
        let sheetTbX = sheet.titleBlockOffsetX || 0;
        let sheetTbY = sheet.titleBlockOffsetY || 0;
        
        html += `
          <div class="sidebar-section-title" style="margin-top: 16px;">TITLE BLOCK OVERRIDE</div>
          ${dset ? '<div style="font-size: 10px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">Inherits from Drawing Set if left empty.</div>' : ''}
          <div class="form-group" data-doc-prop="titleBlock">
            <div class="control-label-row">
              <label class="control-label">Source File</label>
              <input type="text" class="precise-input doc-titleblock-input" data-target="sheet" placeholder="e.g. titleblock.json" value="${sheetTbName}" />
            </div>
            <div class="control-label-row" style="margin-top: 8px;">
              <label class="control-label">Origin X</label>
              <input type="number" class="precise-input doc-tbx-input" data-target="sheet" value="${sheetTbX}" />
            </div>
            <div class="control-label-row" style="margin-top: 8px;">
              <label class="control-label">Origin Y</label>
              <input type="number" class="precise-input doc-tby-input" data-target="sheet" value="${sheetTbY}" />
            </div>
          </div>
        `;
      }
      return html;
    }

    return '';
  },

  bindListeners(context: DocumentEditorContext): void {
    const { container, getLatestDoc, getActiveSheet, updateAndNotify } = context;

    // Helper to safely get and update the document
    const updateDoc = (updater: (doc: any) => void) => {
      const doc = getLatestDoc();
      if (doc) {
        updater(doc);
        updateAndNotify();
      }
    };
    
    // Helper to safely get and update the active sheet
    const updateSheet = (updater: (sheet: SheetConfiguration) => void) => {
      if (getActiveSheet) {
        const sheet = getActiveSheet();
        if (sheet) {
          updater(sheet);
          updateAndNotify();
        }
      } else {
        updateDoc((doc) => { if (doc.type === 'CAD::SheetConfiguration') updater(doc); });
      }
    };

    // Detail Listeners
    const scaleInput = container.querySelector('.doc-scale-input') as HTMLInputElement;
    if (scaleInput) {
      scaleInput.addEventListener('change', () => {
        updateDoc((doc) => { if (doc.type === 'CAD::Detail') doc.scale = scaleInput.value; });
      });
    }

    // Project Listeners
    const projectInput = container.querySelector('.doc-project-input') as HTMLInputElement;
    if (projectInput) {
      projectInput.addEventListener('change', () => {
        updateDoc((doc) => { if (doc.type === 'CAD::Project') doc.projectName = projectInput.value; });
      });
    }

    const tbParamInputs = container.querySelectorAll('.doc-tbparam-input');
    tbParamInputs.forEach((el) => {
      const input = el as HTMLInputElement;
      input.addEventListener('change', () => {
        const key = input.getAttribute('data-param-key');
        if (key) {
          updateDoc((doc) => {
            if (doc.type === 'CAD::Project') {
              if (!doc.parameters) doc.parameters = {};
              doc.parameters[key] = input.value;
            }
          });
        }
      });
    });

    // Sheet Listeners
    const sheetNameInput = container.querySelector('.doc-sheetname-input') as HTMLInputElement;
    if (sheetNameInput) {
      sheetNameInput.addEventListener('change', () => {
        updateSheet((sheet) => sheet.sheetName = sheetNameInput.value);
      });
    }

    const sheetNumInput = container.querySelector('.doc-sheetnum-input') as HTMLInputElement;
    if (sheetNumInput) {
      sheetNumInput.addEventListener('change', () => {
        updateSheet((sheet) => sheet.sheetNumber = sheetNumInput.value);
      });
    }

    // Project Paper Size Listener
    const paperSizeInput = container.querySelector('.doc-papersize-input') as HTMLSelectElement;
    if (paperSizeInput) {
      paperSizeInput.addEventListener('change', () => {
        updateDoc((doc) => { if (doc.type === 'CAD::Project') doc.defaultPaperSize = paperSizeInput.value; });
      });
    }

    // Title Block Listeners (Project Level Only)
    const titleBlockInput = container.querySelector('.doc-titleblock-input') as HTMLInputElement;
    const tbXInput = container.querySelector('.doc-tbx-input') as HTMLInputElement;
    const tbYInput = container.querySelector('.doc-tby-input') as HTMLInputElement;
    
    if (titleBlockInput && tbXInput && tbYInput) {
      const applyTitleBlock = (targetObj: any) => {
        const name = titleBlockInput.value || '';
        const x = parseFloat(tbXInput.value || '0');
        const y = parseFloat(tbYInput.value || '0');
        
        if (!name) {
          delete targetObj.defaultTitleBlockRef;
          delete targetObj.titleBlockOffsetX;
          delete targetObj.titleBlockOffsetY;
        } else {
          targetObj.defaultTitleBlockRef = name;
          targetObj.titleBlockOffsetX = isNaN(x) ? 0 : x;
          targetObj.titleBlockOffsetY = isNaN(y) ? 0 : y;
        }
      };

      const handler = () => {
        updateDoc((doc) => {
          if (doc.type === 'CAD::Project') applyTitleBlock(doc);
        });
      };

      titleBlockInput.addEventListener('change', handler);
      tbXInput.addEventListener('change', handler);
      tbYInput.addEventListener('change', handler);
    }
  }
};
