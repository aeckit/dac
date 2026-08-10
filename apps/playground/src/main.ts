import * as monaco from 'monaco-editor';
import * as uiComponents from '@aeckit/ui-components';
const { VisualizerUI } = uiComponents;
import type { VisualizerDocument, VisualizerUI as VisualizerUIType } from '@aeckit/ui-components';
import type { DetailDocument, SheetDocument, DrawingSetDocument } from '@aeckit/core-solver';
import { WorkspaceManager } from './Workspace';

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
const workspace = new WorkspaceManager(() => {
  renderFileList();
  updateEditor();
  updateVisualizer();
  updateActiveFileName();
});

let editor: monaco.editor.IStandaloneCodeEditor;
let uiInstance: VisualizerUIType | null = null;
let isUpdatingEditor = false;

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
  editor = monaco.editor.create(editorContainer, {
    value: workspace.getActiveFileContentString(),
    language: 'json',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    formatOnType: true,
  });

  editor.onDidChangeModelContent(() => {
    if (isUpdatingEditor) return;
    const val = editor.getValue();
    const result = workspace.updateActiveFileFromString(val);
    
    const statusPill = document.getElementById('json-validity-status');
    if (statusPill) {
      if (result.success) {
        statusPill.style.display = 'none';
      } else {
        const firstLine = result.error ? result.error.split('\\n')[0] : 'Unknown error';
        statusPill.style.display = 'flex';
        statusPill.innerHTML = '<span class="status-indicator" style="background-color: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5);"></span>JSON Error';
        statusPill.style.color = '#ef4444';
        statusPill.title = firstLine;
      }
    }

    if (result.success) {
      updateVisualizer();
    }
  });
}

function updateEditor() {
  if (!editor) return;
  isUpdatingEditor = true;
  const currentVal = editor.getValue();
  const newVal = workspace.getActiveFileContentString();
  if (currentVal !== newVal) {
    editor.setValue(newVal);
  }
  isUpdatingEditor = false;
}

// -----------------------------------------------------------------------------
// Setup Visualizer
// -----------------------------------------------------------------------------
function updateVisualizer() {
  const activeDoc = workspace.getActiveFileContent();
  if (!activeDoc) return;

  const files = workspace.getFiles();
  const viewportsMap = workspace.getViewportsMap();
  const titleBlockMap = workspace.getTitleBlockMap();

  let vizDoc: VisualizerDocument;
  if (activeDoc.type === 'CAD::DrawingSet') {
    vizDoc = {
      ...activeDoc,
      sheets: (activeDoc as DrawingSetDocument).sheets.map(s => {
        if (typeof s === 'string') {
          // Resolve string paths like "sheets/S-101.json"
          return (files[s] || files[s.replace('sheets/', '')]) as SheetDocument;
        }
        return s as SheetDocument;
      }).filter(Boolean)
    } as DrawingSetDocument;
  } else {
    vizDoc = activeDoc as VisualizerDocument;
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
        updateEditor();
      },
      viewportsMap,
      titleBlockMap
    );

    // After instantiation, detach the Drawing Inspector and move to tabs
    const leftSidebar = visualizerContainer.querySelector('#left-sidebar');
    const tabInspector = document.getElementById('tab-content-inspector');
    if (leftSidebar && tabInspector) {
      // Remove border and ensure it fills the tab
      (leftSidebar as HTMLElement).style.width = '100%';
      (leftSidebar as HTMLElement).style.borderRight = 'none';
      tabInspector.appendChild(leftSidebar);
    }
  } else {
    uiInstance.updateConfig(vizDoc, viewportsMap, titleBlockMap);
  }
}

// -----------------------------------------------------------------------------
// File Manager UI
// -----------------------------------------------------------------------------
function renderFileList() {
  fileListEl.innerHTML = '';
  const files = workspace.getFiles();
  
  const groups: Record<string, string[]> = {
    'Drawing Sets': [],
    'Sheets': [],
    'Title Blocks': [],
    'Details': [],
    'Assets': ['test-image.jpg']
  };

  for (const filename of Object.keys(files)) {
    const doc = files[filename];
    if (doc.type === 'CAD::DrawingSet') {
      groups['Drawing Sets'].push(filename);
    } else if (doc.type === 'CAD::Sheet') {
      groups['Sheets'].push(filename);
    } else if (doc.type === 'CAD::Detail') {
      if (filename.toLowerCase().includes('title') || filename.toLowerCase().includes('tb')) {
        groups['Title Blocks'].push(filename);
      } else {
        groups['Details'].push(filename);
      }
    } else {
      groups['Details'].push(filename);
    }
  }

  for (const [groupName, filenames] of Object.entries(groups)) {
    if (filenames.length === 0) continue;

    const header = document.createElement('div');
    header.textContent = groupName;
    header.style.fontSize = '10px';
    header.style.textTransform = 'uppercase';
    header.style.color = '#94a3b8';
    header.style.padding = '12px 12px 4px 12px';
    header.style.fontWeight = 'bold';
    header.style.letterSpacing = '0.5px';
    fileListEl.appendChild(header);

    for (const filename of filenames) {
      if (groupName === 'Assets') {
        const li = document.createElement('li');
        li.className = 'file-item';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `🖼️  ${filename}`;
        li.appendChild(nameSpan);
        li.onclick = () => {
          showToast(`Asset reference: "${filename}"`);
        };
        fileListEl.appendChild(li);
        continue;
      }

      const li = document.createElement('li');
      li.className = 'file-item' + (filename === workspace.activeFilename ? ' active' : '');
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = filename;
      li.appendChild(nameSpan);

      const docContent = files[filename];

      const delBtn = document.createElement('span');
      delBtn.textContent = '×';
      delBtn.style.color = '#ff6b6b';
      delBtn.style.marginLeft = '8px';
      delBtn.style.cursor = 'pointer';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        workspace.deleteFile(filename);
      };

      const isDetail = docContent?.type === 'CAD::Detail';
      if (isDetail) {
        const addBtn = document.createElement('span');
        addBtn.textContent = '+';
        addBtn.style.color = '#4ade80';
        addBtn.style.marginLeft = 'auto';
        addBtn.style.marginRight = '8px';
        addBtn.style.cursor = 'pointer';
        addBtn.title = 'Insert into active sheet';
        addBtn.onclick = (e) => {
          e.stopPropagation();
          if (uiInstance && uiInstance.getActiveSheet()) {
            uiInstance.insertViewport(filename);
          } else {
            showToast('Open a Sheet or Drawing Set first to insert this detail.');
          }
        };
        li.appendChild(addBtn);
      } else {
        delBtn.style.marginLeft = 'auto'; // push delete button to right if no add button
      }
      
      li.appendChild(delBtn);

      li.onclick = () => {
        const isJson = tabContentJson?.classList.contains('active');
        workspace.setActiveFile(filename);
        if (isJson) tabBtnJson?.click();
      };

      fileListEl.appendChild(li);
    }
  }
}

function updateActiveFileName() {
  activeFilenameEl.textContent = workspace.activeFilename || 'No file selected';
}

function getUniqueName(base: string) {
  let name = base + '.json';
  let i = 1;
  const files = workspace.getFiles();
  while (files[name]) {
    name = `${base}-${i}.json`;
    i++;
  }
  return name;
}

document.getElementById('btn-new-detail')?.addEventListener('click', () => {
  const doc: DetailDocument = {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1"=1\'-0"',
    geometry: []
  };
  workspace.createFile(getUniqueName('detail'), doc);
});

document.getElementById('btn-new-sheet')?.addEventListener('click', () => {
  const doc: SheetDocument = {
    type: 'CAD::Sheet',
    sheetNumber: 'A101',
    sheetName: 'New Sheet',
    paperSize: 'Arch D',
    viewports: []
  };
  workspace.createFile(getUniqueName('sheet'), doc);
});

document.getElementById('btn-new-set')?.addEventListener('click', () => {
  const doc: DrawingSetDocument = {
    type: 'CAD::DrawingSet',
    project: 'New Project',
    sheets: []
  };
  workspace.createFile(getUniqueName('project'), doc);
});

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
    if (editor) {
      editor.layout();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      paneResizer.classList.remove('resizing');
      document.body.style.cursor = '';
      if (editor) {
        editor.layout();
      }
    }
  });
}

// -----------------------------------------------------------------------------
// General UI Actions
// -----------------------------------------------------------------------------
// Tab logic for Right Pane
const tabBtnInspector = document.getElementById('tab-btn-inspector');
const tabBtnJson = document.getElementById('tab-btn-json');
const tabContentInspector = document.getElementById('tab-content-inspector');
const tabContentJson = document.getElementById('tab-content-json');

tabBtnInspector?.addEventListener('click', () => {
  tabBtnInspector.classList.add('active');
  tabBtnJson?.classList.remove('active');
  tabContentInspector?.classList.add('active');
  tabContentJson?.classList.remove('active');
});

tabBtnJson?.addEventListener('click', () => {
  tabBtnJson.classList.add('active');
  tabBtnInspector?.classList.remove('active');
  tabContentJson?.classList.add('active');
  tabContentInspector?.classList.remove('active');
  if (editor) {
    editor.layout();
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
    setTimeout(() => editor?.layout(), 200);
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
    setTimeout(() => editor?.layout(), 50);
  };

  window.addEventListener('dac-toggle-left-pane', toggleLeft);
  window.addEventListener('dac-toggle-right-pane', toggleRight);
}

// -----------------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------------
initEditor();
initPaneToggles();
renderFileList();
updateActiveFileName();
updateVisualizer();

// Handle window resize for Monaco
window.addEventListener('resize', () => {
  if (editor && editorContainer.classList.contains('visible')) {
    editor.layout();
  }
});
