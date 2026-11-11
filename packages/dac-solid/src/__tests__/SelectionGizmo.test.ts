import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { DacProvider, DacCanvas, SelectionGizmo, useDac, type DacCanvasProps, type SelectionGizmoProps } from '../index';
import type { ConstructDocument, DetailDocument } from '@aeckit/dac-schema';

function installSvgMocks() {
  const win = window as any;
  const origCreateSVGPoint = win.SVGSVGElement?.prototype?.createSVGPoint;
  const origGetScreenCTM = win.SVGElement?.prototype?.getScreenCTM;
  const origGetBBox = win.SVGElement?.prototype?.getBBox;

  if (win.SVGSVGElement?.prototype) {
    win.SVGSVGElement.prototype.createSVGPoint = function () {
      const pt = {
        x: 0,
        y: 0,
        matrixTransform: function () {
          return { x: pt.x, y: pt.y };
        },
      };
      return pt;
    };
  }

  if (win.SVGElement?.prototype) {
    win.SVGElement.prototype.getScreenCTM = function () {
      return {
        a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
        inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      };
    };
    win.SVGElement.prototype.getBBox = function () {
      return { x: 10, y: 10, width: 50, height: 40 };
    };
  }

  return () => {
    if (win.SVGSVGElement?.prototype) {
      win.SVGSVGElement.prototype.createSVGPoint = origCreateSVGPoint;
    }
    if (win.SVGElement?.prototype) {
      win.SVGElement.prototype.getScreenCTM = origGetScreenCTM;
      win.SVGElement.prototype.getBBox = origGetBBox;
    }
  };
}

function renderWithSelection(
  doc: DetailDocument,
  selectedId: string,
  canvasProps: DacCanvasProps = {},
  directGizmoProps?: SelectionGizmoProps,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  function SelectionTrigger() {
    const { setSelectionIds } = useDac();
    setSelectionIds([selectedId]);
    return null;
  }

  const dispose = render(() =>
    createComponent(DacProvider, {
      doc,
      get children() {
        if (directGizmoProps) {
          // Render minimal canvas container + svg + direct SelectionGizmo
          return [
            createComponent(DacCanvas, { showGizmo: false }),
            createComponent(SelectionGizmo, directGizmoProps),
            createComponent(SelectionTrigger, {}),
          ];
        }
        return [
          createComponent(DacCanvas, canvasProps),
          createComponent(SelectionTrigger, {}),
        ];
      },
    }),
    container,
  );

  return {
    container,
    cleanup: () => {
      dispose();
      container.remove();
    },
  };
}

const waitForGizmoFrame = () => new Promise((resolve) => setTimeout(resolve, 100));

describe('@aeckit/dac-solid SelectionGizmo & DacCanvas gizmo visibility props', () => {
  let restoreMocks: () => void;

  beforeEach(() => {
    restoreMocks = installSvgMocks();
  });

  afterEach(() => {
    restoreMocks();
  });

  const rectDoc: DetailDocument = {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1:1',
    geometry: [
      {
        type: 'CAD::Shape::Rectangle',
        componentId: 'rect-1',
        x: 0,
        y: 0,
        width: 5,
        height: 3,
      },
    ],
  };

  it('renders 8 resize handles and bounding box by default for standard 2D shapes', async () => {
    const { container, cleanup } = renderWithSelection(rectDoc, 'rect-1', {}, {});
    try {
      await waitForGizmoFrame();
      expect(container.querySelector('[data-selection-gizmo="true"]')).not.toBeNull();
      expect(container.querySelector('[data-gizmo-bounds="true"]')).not.toBeNull();
      expect(container.querySelector('[data-gizmo-actions="true"]')).not.toBeNull();
      const handles = container.querySelectorAll('[data-gizmo-handle]');
      expect(handles).toHaveLength(8);
    } finally {
      cleanup();
    }
  });

  it('hides 8 resize handles while keeping bounding box when showHandles is false', async () => {
    const { container, cleanup } = renderWithSelection(rectDoc, 'rect-1', {}, {
      showHandles: false,
      showActions: false,
    });
    try {
      await waitForGizmoFrame();
      expect(container.querySelector('[data-selection-gizmo="true"]')).not.toBeNull();
      const bounds = container.querySelector('[data-gizmo-bounds="true"]') as HTMLElement | null;
      expect(bounds).not.toBeNull();
      expect(bounds?.style.border).toContain('#3b82f6');
      expect(container.querySelectorAll('[data-gizmo-handle]')).toHaveLength(0);
      expect(container.querySelector('[data-gizmo-actions="true"]')).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('hides bounding box when showBounds is false', async () => {
    const { container, cleanup } = renderWithSelection(rectDoc, 'rect-1', {}, {
      showBounds: false,
    });
    try {
      await waitForGizmoFrame();
      expect(container.querySelector('[data-gizmo-bounds="true"]')).toBeNull();
      expect(container.querySelectorAll('[data-gizmo-handle]')).toHaveLength(8);
    } finally {
      cleanup();
    }
  });

  it('hides line endpoint handles when showHandles is false', async () => {
    const lineDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Line',
          componentId: 'line-1',
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 5,
        },
      ],
    };

    const withHandles = renderWithSelection(lineDoc, 'line-1', {}, { showHandles: true });
    try {
      await waitForGizmoFrame();
      // Mock x1/x2 baseVal on SVGLineElement if happy-dom does not define it
      const lineNode = withHandles.container.querySelector('[data-component-id="line-1"] line') as any;
      if (lineNode && !lineNode.x1) {
        lineNode.x1 = { baseVal: { value: 0 } };
        lineNode.y1 = { baseVal: { value: 0 } };
        lineNode.x2 = { baseVal: { value: 10 } };
        lineNode.y2 = { baseVal: { value: 5 } };
        await waitForGizmoFrame();
      }
      expect(withHandles.container.querySelector('[data-gizmo-handle="line-start"]')).not.toBeNull();
      expect(withHandles.container.querySelector('[data-gizmo-handle="line-end"]')).not.toBeNull();
    } finally {
      withHandles.cleanup();
    }

    const withoutHandles = renderWithSelection(lineDoc, 'line-1', {}, { showHandles: false });
    try {
      await waitForGizmoFrame();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="line-start"]')).toBeNull();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="line-end"]')).toBeNull();
    } finally {
      withoutHandles.cleanup();
    }
  });

  it('hides leader handles when showHandles is false', async () => {
    const leaderDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Annotation::Leader',
          componentId: 'leader-1',
          x: 2,
          y: 2,
          dx: 3,
          dy: 3,
          text: 'Note',
        },
      ],
    };

    const withHandles = renderWithSelection(leaderDoc, 'leader-1', {}, { showHandles: true });
    try {
      await waitForGizmoFrame();
      expect(withHandles.container.querySelector('[data-gizmo-handle="leader-anchor"]')).not.toBeNull();
      expect(withHandles.container.querySelector('[data-gizmo-handle="leader-landing"]')).not.toBeNull();
    } finally {
      withHandles.cleanup();
    }

    const withoutHandles = renderWithSelection(leaderDoc, 'leader-1', {}, { showHandles: false });
    try {
      await waitForGizmoFrame();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="leader-anchor"]')).toBeNull();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="leader-landing"]')).toBeNull();
    } finally {
      withoutHandles.cleanup();
    }
  });

  it('hides dimension handles when showHandles is false', async () => {
    const dimDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Annotation::Dimension',
          componentId: 'dim-1',
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 0,
          offset: 20,
        },
      ],
    };

    const withHandles = renderWithSelection(dimDoc, 'dim-1', {}, { showHandles: true });
    try {
      await waitForGizmoFrame();
      const dimLine = withHandles.container.querySelector('[data-component-id="dim-1"] .dimension-main-line') as any;
      if (dimLine && !dimLine.x1) {
        dimLine.x1 = { baseVal: { value: 0 } };
        dimLine.y1 = { baseVal: { value: 0 } };
        dimLine.x2 = { baseVal: { value: 10 } };
        dimLine.y2 = { baseVal: { value: 0 } };
        await waitForGizmoFrame();
      }
      expect(withHandles.container.querySelector('[data-gizmo-handle="dim-start"]')).not.toBeNull();
      expect(withHandles.container.querySelector('[data-gizmo-handle="dim-end"]')).not.toBeNull();
      expect(withHandles.container.querySelector('[data-gizmo-handle="dim-offset"]')).not.toBeNull();
    } finally {
      withHandles.cleanup();
    }

    const withoutHandles = renderWithSelection(dimDoc, 'dim-1', {}, { showHandles: false });
    try {
      await waitForGizmoFrame();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="dim-start"]')).toBeNull();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="dim-end"]')).toBeNull();
      expect(withoutHandles.container.querySelector('[data-gizmo-handle="dim-offset"]')).toBeNull();
    } finally {
      withoutHandles.cleanup();
    }
  });

  it('hides PolylineGrips handles while keeping bounding box when showHandles is false', async () => {
    const polyDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'poly-1',
          points: [
            [0, 0],
            [10, 5],
            [20, 0],
          ],
          closed: false,
        },
      ],
    };

    const withHandles = renderWithSelection(polyDoc, 'poly-1', {}, { showHandles: true });
    try {
      await waitForGizmoFrame();
      expect(withHandles.container.querySelectorAll('div[title*="Vertex"]')).toHaveLength(3);
      expect(withHandles.container.querySelectorAll('div[title*="Insert vertex"]')).toHaveLength(2);
      expect(withHandles.container.querySelector('[data-gizmo-bounds="true"]')).not.toBeNull();
    } finally {
      withHandles.cleanup();
    }

    const withoutHandles = renderWithSelection(polyDoc, 'poly-1', {}, { showHandles: false });
    try {
      await waitForGizmoFrame();
      expect(withoutHandles.container.querySelectorAll('div[title*="Vertex"]')).toHaveLength(0);
      expect(withoutHandles.container.querySelectorAll('div[title*="Insert vertex"]')).toHaveLength(0);
      expect(withoutHandles.container.querySelector('[data-gizmo-bounds="true"]')).not.toBeNull();
    } finally {
      withoutHandles.cleanup();
    }
  });

  it('passes showGizmoHandles, showGizmoBounds, and showGizmo through DacCanvas', async () => {
    const hiddenHandles = renderWithSelection(rectDoc, 'rect-1', {
      showGizmoActions: false,
      showGizmoHandles: false,
    });
    try {
      await waitForGizmoFrame();
      expect(hiddenHandles.container.querySelector('[data-selection-gizmo="true"]')).not.toBeNull();
      expect(hiddenHandles.container.querySelector('[data-gizmo-bounds="true"]')).not.toBeNull();
      expect(hiddenHandles.container.querySelector('[data-gizmo-actions="true"]')).toBeNull();
      expect(hiddenHandles.container.querySelectorAll('[data-gizmo-handle]')).toHaveLength(0);
    } finally {
      hiddenHandles.cleanup();
    }

    const hiddenBounds = renderWithSelection(rectDoc, 'rect-1', {
      showGizmoBounds: false,
    });
    try {
      await waitForGizmoFrame();
      expect(hiddenBounds.container.querySelector('[data-gizmo-bounds="true"]')).toBeNull();
      expect(hiddenBounds.container.querySelectorAll('[data-gizmo-handle]')).toHaveLength(8);
    } finally {
      hiddenBounds.cleanup();
    }

    const hiddenGizmo = renderWithSelection(rectDoc, 'rect-1', {
      showGizmo: false,
    });
    try {
      await waitForGizmoFrame();
      expect(hiddenGizmo.container.querySelector('[data-selection-gizmo="true"]')).toBeNull();
    } finally {
      hiddenGizmo.cleanup();
    }
  });

  it('hides 8-way resize handles on ConstructReference without length parameter and emits no warnings', async () => {
    const woodSectionDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        lumberSize: {
          type: 'string',
          default: '2x4',
          options: [{ label: '2x4', value: '2x4', variables: { w: 1.5, h: 3.5 } }],
        },
      },
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'stud',
          x: 0,
          y: 0,
          width: '{parameters.lumberSize.w}',
          height: '{parameters.lumberSize.h}',
        },
      ],
    };

    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'ConstructReference',
          componentId: 'stud_1',
          constructId: 'wood-section',
          x: 2,
          y: 3,
        },
      ],
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    let warningsRef: () => any[] = () => [];

    function Helper() {
      const { setSelectionIds, solverWarnings } = useDac();
      warningsRef = solverWarnings;
      setSelectionIds(['stud_1']);
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc: detailDoc,
        nestedDocs: new Map([['wood-section', woodSectionDoc]]),
        get children() {
          return [createComponent(DacCanvas, {}), createComponent(Helper, {})];
        },
      }),
      container
    );

    try {
      await waitForGizmoFrame();
      expect(warningsRef()).toEqual([]);
      expect(container.querySelector('[data-gizmo-bounds="true"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-gizmo-handle]')).toHaveLength(0);
    } finally {
      dispose();
      container.remove();
    }
  });

  it('renders construct-length handle for constructs with length parameter, prevents zero-drag mutation, and updates parameterOverrides.length on drag', async () => {
    const breaklineDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        length: { type: 'number', default: 6, min: 1, max: 20, step: 0.5 },
      },
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'line',
          points: [
            ['-{parameters.length} / 2', 0],
            ['{parameters.length} / 2', 0],
          ],
          closed: false,
        },
      ],
    };

    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'ConstructReference',
          componentId: 'brk_1',
          constructId: 'breakline',
          x: 6,
          y: 8,
          rotation: 90,
        },
      ],
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const onChangeSpy = vi.fn();
    let getWarnings: () => any[] = () => [];

    function Helper() {
      const { setSelectionIds, solverWarnings } = useDac();
      getWarnings = solverWarnings;
      setSelectionIds(['brk_1']);
      return null;
    }

    const dispose = render(() =>
      createComponent(DacProvider, {
        doc: detailDoc,
        nestedDocs: new Map([['breakline', breaklineDoc]]),
        onChange: onChangeSpy,
        get children() {
          return [createComponent(DacCanvas, {}), createComponent(Helper, {})];
        },
      }),
      container
    );

    try {
      await waitForGizmoFrame();
      expect(getWarnings()).toEqual([]);

      // Only construct-length handle should be rendered (no 8-way handles)
      const handles = container.querySelectorAll('[data-gizmo-handle]');
      expect(handles).toHaveLength(1);
      const lengthHandle = container.querySelector('[data-gizmo-handle="construct-length"]') as HTMLElement;
      expect(lengthHandle).not.toBeNull();
      // At rotation 90 deg, local +X=(3,0) maps to world (6, 8+3)=(6, 11) -> svg (6, 7)
      expect(lengthHandle.style.left).toBe('6px');
      expect(lengthHandle.style.top).toBe('7px');

      // 1. Click without moving past drag threshold -> must NOT call onChange
      lengthHandle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 6, clientY: 7, bubbles: true }));
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 7, clientY: 7, bubbles: true }));
      document.dispatchEvent(new PointerEvent('pointerup', { clientX: 7, clientY: 7, bubbles: true }));
      expect(onChangeSpy).not.toHaveBeenCalled();

      // 2. Drag upward by 4px in SVG (-Y = +4 Cartesian along 90deg rotated local X; centered scaleFactor=2 -> 6 + 2*4 = 14)
      lengthHandle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 6, clientY: 7, bubbles: true }));
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 6, clientY: 3, bubbles: true }));
      document.dispatchEvent(new PointerEvent('pointerup', { clientX: 6, clientY: 3, bubbles: true }));

      expect(onChangeSpy).toHaveBeenCalled();
      const latestDoc = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0];
      const updatedShape = latestDoc.geometry[0];
      expect(updatedShape.parameterOverrides?.length).toBe(14);
      expect(updatedShape.x).toBe(6);
      expect(updatedShape.y).toBe(8);
      expect(updatedShape.width).toBeUndefined();
      expect(updatedShape.height).toBeUndefined();
      expect(getWarnings()).toEqual([]);
    } finally {
      dispose();
      container.remove();
    }
  });

  it('hides construct-length handle when showGizmoHandles is false and preserves expression-driven coordinates on unmodified resize axes', async () => {
    const breaklineDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: { length: { type: 'number', default: 6 } },
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'line',
          points: [['-{parameters.length} / 2', 0], ['{parameters.length} / 2', 0]],
          closed: false,
        },
      ],
    };

    const readOnlyDetail: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'ConstructReference',
          componentId: 'brk_ro',
          constructId: 'breakline',
          x: 4,
          y: 4,
        },
      ],
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    function Selector() {
      const { setSelectionIds } = useDac();
      setSelectionIds(['brk_ro']);
      return null;
    }

    const disposeReadOnly = render(() =>
      createComponent(DacProvider, {
        doc: readOnlyDetail,
        nestedDocs: new Map([['breakline', breaklineDoc]]),
        get children() {
          return [
            createComponent(DacCanvas, { showGizmoActions: false, showGizmoHandles: false }),
            createComponent(Selector, {}),
          ];
        },
      }),
      container
    );

    try {
      await waitForGizmoFrame();
      expect(container.querySelector('[data-gizmo-bounds="true"]')).not.toBeNull();
      expect(container.querySelector('[data-gizmo-actions="true"]')).toBeNull();
      expect(container.querySelectorAll('[data-gizmo-handle]')).toHaveLength(0);
    } finally {
      disposeReadOnly();
      container.remove();
    }

    // Verify dragging 'e' handle preserves expression-driven x on Rectangle
    const exprDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      parameters: { originX: { type: 'number', default: 2 } },
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'expr_rect',
          x: '{parameters.originX}',
          y: 3,
          width: 5,
          height: 4,
        },
      ],
    };

    const exprContainer = document.createElement('div');
    document.body.appendChild(exprContainer);
    const onChangeExpr = vi.fn();
    function ExprSelector() {
      const { setSelectionIds } = useDac();
      setSelectionIds(['expr_rect']);
      return null;
    }

    const disposeExpr = render(() =>
      createComponent(DacProvider, {
        doc: exprDoc,
        onChange: onChangeExpr,
        get children() {
          return [createComponent(DacCanvas, {}), createComponent(ExprSelector, {})];
        },
      }),
      exprContainer
    );

    try {
      await waitForGizmoFrame();
      const eastHandle = exprContainer.querySelector('[data-gizmo-handle="e"]') as HTMLElement;
      expect(eastHandle).not.toBeNull();
      eastHandle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 60, clientY: 30, bubbles: true }));
      document.dispatchEvent(new PointerEvent('pointermove', { clientX: 70, clientY: 30, bubbles: true }));
      document.dispatchEvent(new PointerEvent('pointerup', { clientX: 70, clientY: 30, bubbles: true }));

      expect(onChangeExpr).toHaveBeenCalled();
      const updatedRect = onChangeExpr.mock.calls[onChangeExpr.mock.calls.length - 1][0].geometry[0];
      expect(updatedRect.x).toBe('{parameters.originX}');
      expect(updatedRect.y).toBe(3);
      expect(updatedRect.width).toBe(15);
    } finally {
      disposeExpr();
      exprContainer.remove();
    }
  });
});
