import LZString from 'lz-string';
import type { SheetDocument, DetailDocument } from '@aeckit/core-solver';
import type { VisualizerDocument } from '@aeckit/ui-components';
import { defaultFiles } from './default-files';

export type FileMap = Record<string, VisualizerDocument | SheetDocument>;

export class WorkspaceManager {
  private files: FileMap = {};
  public activeFilename: string | null = null;
  private onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
    this.loadFromHash();
  }

  private loadFromHash() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = LZString.decompressFromEncodedURIComponent(hash);
        if (decoded) {
          const parsed = JSON.parse(decoded);
          this.files = parsed.files || {};
          this.activeFilename = parsed.activeFilename || Object.keys(this.files)[0] || null;
          return;
        }
      } catch (e) {
        console.error("Failed to parse URL hash:", e);
      }
    }
    
    // Default fallback
    this.files = JSON.parse(JSON.stringify(defaultFiles)); // Deep copy to avoid mutating the original
    this.activeFilename = 'demo-drawing-set.json';
  }

  public syncToHash() {
    const state = {
      files: this.files,
      activeFilename: this.activeFilename
    };
    const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(state));
    window.history.replaceState(null, '', `#${encoded}`);
  }

  public getFiles(): FileMap {
    return this.files;
  }

  public getActiveFileContent(): VisualizerDocument | SheetDocument | null {
    if (!this.activeFilename) return null;
    return this.files[this.activeFilename];
  }
  
  public getActiveFileContentString(): string {
    const content = this.getActiveFileContent();
    return content ? JSON.stringify(content, null, 2) : '';
  }

  public setActiveFile(filename: string) {
    if (this.files[filename]) {
      this.activeFilename = filename;
      this.syncToHash();
      this.onChange();
    }
  }

  public updateActiveFile(content: VisualizerDocument | SheetDocument) {
    if (this.activeFilename) {
      this.files[this.activeFilename] = content;
      this.syncToHash();
      this.onChange();
    }
  }
  
  public updateActiveFileFromString(jsonString: string): { success: boolean, error?: string } {
    if (!this.activeFilename) return { success: false, error: 'No active file' };
    try {
      const parsed = JSON.parse(jsonString);
      this.files[this.activeFilename] = parsed;
      this.syncToHash();
      this.onChange();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  public createFile(filename: string, content: VisualizerDocument | SheetDocument) {
    if (!this.files[filename]) {
      this.files[filename] = content;
      this.activeFilename = filename;
      this.syncToHash();
      this.onChange();
    }
  }
  
  public deleteFile(filename: string) {
    if (this.files[filename]) {
      delete this.files[filename];
      if (this.activeFilename === filename) {
        this.activeFilename = Object.keys(this.files)[0] || null;
      }
      this.syncToHash();
      this.onChange();
    }
  }

  public getViewportsMap(): Map<string, DetailDocument> {
    const map = new Map<string, DetailDocument>();
    for (const [name, doc] of Object.entries(this.files)) {
      if (doc.type === 'CAD::Detail') {
        map.set(name, doc as DetailDocument);
        map.set(`../${name}`, doc as DetailDocument);
      }
    }
    return map;
  }

  public getTitleBlockMap(): Map<string, DetailDocument> {
    const map = new Map<string, DetailDocument>();
    for (const [name, doc] of Object.entries(this.files)) {
      if (doc.type === 'CAD::Detail') {
        map.set(name, doc as DetailDocument);
        map.set(`../${name}`, doc as DetailDocument);
      }
    }
    return map;
  }
}
