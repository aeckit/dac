import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { DacProvider, DacCanvas, SelectionGizmo, useDac, type DacCanvasProps, type SelectionGizmoProps } from '../index';
import type { DetailDocument } from '@aeckit/dac-schema';

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
});
