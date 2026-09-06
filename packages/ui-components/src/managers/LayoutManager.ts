import { VisualizerUI } from '../index';
import { getVisualizerShellTemplate } from '../templates';

export class LayoutManager {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public initLayout() {
    this.ui.container.className = 'visualizer-container';

    // Scale settings are now managed in DocumentEditor.ts via PropertiesManager.
    this.ui.container.innerHTML = getVisualizerShellTemplate(this.ui.doc, '');

    this.ui.leftPanel = this.ui.container.querySelector('#left-sidebar') as HTMLElement;
    this.ui.rightPanel = this.ui.container.querySelector('#right-canvas') as HTMLElement;
    this.ui.propertiesCardContainer = this.ui.container.querySelector('#properties-card-container') as HTMLElement;
    this.ui.sheetDropdownContainer = this.ui.container.querySelector('#sheet-dropdown-container') as HTMLElement;
    this.ui.svgViewport = this.ui.container.querySelector('#svg-viewport-container') as HTMLElement;
    this.ui.svgWrapper = this.ui.container.querySelector('#svg-viewport-wrapper') as HTMLElement;
    this.ui.editOverlay = this.ui.container.querySelector('#canvas-edit-overlay') as HTMLElement;
    this.ui.btnMoveOverlay = this.ui.container.querySelector('#edit-overlay-btn-move') as HTMLElement;
    this.ui.btnCropOverlay = this.ui.container.querySelector('#edit-overlay-btn-crop') as HTMLElement;
    this.ui.btnDeleteOverlay = this.ui.container.querySelector('#edit-overlay-btn-delete') as HTMLElement;
    this.ui.btnOpenOverlay = this.ui.container.querySelector('#edit-overlay-btn-open') as HTMLElement;
    
    this.ui.grabbers = {};
    const grabberEls = this.ui.container.querySelectorAll('.edit-grabber');
    grabberEls.forEach(el => {
      const dir = el.getAttribute('data-dir');
      if (dir) {
        this.ui.grabbers[dir] = el as HTMLElement;
      }
    });

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this.ui.svgViewport) {
          const widthInches = entry.contentRect.width / 96;
          const heightInches = entry.contentRect.height / 96;
          if (Math.abs(widthInches - this.ui.sandboxWidth) > 0.1 || Math.abs(heightInches - this.ui.sandboxHeight) > 0.1) {
            this.ui.sandboxWidth = widthInches;
            this.ui.sandboxHeight = heightInches;
            if ((this.ui.doc.type === 'CAD::Detail' || this.ui.doc.type === 'CAD::TitleBlock')) {
              this.ui.renderManager.renderSVG();
            }
          }
        }
      }
    });
    resizeObserver.observe(this.ui.svgViewport);

    const resetBtn = this.ui.rightPanel.querySelector('#reset-view-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.ui.canvasManager.resetView();
    });

    const btnAddRect = this.ui.rightPanel.querySelector('#btn-add-rect') as HTMLButtonElement;
    btnAddRect?.addEventListener('click', () => {
      try {
        const shape = this.ui.engine.addRectangle();
        this.ui.selectedComponentIds.clear();
        this.ui.selectedComponentIds.add(shape.componentId);
        this.ui.primaryComponentType = 'CAD::Shape::Rectangle';
      } catch (e) {
        console.warn(e);
      }
    });

    const btnAddLine = this.ui.rightPanel.querySelector('#btn-add-line') as HTMLButtonElement;
    btnAddLine?.addEventListener('click', () => {
      try {
        const shape = this.ui.engine.addLine();
        this.ui.selectedComponentIds.clear();
        this.ui.selectedComponentIds.add(shape.componentId);
        this.ui.primaryComponentType = 'CAD::Shape::Line';
      } catch (e) {
        console.warn(e);
      }
    });

    const btnAddText = this.ui.rightPanel.querySelector('#btn-add-text') as HTMLButtonElement;
    btnAddText?.addEventListener('click', () => {
      try {
        const shape = this.ui.engine.addText();
        this.ui.selectedComponentIds.clear();
        this.ui.selectedComponentIds.add(shape.componentId);
        this.ui.primaryComponentType = 'CAD::Annotation::Text';
      } catch (e) {
        console.warn(e);
      }
    });

    const btnAddImage = this.ui.rightPanel.querySelector('#btn-add-image') as HTMLButtonElement;
    btnAddImage?.addEventListener('click', () => {
      try {
        const shape = this.ui.engine.addImage();
        this.ui.selectedComponentIds.clear();
        this.ui.selectedComponentIds.add(shape.componentId);
        this.ui.primaryComponentType = 'CAD::Annotation::Image';
      } catch (e) {
        console.warn(e);
      }
    });

    const btnAddViewport = this.ui.rightPanel.querySelector('#btn-add-viewport') as HTMLButtonElement;
    btnAddViewport?.addEventListener('click', () => {
      try {
        const shape = this.ui.engine.addViewport();
        this.ui.selectedComponentIds.clear();
        this.ui.selectedComponentIds.add(shape.componentId);
        this.ui.primaryComponentType = 'CAD::Viewport';
      } catch (e) {
        console.warn(e);
      }
    });

    const btnToggleLeft = this.ui.rightPanel.querySelector('#btn-toggle-left-pane') as HTMLButtonElement;
    if (btnToggleLeft) {
      if (this.ui.options.showLeftToggle === false) {
        btnToggleLeft.style.display = 'none';
      } else {
        btnToggleLeft.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('dac-toggle-left-pane'));
        });
      }
    }

    const btnToggleRight = this.ui.rightPanel.querySelector('#btn-toggle-right-pane') as HTMLButtonElement;
    if (btnToggleRight) {
      if (this.ui.options.showRightToggle === false) {
        btnToggleRight.style.display = 'none';
      } else {
        btnToggleRight.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('dac-toggle-right-pane'));
        });
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.ui.selectedComponentIds.size > 0) {
          this.ui.selectComponent(null);
        }
      }
    });
  }
}
