import * as monaco from 'monaco-editor';
import type { WorkspaceManager } from '../Workspace';

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
    
    const { workspace } = this.options;
    const content = workspace.getActiveFileContentString();
    
    if (currentVal !== content) {
      this.editor.setValue(content);
    }
    
    setTimeout(() => {
      this.isUpdatingEditor = false;
    }, 100);
  }

  private handleContentChange() {
    if (this.isUpdatingEditor || !this.editor) return;
    
    const { workspace, onUpdateVisualizer } = this.options;
    const val = this.editor.getValue();
    const statusPill = this.options.getStatusPill();
    
    try {
      JSON.parse(val); // validate json
      const res = workspace.updateActiveFileFromString(val);
      if (statusPill) {
        if (res.success) {
          statusPill.style.display = 'none';
        } else {
          this.showError(statusPill, res.error);
        }
      }
      if (res.success) {
        onUpdateVisualizer();
      }
    } catch (e: any) {
      this.showError(statusPill, e.message);
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
