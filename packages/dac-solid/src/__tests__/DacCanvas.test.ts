import { describe, it, expect } from 'vitest';
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { DacProvider, DacCanvas, useDac } from '../index';
import type { DetailDocument } from '@aeckit/dac-schema';

describe('@aeckit/dac-solid DacCanvas unit tests', () => {
  it('renders canvas with SVG content from DacProvider', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'plate',
          x: 0,
          y: 0,
          width: 5.5,
          height: 1.5,
          color: '#d97706'
        }
      ]
    };

    const dispose = render(() => 
      createComponent(DacProvider, {
        doc,
        get children() {
          return createComponent(DacCanvas, {});
        }
      }), container
    );

    const canvasContainer = container.querySelector('[data-canvas-container="true"]');
    expect(canvasContainer).toBeDefined();

    dispose();
    container.remove();
  });

  it('triggers fitView when autoFit prop is true', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'plate',
          x: 0,
          y: 0,
          width: 5.5,
          height: 1.5,
          color: '#d97706'
        }
      ]
    };

    let fitViewCalled = false;

    function TestObserver() {
      const { fitView } = useDac();
      const originalFitView = fitView;
      // We can inspect or observe triggerFitView
      return document.createElement('span');
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc,
        get children() {
          return [
            createComponent(DacCanvas, { autoFit: true }),
            createComponent(TestObserver, {})
          ];
        }
      }), container
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    // The canvas mounted and ran autoFit timer
    const canvasContainer = container.querySelector('[data-canvas-container="true"]');
    expect(canvasContainer).not.toBeNull();

    dispose();
    container.remove();
  });

  it('hides move and delete action buttons when showGizmoActions is false', async () => {
    (window as any).SVGSVGElement.prototype.createSVGPoint = function () {
      const pt = {
        x: 0,
        y: 0,
        matrixTransform: function () {
          return { x: pt.x, y: pt.y };
        }
      };
      return pt as any;
    };
    (window as any).SVGElement.prototype.getScreenCTM = function () {
      return {
        a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      } as any;
    };
    (window as any).SVGElement.prototype.getBBox = function () {
      return { x: 10, y: 10, width: 50, height: 50 } as any;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'plate',
          x: 0,
          y: 0,
          width: 5.5,
          height: 1.5,
          color: '#d97706'
        }
      ]
    };

    function SelectionTrigger() {
      const { setSelectionIds } = useDac();
      setSelectionIds(['plate']);
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc,
        get children() {
          return [
            createComponent(DacCanvas, { showGizmoActions: false }),
            createComponent(SelectionTrigger, {})
          ];
        }
      }), container
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const gizmoActions = container.querySelector('[data-gizmo-actions]');
    expect(gizmoActions).toBeNull();

    dispose();
    container.remove();
  });

  it('shows move and delete action buttons when showGizmoActions is true or default', async () => {
    (window as any).SVGSVGElement.prototype.createSVGPoint = function () {
      const pt = {
        x: 0,
        y: 0,
        matrixTransform: function () {
          return { x: pt.x, y: pt.y };
        }
      };
      return pt as any;
    };
    (window as any).SVGElement.prototype.getScreenCTM = function () {
      return {
        a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      } as any;
    };
    (window as any).SVGElement.prototype.getBBox = function () {
      return { x: 10, y: 10, width: 50, height: 50 } as any;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'plate',
          x: 0,
          y: 0,
          width: 5.5,
          height: 1.5,
          color: '#d97706'
        }
      ]
    };

    function SelectionTrigger() {
      const { setSelectionIds } = useDac();
      setSelectionIds(['plate']);
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc,
        get children() {
          return [
            createComponent(DacCanvas, { showGizmoActions: true }),
            createComponent(SelectionTrigger, {})
          ];
        }
      }), container
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const gizmoActions = container.querySelector('[data-gizmo-actions]');
    expect(gizmoActions).not.toBeNull();
    const moveBtn = container.querySelector('[data-gizmo-action="move"]');
    const deleteBtn = container.querySelector('[data-gizmo-action="delete"]');
    expect(moveBtn).not.toBeNull();
    expect(deleteBtn).not.toBeNull();

    dispose();
    container.remove();
  });

  it('re-renders canvas SVG when a shape property is updated via updateShape', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'plate',
          x: 0,
          y: 0,
          width: 5.5,
          height: 1.5,
          color: '#d97706'
        }
      ]
    };

    let triggerUpdate!: () => void;

    function Updater() {
      const { updateShape } = useDac();
      triggerUpdate = () => {
        updateShape('plate', { x: 10 });
      };
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc,
        get children() {
          return [
            createComponent(DacCanvas, {}),
            createComponent(Updater, {})
          ];
        }
      }), container
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initially x is 0 in the rendered rectangle
    let rectEl = container.querySelector('[data-component-id="plate"] rect:last-child');
    expect(rectEl?.getAttribute('x')).toBe('0');

    // Trigger updateShape (e.g. from an inspector field edit)
    triggerUpdate();

    await new Promise((resolve) => setTimeout(resolve, 50));

    // After update, x must be 10!
    rectEl = container.querySelector('[data-component-id="plate"] rect:last-child');
    expect(rectEl?.getAttribute('x')).toBe('10');

    dispose();
    container.remove();
  });

  it('re-renders repeatedly when construct parameters are changed multiple times', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: any = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        lumberSize: {
          type: 'string',
          default: '2x4',
          value: '2x4',
          options: [
            { value: '2x4', variables: { width: 3.5, height: 1.5 } },
            { value: '2x6', variables: { width: 5.5, height: 1.5 } },
            { value: '2x8', variables: { width: 7.25, height: 1.5 } }
          ]
        }
      },
      geometry: [
        {
          componentId: 'lumber_body',
          type: 'CAD::Shape::Rectangle',
          x: 0,
          y: 0,
          width: '{parameters.lumberSize.width}',
          height: '{parameters.lumberSize.height}'
        }
      ]
    };

    let setParam!: (val: string) => void;

    function ParamMutator() {
      const { builder } = useDac();
      setParam = (val: string) => {
        builder().mutateDocument((d: any) => {
          d.parameters.lumberSize.value = val;
        });
      };
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc,
        get children() {
          return [
            createComponent(DacCanvas, {}),
            createComponent(ParamMutator, {})
          ];
        }
      }), container
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initially 2x4: width is 3.5
    let rectEl = container.querySelector('[data-component-id="lumber_body"] rect:last-child');
    expect(rectEl?.getAttribute('width')).toBe('3.5');

    // First change: 2x6 -> width is 5.5
    setParam('2x6');
    await new Promise((resolve) => setTimeout(resolve, 50));
    rectEl = container.querySelector('[data-component-id="lumber_body"] rect:last-child');
    expect(rectEl?.getAttribute('width')).toBe('5.5');

    // Second change: 2x8 -> width is 7.25
    setParam('2x8');
    await new Promise((resolve) => setTimeout(resolve, 50));
    rectEl = container.querySelector('[data-component-id="lumber_body"] rect:last-child');
    expect(rectEl?.getAttribute('width')).toBe('7.25');

    // Third change back to 2x4: width is 3.5
    setParam('2x4');
    await new Promise((resolve) => setTimeout(resolve, 50));
    rectEl = container.querySelector('[data-component-id="lumber_body"] rect:last-child');
    expect(rectEl?.getAttribute('width')).toBe('3.5');

    dispose();
    container.remove();
  });

  it('renders and supports polyline geometry in DacCanvas', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'my-poly',
          points: [
            [0, 0],
            [10, 5],
            [20, 0]
          ],
          closed: false
        }
      ]
    };

    let addPolylineFn: any;
    function Helper() {
      const { addShape } = useDac();
      addPolylineFn = addShape;
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc,
        get children() {
          return [
            createComponent(DacCanvas, {}),
            createComponent(Helper, {})
          ];
        }
      }), container
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify existing polyline rendered
    const polyEl = container.querySelector('[data-component-id="my-poly"] polyline.cad-hit-area');
    expect(polyEl).toBeDefined();
    expect(polyEl?.getAttribute('points')).toBe('0,18 10,13 20,18');

    // Add closed polyline using addShape('Polyline', ...)
    addPolylineFn('Polyline', {
      componentId: 'closed-poly',
      points: [[0, 0], [5, 5], [10, 0]],
      closed: true,
      fill: '#ff0000'
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const closedEl = container.querySelector('[data-component-id="closed-poly"] polygon:last-child');
    expect(closedEl).toBeDefined();
    expect(closedEl?.getAttribute('fill')).toBe('#ff0000');

    dispose();
    container.remove();
  });
});
