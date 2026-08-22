import { describe, it, expect, beforeEach } from 'vitest';
import { VisualizerUI } from './index';
import { L1_REGISTRY, DetailDocument, ProjectDocument, SheetConfiguration, renderDetail } from '@aeckit/core-solver';

describe('VisualizerUI Toolbar Quick-Add Actions & Sheet View Behavior', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    if (typeof ResizeObserver === 'undefined') {
      (global as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  });

  it('Add Rectangle Button (#btn-add-rect)', () => {
    const emptyDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1/2"=1\'-0"',
      geometry: []
    };
    let updatedDoc: DetailDocument | undefined;
    new VisualizerUI(container, emptyDoc, (doc) => {
      updatedDoc = doc as DetailDocument;
    });

    const btn = container.querySelector('#btn-add-rect') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();

    // Assert Data Contract
    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.geometry).toBeDefined();
    expect(updatedDoc!.geometry!.length).toBeGreaterThan(0);
    const newShape = updatedDoc!.geometry![updatedDoc!.geometry!.length - 1];
    expect(newShape.type).toBe('CAD::Shape::Rectangle');
    expect('CAD::Shape::Rectangle' in L1_REGISTRY).toBe(true);

    // Assert DOM Output and Cartesian (+Y = UP) coordinate inversion
    const rects = container.querySelectorAll('rect[stroke-linejoin="round"]');
    expect(rects.length).toBeGreaterThan(0);
    expect(rects[rects.length - 1].getAttribute('y')).toBe('6'); // 18 - (0 + 12) = 6
  });

  it('Add Line Button (#btn-add-line)', () => {
    const emptyDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1/2"=1\'-0"',
      geometry: []
    };
    let updatedDoc: DetailDocument | undefined;
    new VisualizerUI(container, emptyDoc, (doc) => {
      updatedDoc = doc as DetailDocument;
    });

    const btn = container.querySelector('#btn-add-line') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();

    // Assert Data Contract
    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.geometry).toBeDefined();
    expect(updatedDoc!.geometry!.length).toBeGreaterThan(0);
    const newShape = updatedDoc!.geometry![updatedDoc!.geometry!.length - 1];
    expect(newShape.type).toBe('CAD::Shape::Line');
    expect('CAD::Shape::Line' in L1_REGISTRY).toBe(true);

    // Assert DOM Output and Cartesian (+Y = UP) coordinate inversion
    const lines = container.querySelectorAll('line[stroke-linecap="round"]');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[lines.length - 1].getAttribute('y1')).toBe('18'); // 18 - 0 = 18
    expect(lines[lines.length - 1].getAttribute('y2')).toBe('6');  // 18 - 12 = 6
  });

  it('Add Text Button (#btn-add-text)', () => {
    const emptyDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1/2"=1\'-0"',
      geometry: []
    };
    let updatedDoc: DetailDocument | undefined;
    new VisualizerUI(container, emptyDoc, (doc) => {
      updatedDoc = doc as DetailDocument;
    });

    const btn = container.querySelector('#btn-add-text') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();

    // Assert Data Contract
    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.geometry).toBeDefined();
    expect(updatedDoc!.geometry!.length).toBeGreaterThan(0);
    const newShape = updatedDoc!.geometry![updatedDoc!.geometry!.length - 1];
    expect(newShape.type).toBe('CAD::Annotation::Text');
    expect('CAD::Annotation::Text' in L1_REGISTRY).toBe(true);

    // Assert DOM Output and Cartesian (+Y = UP) coordinate inversion
    const texts = container.querySelectorAll('text.cad-text');
    expect(texts.length).toBeGreaterThan(0);
    expect(texts[texts.length - 1].getAttribute('y')).toBe('18'); // 18 - 0 = 18
  });



  it('VisualizerUI renders shapes reflecting inverted Cartesian (+Y = UP) SVG coordinates in generated DOM', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Shape::Line', x1: 0, y1: 0, x2: 10, y2: 18 },
        { type: 'CAD::Shape::Rectangle', x: 2, y: 4, width: 8, height: 6 },
        { type: 'CAD::Annotation::Text', x: 5, y: 14, text: 'Inverted Text' }
      ]
    };

    new VisualizerUI(container, detailDoc, () => {});

    // On canvasHeight = 18:
    // Line (y1: 0, y2: 18) -> SVG y1="18", y2="0"
    const line = container.querySelector('line[stroke-linecap="round"]');
    expect(line).not.toBeNull();
    expect(line!.getAttribute('y1')).toBe('18');
    expect(line!.getAttribute('y2')).toBe('0');

    // Rectangle (y: 4, height: 6) -> SVG y="8" (18 - (4 + 6))
    const rect = container.querySelector('rect[stroke-linejoin="round"]');
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute('y')).toBe('8');
    expect(rect!.getAttribute('height')).toBe('6');

    // Text (y: 14) -> SVG y="4" (18 - 14)
    const text = container.querySelector('text.cad-text');
    expect(text).not.toBeNull();
    expect(text!.getAttribute('y')).toBe('4');
    expect(text!.textContent).toBe('Inverted Text');
  });

  it('VisualizerUI renders editable Text Content field in Inspector Pane when text shape is selected and updates document live', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Annotation::Text', x: 5, y: 14, text: 'Initial Note Text', componentId: 'test_text_note' }
      ]
    };

    let updatedDoc: DetailDocument | undefined;
    const ui = new VisualizerUI(container, detailDoc, (doc) => {
      updatedDoc = doc as DetailDocument;
    });

    ui.selectComponent('test_text_note', 'CAD::Annotation::Text');

    const textInput = container.querySelector('.shape-text-input') as HTMLTextAreaElement;
    expect(textInput).not.toBeNull();
    expect(textInput.value).toBe('Initial Note Text');

    // Modify text in inspector pane
    textInput.value = 'Modified Note Text';
    textInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.geometry![0].text).toBe('Modified Note Text');
    expect(container.querySelector('text.cad-text')!.textContent).toBe('Modified Note Text');
  });

  it('Inspector Pane text edits inside Sheet viewports update the viewport document and SVG DOM', () => {
    const vpDetail: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Annotation::Text',
          componentId: 'vp_text_1',
          x: 5,
          y: 5,
          text: 'Original Viewport Text',
          fontSize: 12
        }
      ]
    };
    const viewportsMap = new Map<string, DetailDocument>();
    viewportsMap.set('test-detail.json', vpDetail);

    const sheetDoc: SheetConfiguration = {
      type: 'CAD::SheetConfiguration',
      sheetNumber: 'A101',
      sheetName: 'Plan Sheet',
      viewports: [
        {
          detail: 'test-detail.json',
          x: 4,
          y: 4,
          scale: '1:1'
        }
      ]
    };

    let updatedViewportsMap: Map<string, DetailDocument> | undefined;
    const ui = new VisualizerUI(
      container,
      sheetDoc,
      (doc, vMap) => {
        updatedViewportsMap = vMap;
      },
      viewportsMap
    );

    ui.selectComponent('vp_text_1', 'CAD::Annotation::Text');

    const textInput = container.querySelector('.shape-text-input') as HTMLTextAreaElement;
    expect(textInput).not.toBeNull();
    expect(textInput.value).toBe('Original Viewport Text');

    textInput.value = 'Updated Viewport Text';
    textInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(updatedViewportsMap).toBeDefined();
    const modDetail = updatedViewportsMap!.get('test-detail.json');
    expect(modDetail!.geometry![0].text).toBe('Updated Viewport Text');
    expect(container.querySelector('text.cad-text')!.textContent).toBe('Updated Viewport Text');
  });

  it('Inspector Pane supports multiple keystrokes when host calls updateConfig after onChange', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Annotation::Text', x: 5, y: 14, text: '', componentId: 'multi_key_text' }
      ]
    };

    let latestDoc: DetailDocument | undefined;
    let ui: VisualizerUI;
    ui = new VisualizerUI(container, detailDoc, (doc) => {
      latestDoc = doc as DetailDocument;
      // Simulate host calling updateConfig immediately after onChange
      ui.updateConfig(doc);
    });

    ui.selectComponent('multi_key_text', 'CAD::Annotation::Text');

    const textInput = container.querySelector('.shape-text-input') as HTMLTextAreaElement;
    expect(textInput).not.toBeNull();

    // First keystroke
    textInput.value = 'A';
    textInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(latestDoc!.geometry![0].text).toBe('A');

    // Second keystroke within 500ms
    textInput.value = 'AB';
    textInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(latestDoc!.geometry![0].text).toBe('AB');

    // Third keystroke within 500ms
    textInput.value = 'ABC';
    textInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(latestDoc!.geometry![0].text).toBe('ABC');
    expect(container.querySelector('text.cad-text')!.textContent).toBe('ABC');
  });

  it('Inspector Pane modularization: Parametric constructs only render parameter controls', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      parameters: {
        width: { type: 'Number', default: 12, componentId: 'test_parametric_construct' }
      },
      geometry: [
        { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 12, height: 4, componentId: 'test_parametric_construct' }
      ]
    };
    
    const ui = new VisualizerUI(container, detailDoc, () => {});
    ui.selectComponent('test_parametric_construct', 'CAD::Component::TestConstruct');

    const paramSlider = container.querySelector('.param-slider');
    const shapeXInput = container.querySelector('.shape-x-input');
    
    // Parametric control should exist
    expect(paramSlider).not.toBeNull();
    // Base shape inputs should NOT exist because it's a parametric construct
    expect(shapeXInput).toBeNull();
  });

  it('Inspector Pane modularization: Base Rectangle primitives render x, y, width, height controls', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Shape::Rectangle', x: 5, y: 10, width: 12, height: 4, componentId: 'raw_rect' }
      ]
    };
    
    const ui = new VisualizerUI(container, detailDoc, () => {});
    ui.selectComponent('raw_rect', 'CAD::Shape::Rectangle');

    const shapeXInput = container.querySelector('.shape-x-input') as HTMLInputElement;
    const shapeWidthInput = container.querySelector('.shape-width-input') as HTMLInputElement;
    
    expect(shapeXInput).not.toBeNull();
    expect(shapeWidthInput).not.toBeNull();
    expect(shapeXInput.value).toBe('5');
    expect(shapeWidthInput.value).toBe('12');
  });

  it('VisualizerUI renders Document Properties when nothing is selected', () => {
    const sheetDoc: SheetConfiguration = {
      type: 'CAD::SheetConfiguration',
      sheetNumber: 'A100',
      sheetName: 'Cover Sheet',
      viewports: []
    };

    const ui = new VisualizerUI(container, sheetDoc, () => {});
    ui.selectComponent(null, null);

    const sheetNameInput = container.querySelector('.doc-sheetname-input') as HTMLInputElement;
    const sheetNumInput = container.querySelector('.doc-sheetnum-input') as HTMLInputElement;
    
    expect(sheetNameInput).not.toBeNull();
    expect(sheetNumInput).not.toBeNull();
    expect(sheetNameInput.value).toBe('Cover Sheet');
    expect(sheetNumInput.value).toBe('A100');
  });

  it('VisualizerUI renders Viewport properties when a viewport is selected', () => {
    const sheetDoc: SheetConfiguration = {
      type: 'CAD::SheetConfiguration',
      sheetNumber: 'A101',
      sheetName: 'Plan',
      viewports: [
        { detail: 'test.json', x: 2, y: 2, scale: '1:1', componentId: 'vp_1' }
      ]
    };

    const ui = new VisualizerUI(container, sheetDoc, () => {});
    ui.selectComponent('vp_1', 'CAD::Viewport');

    const vpDetailInput = container.querySelector('.vp-detail-input') as HTMLInputElement;
    const vpXInput = container.querySelector('.vp-x-input') as HTMLInputElement;
    
    expect(vpDetailInput).not.toBeNull();
    expect(vpXInput).not.toBeNull();
    expect(vpDetailInput.value).toBe('test.json');
    expect(vpXInput.value).toBe('2');
  });

  it('Add Viewport Button (#btn-add-viewport) adds a viewport to the sheet', () => {
    const sheetDoc: SheetConfiguration = {
      type: 'CAD::SheetConfiguration',
      sheetNumber: 'A102',
      sheetName: 'Elevations',
      viewports: []
    };
    
    let updatedDoc: SheetConfiguration | undefined;
    new VisualizerUI(container, sheetDoc, (doc) => {
      updatedDoc = doc as SheetConfiguration;
    });

    const btn = container.querySelector('#btn-add-viewport') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();

    expect(updatedDoc).toBeDefined();
    expect(updatedDoc!.viewports.length).toBe(1);
    expect(updatedDoc!.viewports[0].detail).toBe('');
    expect(updatedDoc!.viewports[0].componentId).toMatch(/^viewport_/);
  });
  it('VisualizerUI injects SheetName, SheetNumber, and ProjectName into Title Block', () => {
    const titleBlockDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Annotation::Text', text: '{parameters.SheetName}', x: 0, y: 0, componentId: 'tb_1' },
        { type: 'CAD::Annotation::Text', text: '{parameters.SheetNumber}', x: 0, y: 0, componentId: 'tb_2' },
        { type: 'CAD::Annotation::Text', text: '{parameters.ProjectName}', x: 0, y: 0, componentId: 'tb_3' }
      ]
    };

    const dset: ProjectDocument = {
      type: 'CAD::Project',
      projectName: 'Acme Corp',
      defaultTitleBlockRef: 'tb.json',
      sheets: [
        {
          type: 'CAD::SheetConfiguration',
          sheetName: 'Floor Plan',
          sheetNumber: 'A101',
          viewports: []
        }
      ]
    };

    const ui = new VisualizerUI(container, dset, () => {});
    const tbMap = new Map<string, DetailDocument>();
    tbMap.set('tb.json', titleBlockDoc);
    ui.updateConfig(dset, new Map(), tbMap);

    const svgWrapper = container.querySelector('#svg-viewport-wrapper');
    expect(svgWrapper).not.toBeNull();
    const svgHtml = svgWrapper!.innerHTML;
    
    expect(svgHtml).toContain('>Floor Plan</text>');
    expect(svgHtml).toContain('>A101</text>');
    expect(svgHtml).toContain('>Acme Corp</text>');
  });

  it('VisualizerUI JSON Mode Toggle and Direct Edit Updates Document', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Shape::Rectangle', x: 5, y: 10, width: 12, height: 4, componentId: 'rect_1' }
      ]
    };

    let latestDoc: DetailDocument | undefined;
    const ui = new VisualizerUI(container, detailDoc, (doc) => {
      latestDoc = doc as DetailDocument;
    });

    const btnJson = container.querySelector('#btn-mode-json') as HTMLButtonElement;
    expect(btnJson).not.toBeNull();
    btnJson.click();

    const textarea = container.querySelector('#json-editor-textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    // Verify current root doc JSON is serialized in the textarea
    const parsedInit = JSON.parse(textarea.value);
    expect(parsedInit.type).toBe('CAD::Detail');
    expect(parsedInit.geometry[0].width).toBe(12);

    // Edit JSON value directly (e.g. increase width of rectangle)
    const updatedDoc = JSON.parse(textarea.value);
    updatedDoc.geometry[0].width = 20;
    textarea.value = JSON.stringify(updatedDoc, null, 2);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    expect(latestDoc).toBeDefined();
    expect(latestDoc!.geometry![0].width).toBe(20);
  });

  it('VisualizerUI JSON Mode displays context-aware shape JSON when selected', () => {
    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Shape::Rectangle', x: 5, y: 10, width: 12, height: 4, componentId: 'rect_1' }
      ]
    };

    const ui = new VisualizerUI(container, detailDoc, () => {});
    ui.selectComponent('rect_1', 'CAD::Shape::Rectangle');

    const btnJson = container.querySelector('#btn-mode-json') as HTMLButtonElement;
    expect(btnJson).not.toBeNull();
    btnJson.click();

    const textarea = container.querySelector('#json-editor-textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    // Verify ONLY the selected rectangle shape is serialized, not the full document
    const parsedShape = JSON.parse(textarea.value);
    expect(parsedShape.type).toBe('CAD::Shape::Rectangle');
    expect(parsedShape.width).toBe(12);
    expect(parsedShape.geometry).toBeUndefined(); // It is just the shape object!
  });
});
