import { VisualizerUI } from '../index';
import { renderDetail, renderSheet } from '@aeckit/core-solver';
import { ProjectDocument, SheetConfiguration, DetailDocument, TitleBlockDocument } from '@aeckit/core-solver';

export class RenderManager {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public renderSVG() {
    try {
      let svg = '';
      if (this.ui.isProject() || this.ui.doc.type === 'CAD::SheetConfiguration') {
        let sheet: SheetConfiguration | null = null;
        let titleBlockData: Record<string, any> = {};
        let fallbackTb = '';
        let fallbackX = 0;
        let fallbackY = 0;
        let fallbackPaperSize = 'ARCH D';

        if (this.ui.doc.type === 'CAD::Project') {
          const ds = this.ui.doc as ProjectDocument;
          sheet = this.ui.resolveSheet(ds.sheets[this.ui.activeSheetIndex]);
          titleBlockData = {};
          fallbackTb = (ds.defaultTitleBlockRef as string) || '';
          fallbackX = ds.titleBlockOffsetX || 0;
          fallbackY = ds.titleBlockOffsetY || 0;
          fallbackPaperSize = ds.defaultPaperSize || 'ARCH D';
          if (ds.projectName) {
            titleBlockData['ProjectName'] = ds.projectName;
            titleBlockData['projectName'] = ds.projectName;
          }
          if (ds.parameters) {
            Object.assign(titleBlockData, ds.parameters);
          }
        } else {
          sheet = this.ui.doc as SheetConfiguration;
          if (this.ui.options.parentProject) {
            fallbackTb = (this.ui.options.parentProject.defaultTitleBlockRef as string) || '';
            fallbackX = this.ui.options.parentProject.titleBlockOffsetX || 0;
            fallbackY = this.ui.options.parentProject.titleBlockOffsetY || 0;
            fallbackPaperSize = this.ui.options.parentProject.defaultPaperSize || 'ARCH D';
            if (this.ui.options.parentProject.projectName) {
              titleBlockData['ProjectName'] = this.ui.options.parentProject.projectName;
              titleBlockData['projectName'] = this.ui.options.parentProject.projectName;
            }
            if (this.ui.options.parentProject.parameters) {
              Object.assign(titleBlockData, this.ui.options.parentProject.parameters);
            }
          }
        }

        if (!sheet) {
          this.ui.svgWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="background-color: #0f172a;"><text x="50%" y="50%" fill="#94a3b8" text-anchor="middle">No sheets found in Drawing Set</text></svg>`;
          this.ui.interactionManager.updateOverlayPositions();
          return;
        }

        if (sheet.sheetName) {
          titleBlockData['SheetName'] = sheet.sheetName;
          titleBlockData['sheetName'] = sheet.sheetName;
        }
        if (sheet.sheetNumber) {
          titleBlockData['SheetNumber'] = sheet.sheetNumber;
          titleBlockData['sheetNumber'] = sheet.sheetNumber;
        }

        let titleBlockDoc: TitleBlockDocument | DetailDocument | undefined = undefined;
        const resolvedTb = fallbackTb;
        
        if (resolvedTb) {
          titleBlockDoc = this.ui.titleBlockMap.get(resolvedTb);
        }
        
        const effectiveX = sheet.titleBlockOffsetX !== undefined ? sheet.titleBlockOffsetX : fallbackX;
        const effectiveY = sheet.titleBlockOffsetY !== undefined ? sheet.titleBlockOffsetY : fallbackY;

        svg = renderSheet(sheet, titleBlockData, this.ui.viewportsMap, titleBlockDoc as any, effectiveX, effectiveY, fallbackPaperSize, this.ui.options.constructResolver);
      } else {
        svg = renderDetail(this.ui.doc as DetailDocument, this.ui.sandboxWidth, this.ui.sandboxHeight, this.ui.options.constructResolver);
      }

      this.ui.svgWrapper.innerHTML = svg;

      // Handle image fallbacks
      const images = this.ui.svgWrapper.querySelectorAll('image[data-fallback-id]');
      images.forEach(img => {
        const fallbackId = img.getAttribute('data-fallback-id');
        const fallbackEl = this.ui.svgWrapper.querySelector(`#${fallbackId}`);
        if (fallbackEl) {
          const href = img.getAttribute('href');
          if (!href) return;
          
          const handleLoad = () => fallbackEl.setAttribute('display', 'none');
          const handleError = () => fallbackEl.setAttribute('display', 'block');
          
          img.addEventListener('load', handleLoad);
          img.addEventListener('error', handleError);
          
          const htmlImg = new Image();
          htmlImg.onload = handleLoad;
          htmlImg.onerror = handleError;
          htmlImg.src = href;
        }
      });

      if (this.ui.selectedComponentIds.size > 0) {
        this.ui.selectedComponentIds.forEach((cid: string) => {
          const selectedGroup = this.ui.svgWrapper.querySelector(`[data-component-id="${cid}"]`) as SVGElement | null;
          if (selectedGroup) {
            selectedGroup.classList.add('selected-highlight');
          }
        });
      }

      const isDetail = (this.ui.doc.type === 'CAD::Detail' || this.ui.doc.type === 'CAD::TitleBlock');
      const btnAddRect = this.ui.rightPanel.querySelector('#btn-add-rect') as HTMLButtonElement;
      const btnAddLine = this.ui.rightPanel.querySelector('#btn-add-line') as HTMLButtonElement;
      const btnAddText = this.ui.rightPanel.querySelector('#btn-add-text') as HTMLButtonElement;
      const btnAddImage = this.ui.rightPanel.querySelector('#btn-add-image') as HTMLButtonElement;
      const btnAddViewport = this.ui.rightPanel.querySelector('#btn-add-viewport') as HTMLButtonElement;
      const headerDivider = this.ui.rightPanel.querySelector('#canvas-header-divider') as HTMLElement;

      if (this.ui.isProject() || this.ui.doc.type === 'CAD::SheetConfiguration') {
        if (btnAddRect) { btnAddRect.disabled = true; btnAddRect.style.opacity = '0.3'; btnAddRect.style.cursor = 'not-allowed'; }
        if (btnAddLine) { btnAddLine.disabled = true; btnAddLine.style.opacity = '0.3'; btnAddLine.style.cursor = 'not-allowed'; }
        if (btnAddText) { btnAddText.disabled = true; btnAddText.style.opacity = '0.3'; btnAddText.style.cursor = 'not-allowed'; }
        if (btnAddImage) { btnAddImage.disabled = true; btnAddImage.style.opacity = '0.3'; btnAddImage.style.cursor = 'not-allowed'; }
        if (btnAddViewport) { btnAddViewport.disabled = false; btnAddViewport.style.opacity = '1'; btnAddViewport.style.cursor = 'pointer'; }
      } else {
        if (btnAddRect) { btnAddRect.disabled = false; btnAddRect.style.opacity = '1'; btnAddRect.style.cursor = 'pointer'; }
        if (btnAddLine) { btnAddLine.disabled = false; btnAddLine.style.opacity = '1'; btnAddLine.style.cursor = 'pointer'; }
        if (btnAddText) { btnAddText.disabled = false; btnAddText.style.opacity = '1'; btnAddText.style.cursor = 'pointer'; }
        if (btnAddImage) { btnAddImage.disabled = false; btnAddImage.style.opacity = '1'; btnAddImage.style.cursor = 'pointer'; }
        if (btnAddViewport) { btnAddViewport.disabled = true; btnAddViewport.style.opacity = '0.3'; btnAddViewport.style.cursor = 'not-allowed'; }
      }
      if (headerDivider) headerDivider.style.display = isDetail ? 'block' : 'none';

      const viewTypeBadge = this.ui.rightPanel.querySelector('#canvas-view-type-badge') as HTMLElement;
      if (viewTypeBadge) {
        if (this.ui.doc.type === 'CAD::Project') {
          viewTypeBadge.textContent = 'SET VIEW';
        } else if (this.ui.doc.type === 'CAD::SheetConfiguration') {
          viewTypeBadge.textContent = 'SHEET VIEW';
        } else if ((this.ui.doc.type === 'CAD::Detail' || this.ui.doc.type === 'CAD::TitleBlock')) {
          viewTypeBadge.textContent = 'DETAIL VIEW';
        } else {
          viewTypeBadge.textContent = (this.ui.doc as any).type || 'UNKNOWN';
        }
      }
    } catch (err) {
      this.ui.svgWrapper.innerHTML = `
        <div class="render-error">
          <p>Render Compile Error:</p>
          <pre>${err instanceof Error ? err.message : String(err)}</pre>
        </div>
      `;
    }
  }
}
