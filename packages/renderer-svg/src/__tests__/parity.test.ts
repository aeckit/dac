import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { DetailDocument } from '@dac/schema';
import { solveDetailDocument } from '@dac/json-solver';
import { renderDetail, renderSolvedDetail } from '../index';

describe('Architectural Parity: (@dac/json-solver + @dac/renderer-svg) vs Legacy core-solver', () => {
  const demoDir = path.resolve(__dirname, '../../../../apps/playground/src/demo');

  function loadJson<T>(filePath: string): T {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  function normalizeSvg(svg: string): string {
    return svg
      .replace(/clip-img-[a-zA-Z0-9_-]+/g, 'clip-img-STATIC')
      .replace(/img-fallback-[a-zA-Z0-9_-]+/g, 'img-fallback-STATIC');
  }

  it('produces identical SVG output for welcome-detail.json', () => {
    const doc = loadJson<DetailDocument>(path.join(demoDir, 'welcome-detail.json'));
    
    // Legacy monolithic pipeline
    const legacySvg = normalizeSvg(renderDetail(doc, 24, 18));

    // New decoupled pipeline: JSON -> Solved IR -> SVG
    const solvedLayout = solveDetailDocument(doc, 24, 18);
    const newSvg = normalizeSvg(renderSolvedDetail(solvedLayout));

    expect(newSvg.trim()).toBe(legacySvg.trim());
  });

  it('produces identical SVG output for components-demo.json', () => {
    const doc = loadJson<DetailDocument>(path.join(demoDir, 'components-demo.json'));

    const legacySvg = normalizeSvg(renderDetail(doc, 24, 18));

    const solvedLayout = solveDetailDocument(doc, 24, 18);
    const newSvg = normalizeSvg(renderSolvedDetail(solvedLayout));

    expect(newSvg.trim()).toBe(legacySvg.trim());
  });
});
