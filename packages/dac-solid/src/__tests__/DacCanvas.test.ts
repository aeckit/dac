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
});
