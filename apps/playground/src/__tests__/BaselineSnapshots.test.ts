import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { renderDetail, renderSheet } from '@dac/renderer-svg';
import type { DetailDocument, SheetConfiguration, TitleBlockDocument } from '@dac/schema';

describe('Playground Baseline Snapshot Regression Tests', () => {
  const demoDir = path.resolve(__dirname, '../demo');
  const rootDir = path.resolve(__dirname, '../../../../');

  function loadJson<T>(filePath: string): T {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  // Normalize dynamic random IDs (e.g. clip-img-${vpId}-${Math.random()}) for deterministic snapshots
  function normalizeSvg(svg: string): string {
    return svg.replace(/clip-img-[a-zA-Z0-9_-]+/g, 'clip-img-STATIC');
  }

  it('renders welcome-detail.json consistently', () => {
    const doc = loadJson<DetailDocument>(path.join(demoDir, 'welcome-detail.json'));
    const svg = normalizeSvg(renderDetail(doc, 24, 18));
    expect(svg).toMatchSnapshot();
  });

  it('renders components-demo.json consistently', () => {
    const doc = loadJson<DetailDocument>(path.join(demoDir, 'components-demo.json'));
    const svg = normalizeSvg(renderDetail(doc, 24, 18));
    expect(svg).toMatchSnapshot();
  });

  it('renders detail-prototype.json consistently', () => {
    const doc = loadJson<DetailDocument>(path.join(rootDir, 'detail-prototype.json'));
    const svg = normalizeSvg(renderDetail(doc, 24, 18));
    expect(svg).toMatchSnapshot();
  });

  it('renders DEMO-1.json sheet with referenced viewports consistently', () => {
    const sheetDoc = loadJson<SheetConfiguration>(path.join(demoDir, 'DEMO-1.json'));
    const welcomeDoc = loadJson<DetailDocument>(path.join(demoDir, 'welcome-detail.json'));
    const componentsDoc = loadJson<DetailDocument>(path.join(demoDir, 'components-demo.json'));
    const jsonGuideDoc = loadJson<DetailDocument>(path.join(demoDir, 'json-editor-guide.json'));
    const titleBlockDoc = loadJson<TitleBlockDocument>(path.join(demoDir, 'title-block.json'));

    const viewportsMap = new Map<string, DetailDocument>();
    viewportsMap.set('welcome-detail.json', welcomeDoc);
    viewportsMap.set('components-demo.json', componentsDoc);
    viewportsMap.set('json-editor-guide.json', jsonGuideDoc);

    const svg = normalizeSvg(renderSheet(sheetDoc, {}, viewportsMap, titleBlockDoc, 0, 0, 'ARCH D'));
    expect(svg).toMatchSnapshot();
  });
});
