import LZString from 'lz-string';
import type { SheetConfiguration, DetailDocument } from '@aeckit/core-solver';
import type { VisualizerDocument } from '@aeckit/ui-components';
import { defaultFiles } from './default-files';

export type FileMap = Record<string, VisualizerDocument | SheetConfiguration>;

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
          // Invalidate old hashes that don't have the new demo file 'components-demo.json'
          if (!parsed.files || !parsed.files['components-demo.json']) {
            console.log("Old workspace hash detected. Clearing to load new demo files.");
            window.location.hash = '';
          } else {
            this.files = parsed.files;
            this.activeFilename = parsed.activeFilename || Object.keys(this.files)[0] || null;
            return;
          }
        }
      } catch (e) {
        console.error("Failed to parse URL hash:", e);
      }
    }
    
    // Default fallback
    this.files = JSON.parse(JSON.stringify(defaultFiles)); // Deep copy to avoid mutating the original
    this.activeFilename = 'demo-project.json';
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

  public getActiveFileContent(): VisualizerDocument | SheetConfiguration | null {
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
      this.onChange();
    }
  }

  public updateActiveFile(content: VisualizerDocument | SheetConfiguration) {
    if (this.activeFilename) {
      this.files[this.activeFilename] = content;
      this.onChange();
    }
  }
  
  public updateActiveFileFromString(jsonString: string): { success: boolean, error?: string } {
    if (!this.activeFilename) return { success: false, error: 'No active file' };
    try {
      const parsed = JSON.parse(jsonString);
      this.files[this.activeFilename] = parsed;
      this.onChange();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  public createFile(filename: string, content: VisualizerDocument | SheetConfiguration) {
    if (!this.files[filename]) {
      this.files[filename] = content;
      this.activeFilename = filename;
      this.onChange();
    }
  }
  
  public deleteFile(filename: string) {
    if (this.files[filename]) {
      delete this.files[filename];
      if (this.activeFilename === filename) {
        this.activeFilename = Object.keys(this.files)[0] || null;
      }
      this.onChange();
    }
  }

  public duplicateFile(filename: string) {
    if (this.files[filename]) {
      const newName = `copy-of-${filename}`;
      this.files[newName] = JSON.parse(JSON.stringify(this.files[filename]));
      this.activeFilename = newName;
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
