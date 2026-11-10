import * as fs from 'fs';
import * as path from 'path';
import type { ProjectDocument, SheetConfiguration as SheetDocument } from '@aeckit/dac-schema';
import {
  ConstructResolverHost,
  ConstructResolutionState,
  createConstructResolutionState,
  isExistingFile,
  resolveConstructDependencies,
} from './constructResolver';

export interface LoadedDacDocument {
  doc: any;
  viewportsMap?: Record<string, any>;
  titleBlockMap?: Record<string, any>;
  constructsMap: Record<string, any>;
  resolvedConstructPaths: Set<string>;
}

/**
 * Resolves a DAC reference path (sheets, viewport details, titleblocks, images)
 * relative to `currentFileDir`, walking upward and then checking workspace roots.
 */
export function resolveDacPath(
  refPath: string,
  currentFileDir: string,
  workspaceRoots: readonly string[]
): string | null {
  if (!refPath || typeof refPath !== 'string') return null;
  if (path.isAbsolute(refPath)) return isExistingFile(refPath) ? refPath : null;

  let candidate = path.join(currentFileDir, refPath);
  if (isExistingFile(candidate)) return candidate;

  let dir = currentFileDir;
  while (dir && dir !== path.parse(dir).root) {
    dir = path.dirname(dir);
    candidate = path.join(dir, refPath);
    if (isExistingFile(candidate)) return candidate;
  }

  for (const root of workspaceRoots) {
    candidate = path.join(root, refPath);
    if (isExistingFile(candidate)) return candidate;
  }

  return null;
}

export function resolveLocalImages(
  doc: any,
  baseDir: string,
  workspaceRoots: readonly string[]
): void {
  if (!doc || !Array.isArray(doc.geometry)) return;

  for (const geom of doc.geometry) {
    if (geom?.type === 'CAD::Annotation::Image' && typeof geom.href === 'string' && geom.href) {
      const href: string = geom.href;
      if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:')) {
        try {
          const imgPath = resolveDacPath(href, baseDir, workspaceRoots);
          if (imgPath) {
            const ext = path.extname(imgPath).toLowerCase().replace('.', '') || 'jpeg';
            const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
            const base64 = fs.readFileSync(imgPath, 'base64');
            geom.href = `data:image/${mime};base64,${base64}`;
          }
        } catch (err) {
          console.error('Failed to load local image:', href, err);
        }
      }
    }
  }
}

function loadTitleBlock(
  refPath: string,
  baseDir: string,
  workspaceRoots: readonly string[],
  titleBlockMap: Record<string, any>,
  titleBlockDirs: Record<string, string>
): void {
  if (!refPath || titleBlockMap[refPath]) return;
  try {
    const tbPath = resolveDacPath(refPath, baseDir, workspaceRoots);
    if (tbPath) {
      const tbContent = fs.readFileSync(tbPath, 'utf8');
      titleBlockMap[refPath] = JSON.parse(tbContent);
      const tbDir = path.dirname(tbPath);
      titleBlockDirs[refPath] = tbDir;
      resolveLocalImages(titleBlockMap[refPath], tbDir, workspaceRoots);
    }
  } catch {
    console.error('Failed to load title block:', refPath);
  }
}

async function resolveSheetDependencies(
  sheet: any,
  sheetBaseDir: string,
  host: ConstructResolverHost,
  viewportsMap: Record<string, any>,
  titleBlockMap: Record<string, any>,
  titleBlockDirs: Record<string, string>,
  constructState: ConstructResolutionState
): Promise<void> {
  const onConstructLoaded = (cDoc: any, cDir: string) =>
    resolveLocalImages(cDoc, cDir, host.workspaceRoots);

  resolveLocalImages(sheet, sheetBaseDir, host.workspaceRoots);
  await resolveConstructDependencies(sheet, sheetBaseDir, host, constructState, onConstructLoaded);

  if (typeof sheet.titleBlockRef === 'string') {
    loadTitleBlock(sheet.titleBlockRef, sheetBaseDir, host.workspaceRoots, titleBlockMap, titleBlockDirs);
  }
  if (typeof sheet.titleBlockOverride === 'string') {
    loadTitleBlock(sheet.titleBlockOverride, sheetBaseDir, host.workspaceRoots, titleBlockMap, titleBlockDirs);
  }

  if (Array.isArray(sheet.viewports)) {
    for (const vp of sheet.viewports) {
      let vpDir = sheetBaseDir;
      if (typeof vp?.detail === 'string') {
        if (!viewportsMap[vp.detail]) {
          try {
            const vpPath = resolveDacPath(vp.detail, sheetBaseDir, host.workspaceRoots);
            if (vpPath) {
              vpDir = path.dirname(vpPath);
              const vpContent = fs.readFileSync(vpPath, 'utf8');
              viewportsMap[vp.detail] = JSON.parse(vpContent);
              resolveLocalImages(viewportsMap[vp.detail], vpDir, host.workspaceRoots);
            } else {
              console.error('Failed to locate viewport detail:', vp.detail);
            }
          } catch {
            console.error('Failed to load viewport detail:', vp.detail);
          }
        } else {
          const existingVpPath = resolveDacPath(vp.detail, sheetBaseDir, host.workspaceRoots);
          if (existingVpPath) vpDir = path.dirname(existingVpPath);
        }

        if (viewportsMap[vp.detail]) {
          await resolveConstructDependencies(
            viewportsMap[vp.detail],
            vpDir,
            host,
            constructState,
            onConstructLoaded
          );
        }
      }
    }
  }
}

async function resolveTitleBlockConstructs(
  titleBlockMap: Record<string, any>,
  titleBlockDirs: Record<string, string>,
  fallbackDir: string,
  host: ConstructResolverHost,
  constructState: ConstructResolutionState
): Promise<void> {
  const onConstructLoaded = (cDoc: any, cDir: string) =>
    resolveLocalImages(cDoc, cDir, host.workspaceRoots);

  for (const tbKey of Object.keys(titleBlockMap)) {
    await resolveConstructDependencies(
      titleBlockMap[tbKey],
      titleBlockDirs[tbKey] ?? fallbackDir,
      host,
      constructState,
      onConstructLoaded
    );
  }
}

/**
 * Parses a DAC JSON document and resolves all nested dependencies (sheets, viewports, titleblocks, constructs).
 */
export async function parseAndLoadDacDocument(
  text: string,
  filePath: string,
  host: ConstructResolverHost
): Promise<LoadedDacDocument | null> {
  try {
    const doc = JSON.parse(text);
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;

    const canonicalFilePath = path.resolve(filePath);
    const baseDir = path.dirname(canonicalFilePath);
    const constructState = createConstructResolutionState();
    const onConstructLoaded = (cDoc: any, cDir: string) =>
      resolveLocalImages(cDoc, cDir, host.workspaceRoots);

    if (doc.type === 'CAD::Project') {
      const ds = doc as ProjectDocument;
      const viewportsMap: Record<string, any> = {};
      const titleBlockMap: Record<string, any> = {};
      const titleBlockDirs: Record<string, string> = {};

      if (typeof ds.defaultTitleBlockRef === 'string') {
        loadTitleBlock(ds.defaultTitleBlockRef, baseDir, host.workspaceRoots, titleBlockMap, titleBlockDirs);
      }

      if (Array.isArray(ds.sheets)) {
        for (let i = 0; i < ds.sheets.length; i++) {
          let sheet = ds.sheets[i];
          let sheetBaseDir = baseDir;

          if (typeof sheet === 'string') {
            try {
              const sheetPath = resolveDacPath(sheet, baseDir, host.workspaceRoots);
              if (sheetPath) {
                sheetBaseDir = path.dirname(sheetPath);
                const sheetContent = fs.readFileSync(sheetPath, 'utf8');
                sheet = JSON.parse(sheetContent) as SheetDocument;
                ds.sheets[i] = sheet;
              } else {
                console.error('Failed to locate sheet:', sheet);
                continue;
              }
            } catch {
              console.error('Failed to load sheet:', sheet);
              continue;
            }
          }

          if (sheet && typeof sheet !== 'string') {
            await resolveSheetDependencies(
              sheet,
              sheetBaseDir,
              host,
              viewportsMap,
              titleBlockMap,
              titleBlockDirs,
              constructState
            );
          }
        }
      }

      await resolveTitleBlockConstructs(titleBlockMap, titleBlockDirs, baseDir, host, constructState);

      return {
        doc: ds,
        viewportsMap,
        titleBlockMap,
        constructsMap: Object.fromEntries(constructState.constructsMap.entries()),
        resolvedConstructPaths: constructState.resolvedPaths,
      };
    }

    if (doc.type === 'CAD::SheetConfiguration') {
      const viewportsMap: Record<string, any> = {};
      const titleBlockMap: Record<string, any> = {};
      const titleBlockDirs: Record<string, string> = {};

      await resolveSheetDependencies(
        doc,
        baseDir,
        host,
        viewportsMap,
        titleBlockMap,
        titleBlockDirs,
        constructState
      );

      await resolveTitleBlockConstructs(titleBlockMap, titleBlockDirs, baseDir, host, constructState);

      return {
        doc,
        viewportsMap,
        titleBlockMap,
        constructsMap: Object.fromEntries(constructState.constructsMap.entries()),
        resolvedConstructPaths: constructState.resolvedPaths,
      };
    }

    if (
      doc.type === 'CAD::Detail' ||
      doc.type === 'CAD::Construct' ||
      doc.type === 'CAD::TitleBlock' ||
      doc.geometry
    ) {
      resolveLocalImages(doc, baseDir, host.workspaceRoots);
      constructState.visitedFiles.add(canonicalFilePath);
      constructState.parsedCache.set(canonicalFilePath, doc);
      await resolveConstructDependencies(doc, baseDir, host, constructState, onConstructLoaded);

      return {
        doc,
        constructsMap: Object.fromEntries(constructState.constructsMap.entries()),
        resolvedConstructPaths: constructState.resolvedPaths,
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to parse JSON:', err);
    return null;
  }
}
