import { describe, it, expect, vi } from 'vitest';
import { createComponent, createEffect } from 'solid-js';
import { render } from '@solidjs/web';
import { DacProvider, DacCanvas, DacPlaybackControls, useDac, usePlayback } from '../index';
import type { DetailDocument } from '@aeckit/dac-schema';

describe('@aeckit/dac-solid Playback unit tests', () => {
  const sampleDoc: DetailDocument = {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1:1',
    geometry: [
      {
        type: 'CAD::Shape::Rectangle',
        componentId: 'concrete_foundation',
        x: 0,
        y: 0,
        width: 10,
        height: 4,
      },
      {
        type: 'CAD::Shape::Rectangle',
        componentId: 'sill_plate',
        x: 2,
        y: 4,
        width: 3.5,
        height: 1.5,
      },
      {
        type: 'CAD::Shape::Rectangle',
        componentId: 'stud',
        x: 2,
        y: 5.5,
        width: 1.5,
        height: 8,
      },
    ],
  };

  it('slices geometry in effectiveDoc according to playbackStep', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let dacApi: ReturnType<typeof useDac> | null = null;

    function TestConsumer() {
      dacApi = useDac();
      return document.createElement('div');
    }

    const dispose = render(
      () =>
        createComponent(DacProvider, {
          doc: sampleDoc,
          get children() {
            return createComponent(TestConsumer, {});
          },
        }),
      container
    );

    expect(dacApi).not.toBeNull();
    // Default / idle state: step is null, effectiveDoc has all 3 items
    expect(dacApi!.playbackStep()).toBeNull();
    expect(dacApi!.effectiveDoc().geometry.length).toBe(3);
    expect(dacApi!.totalPlaybackSteps()).toBe(3);

    // Step 0: empty geometry
    dacApi!.seekPlayback(0);
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBe(0);
    expect(dacApi!.effectiveDoc().geometry.length).toBe(0);
    expect(dacApi!.currentPlaybackElement()).toBeNull();

    // Step 1: 1 geometry (concrete_foundation)
    dacApi!.stepForward();
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBe(1);
    expect(dacApi!.effectiveDoc().geometry.length).toBe(1);
    expect(dacApi!.effectiveDoc().geometry[0].componentId).toBe('concrete_foundation');
    expect(dacApi!.currentPlaybackElement()?.componentId).toBe('concrete_foundation');

    // Step 2: 2 geometries (foundation + sill_plate)
    dacApi!.stepForward();
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBe(2);
    expect(dacApi!.effectiveDoc().geometry.length).toBe(2);
    expect(dacApi!.currentPlaybackElement()?.componentId).toBe('sill_plate');

    // Step backward: back to 1
    dacApi!.stepBackward();
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBe(1);
    expect(dacApi!.effectiveDoc().geometry.length).toBe(1);

    // Seek to max
    dacApi!.seekPlayback(3);
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBe(3);
    expect(dacApi!.effectiveDoc().geometry.length).toBe(3);
    expect(dacApi!.currentPlaybackElement()?.componentId).toBe('stud');

    // Seek clamped beyond max
    dacApi!.seekPlayback(10);
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBe(3);

    // Reset playback: back to full doc
    dacApi!.resetPlayback();
    await Promise.resolve();
    expect(dacApi!.playbackStep()).toBeNull();
    expect(dacApi!.effectiveDoc().geometry.length).toBe(3);

    dispose();
    container.remove();
  });

  it('renders DacPlaybackControls and triggers play/pause', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let playbackApi: ReturnType<typeof usePlayback> | null = null;

    function TestConsumer() {
      playbackApi = usePlayback();
      return createComponent(DacPlaybackControls, {});
    }

    const dispose = render(
      () =>
        createComponent(DacProvider, {
          doc: sampleDoc,
          get children() {
            return createComponent(TestConsumer, {});
          },
        }),
      container
    );

    const controls = container.querySelector('[data-playback-controls="true"]');
    expect(controls).not.toBeNull();

    expect(playbackApi!.isPlaying()).toBe(false);

    playbackApi!.play();
    await Promise.resolve();
    expect(playbackApi!.isPlaying()).toBe(true);
    expect(playbackApi!.step()).toBe(0);

    playbackApi!.pause();
    await Promise.resolve();
    expect(playbackApi!.isPlaying()).toBe(false);
    expect(playbackApi!.step()).toBe(0);

    playbackApi!.stepForward();
    await Promise.resolve();
    expect(playbackApi!.step()).toBe(1);

    // Initial state is collapsed
    expect(controls!.getAttribute('data-expanded')).toBe('false');
    expect(container.querySelector('input[type="range"]')).toBeNull();

    // Expand
    const expandBtn = container.querySelector('button[title="Expand playback controls"]') as HTMLButtonElement;
    expect(expandBtn).not.toBeNull();
    expandBtn.click();
    await Promise.resolve();
    expect(controls!.getAttribute('data-expanded')).toBe('true');
    expect(container.querySelector('input[type="range"]')).not.toBeNull();

    // Collapse
    const collapseBtn = container.querySelector('button[title="Collapse playback controls"]') as HTMLButtonElement;
    expect(collapseBtn).not.toBeNull();
    collapseBtn.click();
    await Promise.resolve();
    expect(controls!.getAttribute('data-expanded')).toBe('false');
    expect(container.querySelector('input[type="range"]')).toBeNull();

    dispose();
    container.remove();
  });

  it('does not render playback controls for non-detail documents', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let dacApi: ReturnType<typeof useDac> | null = null;

    const constructDoc = {
      type: 'CAD::Construct',
      version: '1.0',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          width: 5,
          height: 5,
        },
      ],
    };

    function TestConsumer() {
      dacApi = useDac();
      return createComponent(DacPlaybackControls, {});
    }

    const dispose = render(
      () =>
        createComponent(DacProvider, {
          doc: constructDoc,
          get children() {
            return createComponent(TestConsumer, {});
          },
        }),
      container
    );

    expect(dacApi!.totalPlaybackSteps()).toBe(0);
    const controls = container.querySelector('[data-playback-controls="true"]');
    expect(controls).toBeNull();

    dispose();
    container.remove();
  });
});
