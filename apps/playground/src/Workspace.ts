import LZString from 'lz-string';
import type { SheetConfiguration, DetailDocument } from '@aeckit/core-solver';
import type { VisualizerDocument } from '@aeckit/ui-components';
const demoModules = import.meta.glob('./demo/*.json', { eager: true });
const defaultFiles: Record<string, any> = {};
for (const path in demoModules) {
  const fileName = path.split('/').pop();
  if (fileName) {
    defaultFiles[fileName] = (demoModules[path] as any).default;
  }
}

export type FileMap = Record<string, VisualizerDocument | SheetConfiguration>;

export class WorkspaceManager {
  private files: FileMap = {};
  public activeFilename: string | null = null;
  private onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  public async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const githubRepo = urlParams.get('github');
    
    if (githubRepo) {
      await this.loadFromGitHub(githubRepo);
    } else {
      this.loadFromHash();
    }
  }

  private async loadFromGitHub(inputRepo: string) {
    try {
      // Clean up URL if provided
      let repoStr = inputRepo.replace(/^https?:\/\/github\.com\//, '');
      const parts = repoStr.split('/').filter(Boolean);
      
      let repo = '';
      let branch = 'main';
      let subDir = '';

      if (parts.length >= 2) {
        repo = `${parts[0]}/${parts[1]}`;
      } else {
        throw new Error('Invalid repository format. Expected owner/repo.');
      }

      if (parts.length > 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
        branch = parts[3];
        subDir = parts.slice(4).join('/') + '/';
      } else if (parts.length > 2) {
        subDir = parts.slice(2).join('/') + '/';
      }

      // Dispatch an event so main.ts can show loading state
      window.dispatchEvent(new CustomEvent('github-import-start', { detail: { repo: inputRepo } }));

      // Fetch tree
      let treeUrl = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;
      let res = await fetch(treeUrl);
      
      if (res.status === 404 && branch === 'main') {
        // Fallback to master if default branch was assumed as main
        branch = 'master';
        treeUrl = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;
        res = await fetch(treeUrl);
      }
      
      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.tree) throw new Error('No tree found in repository');

      this.files = {};
      const allowedDirs = ['projects/', 'sheets/', 'details/', 'titleblocks/'];
      
      const filePromises = data.tree.map(async (item: any) => {
        if (item.type !== 'blob' || !item.path.endsWith('.json')) return;
        if (subDir && !item.path.startsWith(subDir)) return;
        
        const relativePath = subDir ? item.path.substring(subDir.length) : item.path;
        
        // Root directory or allowed subdirectories
        const isRoot = !relativePath.includes('/');
        const inAllowedDir = allowedDirs.some(dir => relativePath.startsWith(dir));
        
        if (isRoot || inAllowedDir) {
          const fetchUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${item.path}`;
          
          try {
            const fileRes = await fetch(fetchUrl);
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              this.files[relativePath] = fileData;
            }
          } catch (e) {
            console.error('Failed to fetch file', item.path, e);
          }
        }
      });

      await Promise.all(filePromises);

      const keys = Object.keys(this.files);
      if (keys.length === 0) {
        throw new Error('No valid JSON files found in allowed directories');
      }

      this.activeFilename = keys.find(k => this.files[k].type === 'CAD::Project') || keys[0];
      
      window.dispatchEvent(new CustomEvent('github-import-success'));
      const url = new URL(window.location.href);
      url.searchParams.delete('github');
      window.history.replaceState(null, '', url.toString());
      this.syncToLocalStorage();
      this.onChange();
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('github-import-error', { detail: { message: err.message } }));
      this.loadFromHash(); // fallback
      this.onChange();
    }
  }

  private loadFromStorageOrDefault() {
    try {
      const stored = localStorage.getItem('dac-workspace');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.files) {
          this.files = parsed.files;
          this.activeFilename = parsed.activeFilename || Object.keys(this.files)[0] || null;
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    
    // Default fallback
    this.files = JSON.parse(JSON.stringify(defaultFiles)); // Deep copy to avoid mutating the original
    this.activeFilename = 'demo-project.json';
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
            this.syncToLocalStorage();
            return;
          }
        }
      } catch (e) {
        console.error("Failed to parse URL hash:", e);
      }
    }
    
    this.loadFromStorageOrDefault();
  }

  public syncToLocalStorage() {
    const state = {
      files: this.files,
      activeFilename: this.activeFilename
    };
    try {
      localStorage.setItem('dac-workspace', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to sync to localStorage:', e);
    }
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
      this.syncToLocalStorage();
      this.onChange();
    }
  }

  public updateActiveFile(content: VisualizerDocument | SheetConfiguration) {
    if (this.activeFilename) {
      this.files[this.activeFilename] = content;
      this.syncToLocalStorage();
      this.onChange();
    }
  }

  public updateFile(filename: string, content: VisualizerDocument | SheetConfiguration) {
    if (this.files[filename]) {
      this.files[filename] = content;
      this.syncToLocalStorage();
      this.onChange();
    }
  }
  
  public updateActiveFileFromString(jsonString: string): { success: boolean, error?: string } {
    if (!this.activeFilename) return { success: false, error: 'No active file' };
    try {
      const parsed = JSON.parse(jsonString);
      this.files[this.activeFilename] = parsed;
      this.syncToLocalStorage();
      this.onChange();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

    public renameFile(oldName: string, newName: string) {
    if (this.files[oldName] && !this.files[newName]) {
      this.files[newName] = this.files[oldName];
      delete this.files[oldName];
      if (this.activeFilename === oldName) {
        this.activeFilename = newName;
      }
      this.syncToLocalStorage();
      this.onChange();
    }
  }

  public createFile(filename: string, content: VisualizerDocument | SheetConfiguration) {
    if (!this.files[filename]) {
      this.files[filename] = content;
      this.activeFilename = filename;
      this.syncToLocalStorage();
      this.onChange();
    }
  }
  
  public deleteFile(filename: string) {
    if (this.files[filename]) {
      delete this.files[filename];
      if (this.activeFilename === filename) {
        this.activeFilename = Object.keys(this.files)[0] || null;
      }
      this.syncToLocalStorage();
      this.onChange();
    }
  }

  public duplicateFile(filename: string) {
    if (this.files[filename]) {
      const newName = `copy-of-${filename}`;
      this.files[newName] = JSON.parse(JSON.stringify(this.files[filename]));
      this.activeFilename = newName;
      this.syncToLocalStorage();
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
      if (doc.type === 'CAD::TitleBlock' || doc.type === 'CAD::Detail') {
        map.set(name, doc as DetailDocument);
        map.set(`../${name}`, doc as DetailDocument);
      }
    }
    return map;
  }
}
