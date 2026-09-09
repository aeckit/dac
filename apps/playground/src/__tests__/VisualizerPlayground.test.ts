import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import { VisualizerUI } from '@aeckit/ui-components';
import type { DetailDocument, SheetConfiguration, TitleBlockDocument } from '@dac/schema';

describe('Playground VisualizerUI Integration Tests', () => {
  let container: HTMLElement;
  const demoDir = path.resolve(__dirname, '../demo');

  function loadJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'visualizer-container';
    document.body.appendChild(container);
  });

  it('mounts VisualizerUI with welcome-detail.json and renders SVG tree', () => {
    const doc = loadJson<DetailDocument>(path.join(demoDir, 'welcome-detail.json'));
    const ui = new VisualizerUI(
      container,
      doc,
      vi.fn(),
      new Map(),
      new Map(),
      { showLeftToggle: true, showRightToggle: true }
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Welcome to AECKit Playground!');
  });

  it('handles component selection and highlights in SVG', () => {
    const doc = loadJson<DetailDocument>(path.join(demoDir, 'welcome-detail.json'));
    const ui = new VisualizerUI(container, doc, vi.fn());

    ui.selectComponent('border', 'Rectangle');
    expect(ui.selectedComponentIds.has('border')).toBe(true);

    const selectedGroup = container.querySelector('[data-component-id="border"]');
    expect(selectedGroup?.classList.contains('selected-highlight')).toBe(true);
  });

  it('renders a full Sheet with viewports in VisualizerUI', () => {
    const sheetDoc = loadJson<SheetConfiguration>(path.join(demoDir, 'DEMO-1.json'));
    const welcomeDoc = loadJson<DetailDocument>(path.join(demoDir, 'welcome-detail.json'));
    const componentsDoc = loadJson<DetailDocument>(path.join(demoDir, 'components-demo.json'));
    const jsonGuideDoc = loadJson<DetailDocument>(path.join(demoDir, 'json-editor-guide.json'));
    const titleBlockDoc = loadJson<TitleBlockDocument>(path.join(demoDir, 'title-block.json'));

    const viewportsMap = new Map<string, DetailDocument>();
    viewportsMap.set('welcome-detail.json', welcomeDoc);
    viewportsMap.set('components-demo.json', componentsDoc);
    viewportsMap.set('json-editor-guide.json', jsonGuideDoc);

    const titleBlockMap = new Map<string, TitleBlockDocument | DetailDocument>();
    titleBlockMap.set('title-block.json', titleBlockDoc);

    const ui = new VisualizerUI(
      container,
      sheetDoc,
      vi.fn(),
      viewportsMap,
      titleBlockMap,
      { showLeftToggle: true, showRightToggle: true }
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const viewports = container.querySelectorAll('[data-component-type="CAD::Viewport"]');
    expect(viewports.length).toBe(3);
  });
});
