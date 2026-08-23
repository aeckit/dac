import * as monaco from 'monaco-editor';
import * as uiComponents from '@aeckit/ui-components';
const { VisualizerUI } = uiComponents;
import type { VisualizerDocument, VisualizerUI as VisualizerUIType } from '@aeckit/ui-components';
import type { DetailDocument, SheetConfiguration, ProjectDocument } from '@aeckit/core-solver';
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
let isEditingSubComponent = false;
let currentSubComponentId: string | null = null;
let currentSubComponentFilename: string | null = null;

function getSubComponent(doc: any, id: string): any {
  if (!doc) return null;
  if (doc.type === 'CAD::Detail' || doc.type === 'CAD::TitleBlock') {
    let autoIndex = 0;
    for (const g of doc.geometry || []) {
      const cid = g.componentId || `shape_${autoIndex++}`;
      if (cid === id) return g;
    }
  }
  if (doc.type === 'CAD::SheetConfiguration') {
    return doc.viewports?.find((v: any) => v.componentId === id);
  }
  if (doc.type === 'CAD::Project') {
    const ds = doc as any;
    if (Array.isArray(ds.sheets)) {
      for (const sheet of ds.sheets) {
        if (typeof sheet === 'object') {
          const v = sheet.viewports?.find((v: any) => v.componentId === id);
          if (v) return v;
        }
      }
    }
  }
  return null;
}

function updateSubComponent(doc: any, id: string, newComponent: any): boolean {
  if (!doc) return false;
  if (doc.type === 'CAD::Detail' || doc.type === 'CAD::TitleBlock') {
    let autoIndex = 0;
    const geom = doc.geometry || [];
    for (let i = 0; i < geom.length; i++) {
      const g = geom[i];
      const cid = g.componentId || `shape_${autoIndex++}`;
      if (cid === id) {
        geom[i] = newComponent;
        return true;
      }
    }
  }
  if (doc.type === 'CAD::SheetConfiguration') {
    const idx = doc.viewports?.findIndex((v: any) => v.componentId === id);
    if (idx !== undefined && idx !== -1) {
      doc.viewports[idx] = newComponent;
      return true;
    }
  }
  if (doc.type === 'CAD::Project') {
    const ds = doc as any;
    if (Array.isArray(ds.sheets)) {
      for (const sheet of ds.sheets) {
        if (typeof sheet === 'object') {
          const idx = sheet.viewports?.findIndex((v: any) => v.componentId === id);
          if (idx !== undefined && idx !== -1) {
            sheet.viewports[idx] = newComponent;
            return true;
          }
        }
      }
    }
  }
  return false;
}

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
    const statusPill = document.getElementById('json-validity-status');
    
    if (isEditingSubComponent && currentSubComponentId && currentSubComponentFilename) {
      try {
        const parsed = JSON.parse(val);
        const doc = workspace.getFiles()[currentSubComponentFilename];
        if (doc && updateSubComponent(doc, currentSubComponentId, parsed)) {
          // Trigger workspace update
          workspace.updateActiveFile(workspace.getActiveFileContent()!);
          updateVisualizer();
          
          if (statusPill) statusPill.style.display = 'none';
        }
      } catch (e: any) {
        if (statusPill) {
          const firstLine = e.message ? e.message.split('\n')[0] : 'Unknown error';
          statusPill.style.display = 'flex';
          statusPill.innerHTML = '<span class="status-indicator" style="background-color: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5);"></span>JSON Error';
          statusPill.style.color = '#ef4444';
          statusPill.title = firstLine;
        }
      }
    } else {
      const result = workspace.updateActiveFileFromString(val);
      
      if (statusPill) {
        if (result.success) {
          statusPill.style.display = 'none';
        } else {
          const firstLine = result.error ? result.error.split('\n')[0] : 'Unknown error';
          statusPill.style.display = 'flex';
          statusPill.innerHTML = '<span class="status-indicator" style="background-color: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5);"></span>JSON Error';
          statusPill.style.color = '#ef4444';
          statusPill.title = firstLine;
        }
      }

      if (result.success) {
        updateVisualizer();
      }
    }
  });
}

function updateEditor() {
  if (!editor) return;
  isUpdatingEditor = true;
  const currentVal = editor.getValue();
  
  const selectedIds = uiInstance?.getSelectedComponentIds() || [];
  let newVal = '';
  
  if (selectedIds.length === 1) {
    const id = selectedIds[0];
    const doc = workspace.getActiveFileContent();
    let comp = getSubComponent(doc, id);
    let filename = workspace.activeFilename;
    
    if (!comp && doc?.type === 'CAD::Project') {
       // Check if it's in a referenced sheet
       const ds = doc as ProjectDocument;
       // We can iterate over string sheets to find the component
       for (const sheetRef of ds.sheets) {
         if (typeof sheetRef === 'string') {
           const sheetDoc = workspace.getFiles()[sheetRef];
           comp = getSubComponent(sheetDoc, id);
           if (comp) {
             filename = sheetRef;
             break;
           }
         }
       }
    }
    
    if (comp) {
      newVal = JSON.stringify(comp, null, 2);
      isEditingSubComponent = true;
      currentSubComponentId = id;
      currentSubComponentFilename = filename;
    } else {
      newVal = workspace.getActiveFileContentString();
      isEditingSubComponent = false;
      currentSubComponentId = null;
      currentSubComponentFilename = null;
    }
  } else {
    newVal = workspace.getActiveFileContentString();
    isEditingSubComponent = false;
    currentSubComponentId = null;
    currentSubComponentFilename = null;
  }

  if (currentVal !== newVal) {
    editor.setValue(newVal);
  }
  isUpdatingEditor = false;
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
        updateEditor();
      },
      viewportsMap,
      titleBlockMap,
      { 
        sheetsMap, 
        parentProject: parentProject || undefined,
        onSelectionChange: () => {
          updateEditor();
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
      (uiInstance as any).options.onSelectionChange = () => updateEditor();
    }
    uiInstance.updateConfig(vizDoc, viewportsMap, titleBlockMap, sheetsMap, parentProject);
    if (currentVisualizerFilename !== workspace.activeFilename) {
      uiInstance.resetView(); // Auto-deselect and re-center on file switch
    }
  }
  
  currentVisualizerFilename = workspace.activeFilename;
}

// -----------------------------------------------------------------------------
// File Manager UI
// -----------------------------------------------------------------------------
function renderFileList() {
  fileListEl.innerHTML = '';
  const files = workspace.getFiles();
  
  const createDeleteButton = (filename: string) => {
    const delBtn = document.createElement('span');
    delBtn.textContent = '×';
    delBtn.style.color = '#ff6b6b';
    delBtn.style.marginLeft = '8px';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      workspace.deleteFile(filename);
    };
    return delBtn;
  };

  const renderSectionTitle = (title: string) => {
    const header = document.createElement('div');
    header.textContent = title;
    header.style.fontSize = '10px';
    header.style.textTransform = 'uppercase';
    header.style.color = '#94a3b8';
    header.style.padding = '12px 12px 4px 12px';
    header.style.fontWeight = 'bold';
    header.style.letterSpacing = '0.5px';
    fileListEl.appendChild(header);
  };

  const projects = Object.keys(files).filter(k => files[k].type === 'CAD::Project');
  const sheets = Object.keys(files).filter(k => files[k].type === 'CAD::SheetConfiguration');
  const titleBlocks = Object.keys(files).filter(k => files[k].type === 'CAD::TitleBlock');
  const details = Object.keys(files).filter(k => files[k].type === 'CAD::Detail');
  
  // Also collect any unclassified files
  const classified = new Set([...projects, ...sheets, ...titleBlocks, ...details]);
  const others = Object.keys(files).filter(k => !classified.has(k));
  details.push(...others);

  // Render Projects
  if (projects.length > 0) {
    renderSectionTitle('Projects');
    
    projects.forEach(projFile => {
      // 1) Render Project Item
      const li = document.createElement('li');
      li.className = 'file-item' + (projFile === workspace.activeFilename ? ' active' : '');
      li.style.fontWeight = 'bold';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = projFile;
      li.appendChild(nameSpan);
      
      const delBtn = createDeleteButton(projFile);
      delBtn.style.marginLeft = 'auto';
      li.appendChild(delBtn);
      
      li.onclick = () => {
        const isJson = tabContentJson?.classList.contains('active');
        workspace.setActiveFile(projFile);
        if (isJson) tabBtnJson?.click();
      };
      
      fileListEl.appendChild(li);

      // 2) Render Sheets under this Project
      const projDoc = files[projFile] as any;
      if (projDoc && Array.isArray(projDoc.sheets)) {
        projDoc.sheets.forEach((sheetRef: any) => {
          const sheetName = typeof sheetRef === 'string' ? sheetRef : sheetRef.sheetName; // Handle embedded vs referenced
          if (sheetName && files[sheetName]) {
            const sli = document.createElement('li');
            sli.className = 'file-item' + (sheetName === workspace.activeFilename ? ' active' : '');
            sli.style.paddingLeft = '24px'; // Indent under project
            sli.style.borderLeft = '1px solid #334155'; // Visual tree line
            
            const sNameSpan = document.createElement('span');
            sNameSpan.textContent = "↳ " + sheetName;
            sli.appendChild(sNameSpan);
            
            const sDelBtn = createDeleteButton(sheetName);
            sDelBtn.style.marginLeft = 'auto';
            sli.appendChild(sDelBtn);
            
            sli.onclick = () => {
              const isJson = tabContentJson?.classList.contains('active');
              workspace.setActiveFile(sheetName);
              if (isJson) tabBtnJson?.click();
            };
            fileListEl.appendChild(sli);
            
            // Remove it from the general "sheets" pool so it doesn't render twice
            const idx = sheets.indexOf(sheetName);
            if (idx > -1) sheets.splice(idx, 1);
          }
        });
      }
    });
  }

  // Render Unassigned Sheets (orphans)
  if (sheets.length > 0) {
    renderSectionTitle('Unassigned Sheets');
    
    sheets.forEach(sheetFile => {
      const li = document.createElement('li');
      li.className = 'file-item' + (sheetFile === workspace.activeFilename ? ' active' : '');
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = sheetFile;
      li.appendChild(nameSpan);
      
      const delBtn = createDeleteButton(sheetFile);
      delBtn.style.marginLeft = 'auto';
      li.appendChild(delBtn);
      
      li.onclick = () => {
        const isJson = tabContentJson?.classList.contains('active');
        workspace.setActiveFile(sheetFile);
        if (isJson) tabBtnJson?.click();
      };
      
      fileListEl.appendChild(li);
    });
  }

  // Render Title Blocks
  if (titleBlocks.length > 0) {
    renderSectionTitle('Title Blocks');
    
    titleBlocks.forEach(tbFile => {
      const li = document.createElement('li');
      li.className = 'file-item' + (tbFile === workspace.activeFilename ? ' active' : '');
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = tbFile;
      li.appendChild(nameSpan);
      
      const delBtn = createDeleteButton(tbFile);
      delBtn.style.marginLeft = 'auto';
      li.appendChild(delBtn);
      
      li.onclick = () => {
        const isJson = tabContentJson?.classList.contains('active');
        workspace.setActiveFile(tbFile);
        if (isJson) tabBtnJson?.click();
      };
      
      fileListEl.appendChild(li);
    });
  }

  // Render Details
  if (details.length > 0) {
    renderSectionTitle('Details');
    
    details.forEach(detFile => {
      const li = document.createElement('li');
      li.className = 'file-item' + (detFile === workspace.activeFilename ? ' active' : '');
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = detFile;
      li.appendChild(nameSpan);
      
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
          uiInstance.insertViewport(detFile);
        } else {
          showToast('Open a Sheet or Drawing Set first to insert this detail.');
        }
      };
      li.appendChild(addBtn);
      
      const delBtn = createDeleteButton(detFile);
      li.appendChild(delBtn);
      
      li.onclick = () => {
        const isJson = tabContentJson?.classList.contains('active');
        workspace.setActiveFile(detFile);
        if (isJson) tabBtnJson?.click();
      };
      
      fileListEl.appendChild(li);
    });
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
  const isJson = tabContentJson?.classList.contains('active');
  const doc: DetailDocument = {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1"=1\'-0"',
    geometry: []
  };
  workspace.createFile(getUniqueName('detail'), doc);
  if (isJson) tabBtnJson?.click();
});

document.getElementById('btn-new-sheet')?.addEventListener('click', () => {
  const isJson = tabContentJson?.classList.contains('active');
  const doc: SheetConfiguration = {
    type: 'CAD::SheetConfiguration',
    sheetNumber: 'A101',
    sheetName: 'New Sheet',
    viewports: []
  };
  workspace.createFile(getUniqueName('sheet'), doc);
  if (isJson) tabBtnJson?.click();
});

document.getElementById('btn-new-set')?.addEventListener('click', () => {
  const isJson = tabContentJson?.classList.contains('active');
  const doc: ProjectDocument = {
    type: 'CAD::Project',
    projectName: 'New Project',
    sheets: []
  };
  workspace.createFile(getUniqueName('project'), doc);
  if (isJson) tabBtnJson?.click();
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
  window.addEventListener('dac-open-file', ((e: CustomEvent) => {
    const filename = e.detail?.filename;
    if (filename && workspace.getFiles()[filename]) {
      const isJson = tabContentJson?.classList.contains('active');
      workspace.setActiveFile(filename);
      updateEditor();
      if (isJson) tabBtnJson?.click();
    } else {
      showToast('File not found: ' + filename);
    }
  }) as EventListener);
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
