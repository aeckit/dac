import * as monaco from 'monaco-editor';
import type { WorkspaceManager } from '../Workspace';
import { getSubComponent, updateSubComponent } from '../utils/DocumentUtils';

export interface JsonEditorOptions {
  container: HTMLElement;
  workspace: WorkspaceManager;
  onUpdateVisualizer: () => void;
  getSelectedComponentIds: () => string[];
  getStatusPill: () => HTMLElement | null;
}

export class JsonEditorManager {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private isUpdatingEditor = false;
  private isEditingSubComponent = false;
  private currentSubComponentId: string | null = null;
  private currentSubComponentFilename: string | null = null;

  private options: JsonEditorOptions;

  constructor(options: JsonEditorOptions) {
    this.options = options;
    this.editor = monaco.editor.create(this.options.container, {
      value: this.options.workspace.getActiveFileContentString(),
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      formatOnType: true,
    });

    this.editor.onDidChangeModelContent(() => this.handleContentChange());
  }

  public getEditor() {
    return this.editor;
  }

  public layout() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  public updateEditor() {
    if (!this.editor) return;
    this.isUpdatingEditor = true;
    const currentVal = this.editor.getValue();
    
    const selectedIds = this.options.getSelectedComponentIds();
    let newVal = '';
    const { workspace } = this.options;
    
    if (selectedIds.length === 1) {
      const id = selectedIds[0];
      const doc = workspace.getActiveFileContent();
      let comp = getSubComponent(doc, id);
      let filename = workspace.activeFilename;
      
      if (!comp && doc?.type === 'CAD::Project') {
         const ds = doc as any;
         for (const sheetRef of ds.sheets || []) {
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
        this.isEditingSubComponent = true;
        this.currentSubComponentId = id;
        this.currentSubComponentFilename = filename;
      } else {
        newVal = workspace.getActiveFileContentString();
        this.isEditingSubComponent = false;
        this.currentSubComponentId = null;
        this.currentSubComponentFilename = null;
      }
    } else {
      newVal = workspace.getActiveFileContentString();
      this.isEditingSubComponent = false;
      this.currentSubComponentId = null;
      this.currentSubComponentFilename = null;
    }
  
    if (currentVal !== newVal) {
      this.editor.setValue(newVal);
    }
    this.isUpdatingEditor = false;
  }

  private handleContentChange() {
    if (this.isUpdatingEditor) return;
    const val = this.editor.getValue();
    const statusPill = this.options.getStatusPill();
    const { workspace, onUpdateVisualizer } = this.options;
    
    if (this.isEditingSubComponent && this.currentSubComponentId && this.currentSubComponentFilename) {
      try {
        const parsed = JSON.parse(val);
        const doc = workspace.getFiles()[this.currentSubComponentFilename];
        if (doc && updateSubComponent(doc, this.currentSubComponentId, parsed)) {
          workspace.updateActiveFile(workspace.getActiveFileContent()!);
          onUpdateVisualizer();
          if (statusPill) statusPill.style.display = 'none';
        }
      } catch (e: any) {
        this.showError(statusPill, e.message);
      }
    } else {
      const result = workspace.updateActiveFileFromString(val);
      if (statusPill) {
        if (result.success) {
          statusPill.style.display = 'none';
        } else {
          this.showError(statusPill, result.error);
        }
      }
      if (result.success) {
        onUpdateVisualizer();
      }
    }
  }

  private showError(statusPill: HTMLElement | null, message?: string) {
    if (!statusPill) return;
    const firstLine = message ? message.split('\n')[0] : 'Unknown error';
    statusPill.style.display = 'flex';
    statusPill.innerHTML = '<span class="status-indicator" style="background-color: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5);"></span>JSON Error';
    statusPill.style.color = '#ef4444';
    statusPill.title = firstLine;
  }
}
