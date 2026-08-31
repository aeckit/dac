import * as uiComponents from '@aeckit/ui-components';
const { VisualizerUI } = uiComponents;
import type { VisualizerDocument, VisualizerUI as VisualizerUIType } from '@aeckit/ui-components';
import type { ProjectDocument, SheetConfiguration, DetailDocument, TitleBlockDocument } from '@aeckit/core-solver';
import { WorkspaceManager } from './Workspace';
import { JsonEditorManager } from './managers/JsonEditorManager';
import { FileManagerUI } from './managers/FileManagerUI';
import { getUniqueName } from './utils/DocumentUtils';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

(window as any).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'json') {
      return new JsonWorker();
    }
    return new EditorWorker();
  }
};

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
let jsonEditor: JsonEditorManager | null = null;
let fileManager: FileManagerUI | null = null;
let uiInstance: VisualizerUIType | null = null;

const workspace = new WorkspaceManager(() => {
  fileManager?.render();
  jsonEditor?.updateEditor();
  updateVisualizer();
  if (activeFilenameEl) {
    activeFilenameEl.textContent = workspace.activeFilename || 'No file selected';
  }
});

// -----------------------------------------------------------------------------
// DOM Elements
// -----------------------------------------------------------------------------
const fileListEl = document.getElementById('file-list') as HTMLUListElement;
const activeFilenameEl = document.getElementById('active-filename') as HTMLSpanElement;
const editorContainer = document.getElementById('editor-container') as HTMLElement;
const visualizerContainer = document.getElementById('visualizer-container') as HTMLElement;
const toastEl = document.getElementById('toast') as HTMLElement;

// -----------------------------------------------------------------------------
// Setup Monaco Editor
// -----------------------------------------------------------------------------
function initEditor() {
  return new JsonEditorManager({
    container: editorContainer,
    workspace,
    onUpdateVisualizer: updateVisualizer,
    getSelectedComponentIds: () => uiInstance?.getSelectedComponentIds() || [],
    getStatusPill: () => document.getElementById('json-validity-status')
  });
}

// -----------------------------------------------------------------------------
// Setup Visualizer
// -----------------------------------------------------------------------------
let currentVisualizerFilename: string | null = null;
function updateVisualizer() {
  const activeDoc = workspace.getActiveFileContent();
  if (!activeDoc) return;

  const files = workspace.getFiles();
  const viewportsMap = workspace.getViewportsMap();
  const titleBlockMap = workspace.getTitleBlockMap();

  let vizDoc: VisualizerDocument;
  if (activeDoc.type === 'CAD::Project') {
    vizDoc = {
      ...activeDoc,
      sheets: (activeDoc as ProjectDocument).sheets.map(s => {
        if (typeof s === 'string') {
          // Resolve string paths like "sheets/S-101.json"
          return (files[s] || files[s.replace('sheets/', '')]) as SheetConfiguration;
        }
        return s as SheetConfiguration;
      }).filter(Boolean)
    } as ProjectDocument;
  } else {
    vizDoc = activeDoc as VisualizerDocument;
  }

  const sheetsMap = new Map<string, SheetConfiguration>();
  let parentProject: ProjectDocument | null = null;
  for (const [k, v] of Object.entries(files)) {
    if (v.type === 'CAD::SheetConfiguration') {
      sheetsMap.set(k, v as SheetConfiguration);
    } else if (v.type === 'CAD::Project') {
      const proj = v as ProjectDocument;
      if (activeDoc.type === 'CAD::SheetConfiguration') {
        const hasSheet = proj.sheets.some(s => s === workspace.activeFilename || (typeof s === 'object' && s.sheetName === (activeDoc as SheetConfiguration).sheetName));
        if (hasSheet) parentProject = proj;
      }
    }
  }

  if (!uiInstance) {
    uiInstance = new VisualizerUI(
      visualizerContainer,
      vizDoc,
      (newDoc, viewportsMap, titleBlockMap) => {
        if (viewportsMap) {
          viewportsMap.forEach((vDoc, path) => {
            const files = workspace.getFiles();
            if (files[path]) {
              files[path] = vDoc;
            } else if (files[`details/${path}`]) {
              files[`details/${path}`] = vDoc;
            }
          });
        }
        if (titleBlockMap) {
          titleBlockMap.forEach((tbDoc, path) => {
            const files = workspace.getFiles();
            if (files[path]) {
              files[path] = tbDoc;
            }
          });
        }
        workspace.updateActiveFile(newDoc);
        jsonEditor?.updateEditor();
      },
      viewportsMap,
      titleBlockMap,
      { 
        sheetsMap, 
        parentProject: parentProject || undefined,
        onSelectionChange: () => {
          jsonEditor?.updateEditor();
        }
      }
    );

    // After instantiation, detach the Drawing Inspector and move to tabs
    const leftSidebar = visualizerContainer.querySelector('#left-sidebar');
    const tabInspector = document.getElementById('tab-content-inspector');
    if (leftSidebar && tabInspector) {
      // Remove border and ensure it fills the tab
      (leftSidebar as HTMLElement).style.width = '100%';
      (leftSidebar as HTMLElement).style.borderRight = 'none';
      tabInspector.innerHTML = ''; // Clear any persisting placeholder messages
      tabInspector.appendChild(leftSidebar);
    }
  } else {
    // If selection changed previously, updateConfig might re-render. Make sure to hook onSelectionChange if we didn't recreate it
    if ((uiInstance as any).options) {
      (uiInstance as any).options.onSelectionChange = () => jsonEditor?.updateEditor();
    }
    uiInstance.updateConfig(vizDoc, viewportsMap, titleBlockMap, sheetsMap, parentProject);
    if (currentVisualizerFilename !== workspace.activeFilename) {
      uiInstance.resetView(); // Auto-deselect and re-center on file switch
    }
  }
  
  currentVisualizerFilename = workspace.activeFilename;
}

function initFileManager() {
  return new FileManagerUI({
    container: fileListEl,
    workspace,
    onFileSelect: (filename: string) => {
      workspace.setActiveFile(filename);
      if (toggleJson?.checked) toggleJson.dispatchEvent(new Event('change'));
    },
    onInsertDetail: (filename: string) => {
      if (uiInstance && uiInstance.getActiveSheet()) {
        uiInstance.insertViewport(filename);
      } else {
        showToast('Open a Sheet or Drawing Set first to insert this detail.');
      }
    },
    onNewProject: () => {
      const doc: ProjectDocument = {
        type: 'CAD::Project',
        projectName: 'New Project',
        sheets: []
      };
      workspace.createFile(getUniqueName('project', () => workspace.getFiles()), doc);
      if (toggleJson?.checked) toggleJson.dispatchEvent(new Event('change'));
    },
    onNewSheet: (projectFilename: string) => {
      const doc: SheetConfiguration = {
        type: 'CAD::SheetConfiguration',
        sheetNumber: 'A101',
        sheetName: 'New Sheet',
        viewports: []
      };
      const newSheetName = getUniqueName('sheet', () => workspace.getFiles());
      workspace.createFile(newSheetName, doc);
      
      const projDoc = workspace.getFiles()[projectFilename] as any;
      if (projDoc && projDoc.sheets) {
        projDoc.sheets.push(newSheetName);
        workspace.updateFile(projectFilename, projDoc);
      }
      
      if (toggleJson?.checked) toggleJson.dispatchEvent(new Event('change'));
    },
    onNewTitleBlock: () => {
      const doc: TitleBlockDocument = {
        type: 'CAD::TitleBlock',
        version: '1.0',
        geometry: []
      };
      workspace.createFile(getUniqueName('titleblock', () => workspace.getFiles()), doc);
      if (toggleJson?.checked) toggleJson.dispatchEvent(new Event('change'));
    },
    onNewDetail: () => {
      const doc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0',
        scale: '1"=1\'-0"',
        geometry: []
      };
      workspace.createFile(getUniqueName('detail', () => workspace.getFiles()), doc);
      if (toggleJson?.checked) toggleJson.dispatchEvent(new Event('change'));
    }
  });
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Resizer Handle (Between Visualizer and Right Pane)
// -----------------------------------------------------------------------------
const paneResizer = document.getElementById('pane-resizer');
const workspacePane = document.getElementById('workspace-pane');
const rightPane = document.getElementById('right-pane');

if (paneResizer && workspacePane && rightPane) {
  let isResizing = false;

  paneResizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    paneResizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const paneRect = workspacePane.getBoundingClientRect();
    const newRightWidth = paneRect.right - e.clientX;
    const minWidth = 150;
    const maxWidth = paneRect.width - 150;
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newRightWidth));

    rightPane.style.flex = 'none';
    rightPane.style.width = `${clampedWidth}px`;
    jsonEditor?.layout();
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      paneResizer.classList.remove('resizing');
      document.body.style.cursor = '';
      jsonEditor?.layout();
    }
  });
}

// -----------------------------------------------------------------------------
// General UI Actions
// -----------------------------------------------------------------------------
// Toggle logic for Right Pane
const toggleJson = document.getElementById('toggle-json') as HTMLInputElement;
const tabContentInspector = document.getElementById('tab-content-inspector');
const tabContentJson = document.getElementById('tab-content-json');

toggleJson?.addEventListener('change', () => {
  if (toggleJson.checked) {
    tabContentJson?.classList.add('active');
    tabContentInspector?.classList.remove('active');
    jsonEditor?.layout();
  } else {
    tabContentInspector?.classList.add('active');
    tabContentJson?.classList.remove('active');
  }
});

function showToast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
}

document.getElementById('btn-share')?.addEventListener('click', async () => {
  workspace.syncToHash();
  const longUrl = window.location.href;
  
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (response.ok) {
      const shortUrl = await response.text();
      await navigator.clipboard.writeText(shortUrl);
      showToast('Short URL copied to clipboard!');
    } else {
      throw new Error('TinyURL failed');
    }
  } catch (err) {
    // Fallback
    await navigator.clipboard.writeText(longUrl);
    showToast('Long URL copied to clipboard!');
  }
});

// -----------------------------------------------------------------------------
// Pane Collapse / Expand Toggles
// -----------------------------------------------------------------------------
function initPaneToggles() {
  const fileManager = document.getElementById('file-manager');
  const rightPane = document.getElementById('right-pane');
  const paneResizer = document.getElementById('pane-resizer');

  const toggleLeft = () => {
    fileManager?.classList.toggle('collapsed');
    const btnToggleLeft = document.getElementById('btn-toggle-left-pane');
    const isCollapsed = fileManager?.classList.contains('collapsed');
    if (btnToggleLeft) {
      btnToggleLeft.classList.toggle('collapsed', isCollapsed);
      btnToggleLeft.title = isCollapsed ? 'Expand Left Sidebar' : 'Collapse Left Sidebar';
    }
    setTimeout(() => jsonEditor?.layout(), 200);
  };

  const toggleRight = () => {
    rightPane?.classList.toggle('collapsed');
    paneResizer?.classList.toggle('collapsed');
    const btnToggleRight = document.getElementById('btn-toggle-right-pane');
    const isCollapsed = rightPane?.classList.contains('collapsed');
    if (btnToggleRight) {
      btnToggleRight.classList.toggle('collapsed', isCollapsed);
      btnToggleRight.title = isCollapsed ? 'Expand Inspector/JSON' : 'Collapse Inspector/JSON';
    }
    setTimeout(() => jsonEditor?.layout(), 50);
  };

  window.addEventListener('dac-toggle-left-pane', toggleLeft);
  window.addEventListener('dac-toggle-right-pane', toggleRight);
  window.addEventListener('dac-open-file', ((e: CustomEvent) => {
    const filename = e.detail?.filename;
    if (filename && workspace.getFiles()[filename]) {
      workspace.setActiveFile(filename);
      jsonEditor?.updateEditor();
      if (toggleJson?.checked) toggleJson.dispatchEvent(new Event('change'));
    } else {
      showToast('File not found: ' + filename);
    }
  }) as EventListener);
}

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------
jsonEditor = initEditor();
initPaneToggles();

workspace.init().then(() => {
  fileManager = initFileManager();
  fileManager?.render();
  jsonEditor?.updateEditor();
  if (activeFilenameEl) {
    activeFilenameEl.textContent = workspace.activeFilename || 'No file selected';
  }
  updateVisualizer();
});

// GitHub Import UI listeners
document.getElementById('btn-import-github')?.addEventListener('click', () => {
  const repo = prompt('Enter public GitHub repository or URL (e.g., owner/repo or github.com/owner/repo/tree/main/path):');
  if (repo) {
    const url = new URL(window.location.href);
    url.searchParams.set('github', repo);
    window.location.href = url.toString();
  }
});

window.addEventListener('github-import-start', (e: any) => {
  showToast(`Fetching ${e.detail.repo} from GitHub...`);
});

window.addEventListener('github-import-success', () => {
  showToast('Successfully imported from GitHub!');
});

window.addEventListener('github-import-error', (e: any) => {
  showToast(`GitHub Import Failed: ${e.detail.message}`);
});

// Handle window resize for Monaco
window.addEventListener('resize', () => {
  if (editorContainer.classList.contains('visible')) {
    jsonEditor?.layout();
  }
});
