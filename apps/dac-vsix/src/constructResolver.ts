import * as fs from 'fs';
import * as path from 'path';

export const DEFAULT_EXCLUDE_SEGMENTS = ['node_modules', '.git', 'dist'] as const;

export interface ConstructResolverHost {
  /** Workspace folder root paths (fsPath). */
  workspaceRoots: string[];
  /**
   * Optional async file search matching a relative glob pattern under `baseDir`.
   * Extension host wires this to `vscode.workspace.findFiles`; tests/Node default to filesystem traversal.
   */
  findFiles?: (
    baseDir: string,
    globPattern: string,
    excludeSegments: readonly string[]
  ) => Promise<string[]>;
}

export interface ConstructResolutionState {
  /** Resolved construct documents keyed by the exact `constructId` string from the referencing shape. */
  constructsMap: Map<string, any>;
  /** Canonical resolved file paths on disk (used for file-watcher tracking). */
  resolvedPaths: Set<string>;
  /** Visited `(resolvedBaseDir, constructId)` pairs to avoid duplicate lookups. */
  visitedPairs: Set<string>;
  /** Visited canonical file paths whose `geometry` has already been walked (cycle guard). */
  visitedFiles: Set<string>;
  /** Cache of parsed construct documents keyed by canonical file path. */
  parsedCache: Map<string, any>;
}

export function createConstructResolutionState(): ConstructResolutionState {
  return {
    constructsMap: new Map<string, any>(),
    resolvedPaths: new Set<string>(),
    visitedPairs: new Set<string>(),
    visitedFiles: new Set<string>(),
    parsedCache: new Map<string, any>(),
  };
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

export function isExistingFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function isExistingDirectory(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function isPathInsideOrEqual(targetPath: string, rootDir: string): boolean {
  const rel = path.relative(path.resolve(rootDir), path.resolve(targetPath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function hasExcludedSegment(relPosix: string, excludeSegments: readonly string[]): boolean {
  if (!relPosix) return false;
  const segments = relPosix.split('/');
  return segments.some((seg) => excludeSegments.includes(seg));
}

/**
 * Finds the deepest containing workspace root for `dirPath`, or `null` if outside all workspace roots.
 */
export function findContainingWorkspaceRoot(
  dirPath: string,
  workspaceRoots: readonly string[]
): string | null {
  const resolvedDir = path.resolve(dirPath);
  let bestRoot: string | null = null;

  for (const root of workspaceRoots) {
    const resolvedRoot = path.resolve(root);
    if (isPathInsideOrEqual(resolvedDir, resolvedRoot)) {
      if (!bestRoot || resolvedRoot.length > bestRoot.length) {
        bestRoot = resolvedRoot;
      }
    }
  }

  return bestRoot;
}

/**
 * Checks whether a relative POSIX file path matches a nested `<target>` suffix at segment boundaries.
 */
function matchesRelativeSuffix(relPosix: string, normalizedId: string): boolean {
  return relPosix === normalizedId || relPosix.endsWith(`/${normalizedId}`);
}

/**
 * Checks whether a relative POSIX file path falls under a `constructs/` directory matching `<target>`.
 */
function matchesConstructsGlob(relPosix: string, normalizedId: string): boolean {
  const marker = 'constructs/';
  if (relPosix.startsWith(marker)) {
    if (matchesRelativeSuffix(relPosix.slice(marker.length), normalizedId)) return true;
  }
  let idx = relPosix.indexOf(`/${marker}`);
  while (idx !== -1) {
    const rest = relPosix.slice(idx + 1 + marker.length);
    if (matchesRelativeSuffix(rest, normalizedId)) return true;
    idx = relPosix.indexOf(`/${marker}`, idx + 1);
  }
  return false;
}

/**
 * Node filesystem implementation of `findFiles` for nested construct glob patterns.
 */
export async function defaultFindFiles(
  baseDir: string,
  globPattern: string,
  excludeSegments: readonly string[] = DEFAULT_EXCLUDE_SEGMENTS
): Promise<string[]> {
  const resolvedBase = path.resolve(baseDir);
  if (!isExistingDirectory(resolvedBase)) return [];

  const isConstructsPattern = globPattern.startsWith('**/constructs/**/');
  const targetSuffix = isConstructsPattern
    ? globPattern.slice('**/constructs/**/'.length)
    : globPattern.startsWith('**/')
      ? globPattern.slice('**/'.length)
      : globPattern;

  const matches: string[] = [];
  const visitedDirs = new Set<string>();

  function walk(currentDir: string) {
    let realDir: string;
    try {
      realDir = fs.realpathSync(currentDir);
    } catch {
      return;
    }
    if (visitedDirs.has(realDir)) return;
    visitedDirs.add(realDir);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (excludeSegments.includes(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const relPosix = toPosix(path.relative(resolvedBase, fullPath));
        const matched = isConstructsPattern
          ? matchesConstructsGlob(relPosix, targetSuffix)
          : matchesRelativeSuffix(relPosix, targetSuffix);
        if (matched) {
          matches.push(fullPath);
        }
      }
    }
  }

  walk(resolvedBase);
  return matches;
}

interface RankedCandidate {
  fullPath: string;
  relPosix: string;
  segmentCount: number;
}

function compareRankedCandidates(a: RankedCandidate, b: RankedCandidate): number {
  if (a.segmentCount !== b.segmentCount) return a.segmentCount - b.segmentCount;
  if (a.relPosix.length !== b.relPosix.length) return a.relPosix.length - b.relPosix.length;
  if (a.relPosix < b.relPosix) return -1;
  if (a.relPosix > b.relPosix) return 1;
  return a.fullPath < b.fullPath ? -1 : a.fullPath > b.fullPath ? 1 : 0;
}

function pickBestCandidate(candidates: readonly string[], rootDir: string): string | null {
  const resolvedRoot = path.resolve(rootDir);
  const uniquePaths = new Set<string>();
  const ranked: RankedCandidate[] = [];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (uniquePaths.has(resolved)) continue;
    if (!isPathInsideOrEqual(resolved, resolvedRoot)) continue;

    const relPosix = toPosix(path.relative(resolvedRoot, resolved));
    if (hasExcludedSegment(relPosix, DEFAULT_EXCLUDE_SEGMENTS)) continue;
    if (!isExistingFile(resolved)) continue;

    uniquePaths.add(resolved);
    ranked.push({
      fullPath: resolved,
      relPosix,
      segmentCount: relPosix.split('/').length,
    });
  }

  if (ranked.length === 0) return null;
  ranked.sort(compareRankedCandidates);
  return ranked[0].fullPath;
}

function collectAncestorDirectories(docDir: string, containingRoot: string | null, hasWorkspaceRoots: boolean): string[] {
  const ancestors: string[] = [];
  let cur = path.resolve(docDir);

  while (true) {
    ancestors.push(cur);
    if (containingRoot && cur === containingRoot) {
      break;
    }
    if (!containingRoot && hasWorkspaceRoots) {
      // Document is outside all configured workspace folders; only check docDir itself before workspace fallback.
      break;
    }
    const parent = path.dirname(cur);
    if (parent === cur) {
      break;
    }
    cur = parent;
  }

  return ancestors;
}

/**
 * Resolves a `ConstructReference.constructId` to an on-disk file path using 3-step precedence:
 * 1. Exact / explicit path relative to `docDir`
 * 2. Nearest ancestor `constructs/` folder (direct path then nested subfolders) up to workspace root
 * 3. Workspace-wide `constructs/` fallback
 */
export async function resolveConstructFilePath(
  constructId: string,
  docDir: string,
  host: ConstructResolverHost
): Promise<string | null> {
  if (!constructId || typeof constructId !== 'string') return null;

  const resolvedDocDir = path.resolve(docDir);
  const normalizedId = constructId.replace(/\\/g, '/');
  const isExplicitRelativeOrAbsolute =
    normalizedId.startsWith('./') ||
    normalizedId.startsWith('../') ||
    normalizedId === '.' ||
    normalizedId === '..' ||
    path.isAbsolute(constructId);

  // 1. Exact / explicit path relative to the active document's directory
  const directCandidate = path.resolve(resolvedDocDir, constructId);
  if (isExistingFile(directCandidate)) {
    return directCandidate;
  }

  if (isExplicitRelativeOrAbsolute) {
    return null;
  }

  const findFiles = host.findFiles ?? defaultFindFiles;
  const containingRoot = findContainingWorkspaceRoot(resolvedDocDir, host.workspaceRoots);
  const ancestors = collectAncestorDirectories(
    resolvedDocDir,
    containingRoot,
    host.workspaceRoots.length > 0
  );

  // 2. Nearest ancestor constructs/ folder
  for (const ancestor of ancestors) {
    const ancestorConstructsDir = path.join(ancestor, 'constructs');
    if (!isExistingDirectory(ancestorConstructsDir)) continue;

    const directInConstructs = path.resolve(ancestorConstructsDir, constructId);
    if (isPathInsideOrEqual(directInConstructs, ancestorConstructsDir) && isExistingFile(directInConstructs)) {
      return directInConstructs;
    }

    const subfolderMatches = await findFiles(
      ancestorConstructsDir,
      `**/${normalizedId}`,
      DEFAULT_EXCLUDE_SEGMENTS
    );
    const best = pickBestCandidate(subfolderMatches, ancestorConstructsDir);
    if (best) return best;
  }

  // 3. Workspace-wide fallback across all workspace roots
  const allFallbackCandidates: { fullPath: string; wsRoot: string }[] = [];
  for (const wsRoot of host.workspaceRoots) {
    const resolvedRoot = path.resolve(wsRoot);
    if (!isExistingDirectory(resolvedRoot)) continue;

    const matches = await findFiles(
      resolvedRoot,
      `**/constructs/**/${normalizedId}`,
      DEFAULT_EXCLUDE_SEGMENTS
    );
    for (const m of matches) {
      const resolvedMatch = path.resolve(m);
      const relPosix = toPosix(path.relative(resolvedRoot, resolvedMatch));
      if (
        isPathInsideOrEqual(resolvedMatch, resolvedRoot) &&
        !hasExcludedSegment(relPosix, DEFAULT_EXCLUDE_SEGMENTS) &&
        matchesConstructsGlob(relPosix, normalizedId) &&
        isExistingFile(resolvedMatch)
      ) {
        allFallbackCandidates.push({ fullPath: resolvedMatch, wsRoot: resolvedRoot });
      }
    }
  }

  if (allFallbackCandidates.length === 0) return null;

  const uniqueByPath = new Map<string, RankedCandidate>();
  for (const item of allFallbackCandidates) {
    if (uniqueByPath.has(item.fullPath)) continue;
    const relPosix = toPosix(path.relative(item.wsRoot, item.fullPath));
    uniqueByPath.set(item.fullPath, {
      fullPath: item.fullPath,
      relPosix,
      segmentCount: relPosix.split('/').length,
    });
  }

  const ranked = Array.from(uniqueByPath.values()).sort(compareRankedCandidates);

  return ranked[0]?.fullPath ?? null;
}

/**
 * Recursively resolves all `ConstructReference` entries in `geomDoc.geometry`, storing parsed
 * construct documents in `state.constructsMap` under their exact `shape.constructId` key.
 */
export async function resolveConstructDependencies(
  geomDoc: any,
  baseDir: string,
  host: ConstructResolverHost,
  state: ConstructResolutionState,
  onConstructLoaded?: (constructDoc: any, constructDir: string) => void
): Promise<void> {
  if (!geomDoc || !Array.isArray(geomDoc.geometry)) return;

  const resolvedBaseDir = path.resolve(baseDir);

  for (const shape of geomDoc.geometry) {
    if (!shape || shape.type !== 'ConstructReference' || typeof shape.constructId !== 'string' || !shape.constructId) {
      continue;
    }

    const constructId: string = shape.constructId;
    const pairKey = `${resolvedBaseDir}\0${constructId}`;
    if (state.visitedPairs.has(pairKey)) {
      continue;
    }
    state.visitedPairs.add(pairKey);

    try {
      const resolvedPath = await resolveConstructFilePath(constructId, resolvedBaseDir, host);
      if (!resolvedPath) continue;

      const canonicalPath = path.resolve(resolvedPath);
      state.resolvedPaths.add(canonicalPath);

      let constructDoc = state.parsedCache.get(canonicalPath);
      if (constructDoc === undefined) {
        const content = fs.readFileSync(canonicalPath, 'utf8');
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          console.error(`Invalid construct document (expected JSON object): ${canonicalPath}`);
          continue;
        }
        constructDoc = parsed;
        onConstructLoaded?.(constructDoc, path.dirname(canonicalPath));
        state.parsedCache.set(canonicalPath, constructDoc);
      }

      if (!state.constructsMap.has(constructId)) {
        state.constructsMap.set(constructId, constructDoc);
      }

      if (!state.visitedFiles.has(canonicalPath)) {
        state.visitedFiles.add(canonicalPath);
        await resolveConstructDependencies(
          constructDoc,
          path.dirname(canonicalPath),
          host,
          state,
          onConstructLoaded
        );
      }
    } catch (err) {
      console.error('Failed to load construct:', constructId, err);
    }
  }
}
