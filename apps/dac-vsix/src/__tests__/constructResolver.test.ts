import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  resolveConstructFilePath,
  resolveConstructDependencies,
  createConstructResolutionState,
  ConstructResolverHost,
} from '../constructResolver';
import { parseAndLoadDacDocument } from '../documentLoader';

function writeJson(filePath: string, data: unknown): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
}

function writeText(filePath: string, content: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeConstruct(label: string, extraGeometry: any[] = []): any {
  return {
    type: 'CAD::Construct',
    version: '1.0',
    metadata: { name: label },
    geometry: [
      { type: 'CAD::Shape::Rectangle', componentId: `${label}-rect`, x: 0, y: 0, width: 1, height: 1 },
      ...extraGeometry,
    ],
  };
}

describe('dac-vsix construct resolver', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dac-vsix-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('gives exact sibling and explicit relative paths priority over constructs/ directories', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailDir = path.join(wsRoot, 'catalog', 'details');

    const siblingWood = writeJson(
      path.join(detailDir, 'wood-section.json'),
      makeConstruct('sibling-wood')
    );
    const catalogWood = writeJson(
      path.join(wsRoot, 'catalog', 'constructs', 'wood-section.json'),
      makeConstruct('catalog-wood')
    );
    const customPart = writeJson(
      path.join(detailDir, 'custom', 'bolt.json'),
      makeConstruct('custom-bolt')
    );
    // Also place bolt.json in constructs/ to ensure explicit ./ doesn't fall back
    writeJson(path.join(wsRoot, 'catalog', 'constructs', 'missing.json'), makeConstruct('should-not-match'));

    const host: ConstructResolverHost = { workspaceRoots: [wsRoot] };

    expect(await resolveConstructFilePath('wood-section.json', detailDir, host)).toBe(siblingWood);
    expect(await resolveConstructFilePath('./wood-section.json', detailDir, host)).toBe(siblingWood);
    expect(await resolveConstructFilePath('../constructs/wood-section.json', detailDir, host)).toBe(catalogWood);
    expect(await resolveConstructFilePath('./custom/bolt.json', detailDir, host)).toBe(customPart);

    // Explicit ./ or ../ paths must not fall back to constructs/
    expect(await resolveConstructFilePath('./missing.json', detailDir, host)).toBeNull();
    expect(await resolveConstructFilePath('../missing.json', detailDir, host)).toBeNull();
  });

  it('prefers the nearest ancestor constructs/ directory over farther ones', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const deepDetailDir = path.join(wsRoot, 'catalog', 'details', 'decks');

    writeJson(path.join(wsRoot, 'constructs', 'wood-section.json'), makeConstruct('root-wood'));
    const catalogWood = writeJson(
      path.join(wsRoot, 'catalog', 'constructs', 'wood-section.json'),
      makeConstruct('catalog-wood')
    );
    const rootOnlyPart = writeJson(
      path.join(wsRoot, 'constructs', 'root-only.json'),
      makeConstruct('root-only')
    );

    const host: ConstructResolverHost = { workspaceRoots: [wsRoot] };

    // Closer catalog/constructs/ wins over wsRoot/constructs/
    expect(await resolveConstructFilePath('wood-section.json', deepDetailDir, host)).toBe(catalogWood);

    // If closer catalog/constructs/ does not have the file, continue upward to wsRoot/constructs/
    expect(await resolveConstructFilePath('root-only.json', deepDetailDir, host)).toBe(rootOnlyPart);

    // Adding an even closer constructs/ inside details/ wins over catalog/constructs/
    const detailsWood = writeJson(
      path.join(wsRoot, 'catalog', 'details', 'constructs', 'sub', 'wood-section.json'),
      makeConstruct('details-sub-wood')
    );
    expect(await resolveConstructFilePath('wood-section.json', deepDetailDir, host)).toBe(detailsWood);
  });

  it('does not walk above the containing workspace root', async () => {
    const outerConstructs = path.join(tmpRoot, 'constructs');
    writeJson(path.join(outerConstructs, 'outside.json'), makeConstruct('outside'));

    const wsRoot = path.join(tmpRoot, 'workspace');
    const detailDir = path.join(wsRoot, 'details');
    fs.mkdirSync(detailDir, { recursive: true });

    const host: ConstructResolverHost = { workspaceRoots: [wsRoot] };
    expect(await resolveConstructFilePath('outside.json', detailDir, host)).toBeNull();
  });

  it('matches nested subfolders under constructs/ deterministically', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailDir = path.join(wsRoot, 'catalog', 'details');
    fs.mkdirSync(detailDir, { recursive: true });

    const timberWood = writeJson(
      path.join(wsRoot, 'catalog', 'constructs', 'timber', 'wood-section.json'),
      makeConstruct('timber-wood')
    );
    const deepAngle = writeJson(
      path.join(wsRoot, 'catalog', 'constructs', 'steel', 'angles', 'L4x4.json'),
      makeConstruct('angle')
    );

    // Multiple matches for tie-breaking: shallower/lexically earlier should win
    writeJson(path.join(wsRoot, 'catalog', 'constructs', 'z', 'bolt.json'), makeConstruct('z-bolt'));
    const aBolt = writeJson(
      path.join(wsRoot, 'catalog', 'constructs', 'a', 'bolt.json'),
      makeConstruct('a-bolt')
    );
    writeJson(
      path.join(wsRoot, 'catalog', 'constructs', 'a', 'deep', 'bolt.json'),
      makeConstruct('a-deep-bolt')
    );

    const host: ConstructResolverHost = { workspaceRoots: [wsRoot] };

    expect(await resolveConstructFilePath('wood-section.json', detailDir, host)).toBe(timberWood);
    expect(await resolveConstructFilePath('angles/L4x4.json', detailDir, host)).toBe(deepAngle);
    expect(await resolveConstructFilePath('bolt.json', detailDir, host)).toBe(aBolt);

    // Exact name matching: omitting .json must not invent an extension
    expect(await resolveConstructFilePath('wood-section', detailDir, host)).toBeNull();
  });

  it('falls back to workspace-wide **/constructs/** search and excludes node_modules, .git, and dist', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailDir = path.join(wsRoot, 'projects', 'deck', 'details');
    fs.mkdirSync(detailDir, { recursive: true });

    // Excluded directories should never be returned
    writeJson(path.join(wsRoot, 'node_modules', 'pkg', 'constructs', 'breakline.json'), makeConstruct('nm'));
    writeJson(path.join(wsRoot, '.git', 'constructs', 'breakline.json'), makeConstruct('git'));
    writeJson(path.join(wsRoot, 'dist', 'constructs', 'breakline.json'), makeConstruct('dist'));

    // Valid fallback in a separate branch
    const sharedBreakline = writeJson(
      path.join(wsRoot, 'shared', 'library', 'constructs', 'breakline.json'),
      makeConstruct('shared-breakline')
    );
    // Deeper valid fallback that should lose to shared/library/constructs/breakline.json
    writeJson(
      path.join(wsRoot, 'shared', 'library', 'constructs', 'extra', 'breakline.json'),
      makeConstruct('deeper-breakline')
    );

    const host: ConstructResolverHost = { workspaceRoots: [wsRoot] };

    expect(await resolveConstructFilePath('breakline.json', detailDir, host)).toBe(sharedBreakline);
    // Excluded-only file must not resolve
    writeJson(path.join(wsRoot, 'node_modules', 'pkg', 'constructs', 'only-nm.json'), makeConstruct('only-nm'));
    expect(await resolveConstructFilePath('only-nm.json', detailDir, host)).toBeNull();
  });

  it('recursively resolves nested constructs and guards against circular references', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailDir = path.join(wsRoot, 'catalog', 'details');
    const constructsDir = path.join(wsRoot, 'catalog', 'constructs');

    writeJson(
      path.join(constructsDir, 'sub', 'bolt.json'),
      makeConstruct('bolt', [
        { type: 'ConstructReference', componentId: 'w1', constructId: 'washer.json', x: 0, y: 0 },
      ])
    );
    writeJson(path.join(constructsDir, 'washer.json'), makeConstruct('washer'));

    // Cycle: assembly -> node-a -> node-b -> ./node-a.json & assembly.json
    writeJson(
      path.join(constructsDir, 'assembly.json'),
      makeConstruct('assembly', [
        { type: 'ConstructReference', componentId: 'b1', constructId: 'sub/bolt.json', x: 0, y: 0 },
        { type: 'ConstructReference', componentId: 'a1', constructId: 'node-a.json', x: 1, y: 1 },
      ])
    );
    writeJson(
      path.join(constructsDir, 'node-a.json'),
      makeConstruct('node-a', [
        { type: 'ConstructReference', componentId: 'b_ref', constructId: 'node-b.json', x: 0, y: 0 },
      ])
    );
    writeJson(
      path.join(constructsDir, 'node-b.json'),
      makeConstruct('node-b', [
        { type: 'ConstructReference', componentId: 'a_rel', constructId: './node-a.json', x: 0, y: 0 },
        { type: 'ConstructReference', componentId: 'asm_ref', constructId: 'assembly.json', x: 0, y: 0 },
      ])
    );

    const detailDoc = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        { type: 'ConstructReference', componentId: 'asm', constructId: 'assembly.json', x: 0, y: 0 },
      ],
    };

    const state = createConstructResolutionState();
    await resolveConstructDependencies(detailDoc, detailDir, { workspaceRoots: [wsRoot] }, state);

    expect(Array.from(state.constructsMap.keys()).sort()).toEqual([
      './node-a.json',
      'assembly.json',
      'node-a.json',
      'node-b.json',
      'sub/bolt.json',
      'washer.json',
    ]);
    expect(state.constructsMap.get('washer.json')?.metadata?.name).toBe('washer');
    expect(state.constructsMap.get('sub/bolt.json')?.metadata?.name).toBe('bolt');
  });

  it('handles missing construct files and invalid JSON gracefully without throwing', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailDir = path.join(wsRoot, 'catalog', 'details');
    const constructsDir = path.join(wsRoot, 'catalog', 'constructs');

    writeText(path.join(constructsDir, 'broken.json'), '{ invalid json');
    writeJson(path.join(constructsDir, 'valid.json'), makeConstruct('valid'));

    const detailDoc = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        { type: 'ConstructReference', componentId: 'c1', constructId: 'missing.json', x: 0, y: 0 },
        { type: 'ConstructReference', componentId: 'c2', constructId: 'broken.json', x: 1, y: 0 },
        { type: 'ConstructReference', componentId: 'c3', constructId: 'valid.json', x: 2, y: 0 },
      ],
    };

    const state = createConstructResolutionState();
    await expect(
      resolveConstructDependencies(detailDoc, detailDir, { workspaceRoots: [wsRoot] }, state)
    ).resolves.toBeUndefined();

    expect(state.constructsMap.has('missing.json')).toBe(false);
    expect(state.constructsMap.has('broken.json')).toBe(false);
    expect(state.constructsMap.get('valid.json')?.metadata?.name).toBe('valid');
  });

  it('loads typical-deck-detail.json constructs from catalog/constructs/ and preserves Sheet/Project behavior', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailPath = path.join(wsRoot, 'catalog', 'details', 'typical-deck-detail.json');
    const constructsDir = path.join(wsRoot, 'catalog', 'constructs');

    writeJson(path.join(constructsDir, 'wood-section.json'), makeConstruct('wood-section'));
    writeJson(path.join(constructsDir, 'rebar-longitudinal.json'), makeConstruct('rebar-longitudinal'));
    writeJson(path.join(constructsDir, 'rebar-section.json'), makeConstruct('rebar-section'));
    writeJson(path.join(constructsDir, 'misc', 'breakline.json'), makeConstruct('breakline'));

    const detailDoc = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        { type: 'ConstructReference', componentId: 'w', constructId: 'wood-section.json', x: 0, y: 0 },
        { type: 'ConstructReference', componentId: 'rl', constructId: 'rebar-longitudinal.json', x: 1, y: 0 },
        { type: 'ConstructReference', componentId: 'rs', constructId: 'rebar-section.json', x: 2, y: 0 },
        { type: 'ConstructReference', componentId: 'br', constructId: 'breakline.json', x: 3, y: 0 },
      ],
    };
    writeJson(detailPath, detailDoc);

    const loadedDetail = await parseAndLoadDacDocument(
      JSON.stringify(detailDoc),
      detailPath,
      { workspaceRoots: [wsRoot] }
    );
    expect(loadedDetail).not.toBeNull();

    // Verify clean JSON serialization across postMessage and Map reconstruction
    const roundTripped = JSON.parse(JSON.stringify(loadedDetail!.constructsMap));
    const nestedDocsMap = new Map<string, any>(Object.entries(roundTripped));
    expect(nestedDocsMap.get('wood-section.json')?.metadata?.name).toBe('wood-section');
    expect(nestedDocsMap.get('rebar-longitudinal.json')?.metadata?.name).toBe('rebar-longitudinal');
    expect(nestedDocsMap.get('rebar-section.json')?.metadata?.name).toBe('rebar-section');
    expect(nestedDocsMap.get('breakline.json')?.metadata?.name).toBe('breakline');

    // Verify CAD::SheetConfiguration resolves viewports, titleBlockRef, and constructs inside details
    writeJson(path.join(wsRoot, 'catalog', 'titleblocks', 'std.json'), {
      type: 'CAD::TitleBlock',
      version: '1.0',
      geometry: [
        { type: 'ConstructReference', componentId: 'tb_br', constructId: 'breakline.json', x: 0, y: 0 },
      ],
    });
    const sheetPath = path.join(wsRoot, 'catalog', 'sheets', 'S-101.json');
    const sheetDoc = {
      type: 'CAD::SheetConfiguration',
      version: '1.0',
      sheetNumber: 'S-101',
      titleBlockRef: 'titleblocks/std.json',
      viewports: [{ detail: 'details/typical-deck-detail.json', x: 0, y: 0, width: 6, height: 6 }],
    };
    writeJson(sheetPath, sheetDoc);

    const loadedSheet = await parseAndLoadDacDocument(
      JSON.stringify(sheetDoc),
      sheetPath,
      { workspaceRoots: [wsRoot] }
    );
    expect(loadedSheet).not.toBeNull();
    expect(loadedSheet!.viewportsMap?.['details/typical-deck-detail.json']?.type).toBe('CAD::Detail');
    expect(loadedSheet!.titleBlockMap?.['titleblocks/std.json']?.type).toBe('CAD::TitleBlock');
    expect(loadedSheet!.constructsMap['wood-section.json']?.metadata?.name).toBe('wood-section');
    expect(loadedSheet!.constructsMap['breakline.json']?.metadata?.name).toBe('breakline');

    // Verify CAD::Project preserves sheet loading & nested constructs
    const projectPath = path.join(wsRoot, 'catalog', 'project.json');
    const projectDoc = {
      type: 'CAD::Project',
      version: '1.0',
      projectName: 'Deck',
      sheets: ['sheets/S-101.json'],
    };
    writeJson(projectPath, projectDoc);

    const loadedProject = await parseAndLoadDacDocument(
      JSON.stringify(projectDoc),
      projectPath,
      { workspaceRoots: [wsRoot] }
    );
    expect(loadedProject).not.toBeNull();
    expect(loadedProject!.viewportsMap?.['details/typical-deck-detail.json']).toBeDefined();
    expect(loadedProject!.titleBlockMap?.['titleblocks/std.json']).toBeDefined();
    expect(loadedProject!.constructsMap['rebar-section.json']?.metadata?.name).toBe('rebar-section');
  });

  it('delegates nested glob searches to custom host.findFiles (VS Code adapter contract)', async () => {
    const wsRoot = path.join(tmpRoot, 'ws');
    const detailDir = path.join(wsRoot, 'details');
    fs.mkdirSync(detailDir, { recursive: true });

    const expectedFile = writeJson(
      path.join(wsRoot, 'other', 'constructs', 'nested', 'part.json'),
      makeConstruct('part')
    );

    const calls: Array<{ baseDir: string; pattern: string }> = [];
    const host: ConstructResolverHost = {
      workspaceRoots: [wsRoot],
      findFiles: async (baseDir, pattern) => {
        calls.push({ baseDir, pattern });
        return [expectedFile];
      },
    };

    const resolved = await resolveConstructFilePath('part.json', detailDir, host);
    expect(resolved).toBe(expectedFile);
    expect(calls).toEqual([
      { baseDir: wsRoot, pattern: '**/constructs/**/part.json' },
    ]);
  });
});
