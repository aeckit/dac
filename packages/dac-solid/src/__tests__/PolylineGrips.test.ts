import { describe, it, expect, vi } from 'vitest';
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { PolylineGrips } from '../components/PolylineGrips';

describe('PolylineGrips unit tests', () => {
  it('renders vertex and midpoint grips at specified screen coordinates', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const points = [
      { x: 100, y: 150, index: 0 },
      { x: 200, y: 150, index: 1 },
      { x: 200, y: 250, index: 2 }
    ];

    const midpoints = [
      { x: 150, y: 150, index: 0 },
      { x: 200, y: 200, index: 1 }
    ];

    const onDragVertex = vi.fn();
    const onDragMidpoint = vi.fn();
    const onDeleteVertex = vi.fn();

    const dispose = render(() =>
      createComponent(PolylineGrips, {
        points,
        midpoints,
        onDragVertex,
        onDragMidpoint,
        onDeleteVertex
      }),
      container
    );

    // Verify 3 vertex grips rendered
    const vertexEls = container.querySelectorAll('div[title*="Vertex"]');
    expect(vertexEls).toHaveLength(3);
    expect((vertexEls[0] as HTMLElement).style.left).toBe('100px');
    expect((vertexEls[0] as HTMLElement).style.top).toBe('150px');
    expect((vertexEls[1] as HTMLElement).style.left).toBe('200px');
    expect((vertexEls[2] as HTMLElement).style.top).toBe('250px');

    // Verify 2 midpoint grips rendered
    const midEls = container.querySelectorAll('div[title*="Insert vertex"]');
    expect(midEls).toHaveLength(2);
    expect((midEls[0] as HTMLElement).style.left).toBe('150px');
    expect((midEls[1] as HTMLElement).style.top).toBe('200px');

    // Test dragging a vertex
    const pointerEvt = new PointerEvent('pointerdown', { bubbles: true });
    vertexEls[0].dispatchEvent(pointerEvt);
    expect(onDragVertex).toHaveBeenCalledWith(expect.anything(), 0);

    // Test dragging a midpoint
    midEls[0].dispatchEvent(pointerEvt);
    expect(onDragMidpoint).toHaveBeenCalledWith(expect.anything(), 0);

    // Test double-clicking a vertex to delete
    const dblClickEvt = new MouseEvent('dblclick', { bubbles: true });
    vertexEls[1].dispatchEvent(dblClickEvt);
    expect(onDeleteVertex).toHaveBeenCalledWith(expect.anything(), 1);

    dispose();
    container.remove();
  });
});
