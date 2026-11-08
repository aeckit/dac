import { describe, it, expect, vi } from 'vitest';
import { createComponent, createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { PointsField } from '../components/PointsField';

describe('PointsField component unit tests', () => {
  it('renders coordinate rows for all points in structured table mode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const [points, setPoints] = createSignal<[number | string, number | string][]>([
      [0, 0],
      [10, 5],
      [20, 0]
    ]);

    const updateShape = vi.fn((id, props) => {
      if (props.points) setPoints(props.points);
    });

    const dispose = render(() =>
      createComponent(PointsField, {
        points,
        currentId: 'poly-1',
        updateShape
      }),
      container
    );

    // Verify 3 row indicators (#1, #2, #3)
    expect(container.textContent).toContain('#1');
    expect(container.textContent).toContain('#2');
    expect(container.textContent).toContain('#3');

    // Verify input values
    const inputs = container.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    expect(inputs).toHaveLength(6); // 3 pairs of X/Y
    expect(inputs[0].value).toBe('0');
    expect(inputs[1].value).toBe('0');
    expect(inputs[2].value).toBe('10');
    expect(inputs[3].value).toBe('5');
    expect(inputs[4].value).toBe('20');
    expect(inputs[5].value).toBe('0');

    // Edit an input
    inputs[2].value = '15';
    inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
    expect(updateShape).toHaveBeenCalledWith('poly-1', {
      points: [
        [0, 0],
        [15, 5],
        [20, 0]
      ]
    });

    dispose();
    container.remove();
  });

  it('adds and deletes points in the table', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const [points, setPoints] = createSignal<[number | string, number | string][]>([
      [0, 0],
      [10, 5],
      [20, 0]
    ]);

    const updateShape = vi.fn((id, props) => {
      if (props.points) setPoints(props.points);
    });

    const dispose = render(() =>
      createComponent(PointsField, {
        points,
        currentId: 'poly-1',
        updateShape
      }),
      container
    );

    // Click "+ Add Point"
    const addBtn = container.querySelector('button[title="Add Point"]') as HTMLButtonElement;
    addBtn.click();
    expect(updateShape).toHaveBeenCalled();

    // Verify delete button
    const deleteBtns = container.querySelectorAll('button[title*="Delete vertex"]') as NodeListOf<HTMLButtonElement>;
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);
    deleteBtns[1].click();
    expect(updateShape).toHaveBeenCalledWith('poly-1', {
      points: [
        [0, 0],
        [20, 0],
        [30, -5]
      ]
    });

    dispose();
    container.remove();
  });

  it('handles parametric string expressions in coordinate inputs', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const [points, setPoints] = createSignal<[number | string, number | string][]>([
      [0, 0],
      ['{parameters.span} / 2', '{parameters.height}']
    ]);

    const updateShape = vi.fn((id, props) => {
      if (props.points) setPoints(props.points);
    });

    const dispose = render(() =>
      createComponent(PointsField, {
        points,
        currentId: 'poly-expr',
        updateShape
      }),
      container
    );

    const inputs = container.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    expect(inputs[2].value).toBe('{parameters.span} / 2');
    expect(inputs[3].value).toBe('{parameters.height}');

    // Edit parametric expression
    inputs[2].value = '{parameters.width} * 2';
    inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
    expect(updateShape).toHaveBeenCalledWith('poly-expr', {
      points: [
        [0, 0],
        ['{parameters.width} * 2', '{parameters.height}']
      ]
    });

    dispose();
    container.remove();
  });
});
