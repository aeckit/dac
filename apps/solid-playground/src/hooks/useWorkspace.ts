/// <reference types="vite/client" />
import { createSignal, createEffect } from 'solid-js';
import LZString from 'lz-string';

const modules = import.meta.glob('../demo/*.json', { eager: true });
const DEMO_FILES: Record<string, any> = {};

for (const path in modules) {
  const filename = path.split('/').pop();
  if (filename) {
    DEMO_FILES[filename] = (modules[path] as any).default;
  }
}

export function useWorkspace() {
  const [files, setFiles] = createSignal<Record<string, any>>(DEMO_FILES);
  const [activeFileId, setActiveFileId] = createSignal<string>('welcome-sheet.json');
  
  // Load from local storage or URL hash
  createEffect(() => {
    if (window.location.hash) {
      try {
        const hashPayload = window.location.hash.substring(1);
        const decompressed = LZString.decompressFromEncodedURIComponent(hashPayload);
        if (decompressed) {
          const parsed = JSON.parse(decompressed);
          setFiles(parsed);
          setActiveFileId(Object.keys(parsed)[0] || '');
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      } catch(e) {
        console.error("Failed to parse share URL");
      }
    }
    
    const saved = localStorage.getItem('dac_workspace');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFiles(parsed);
        if (!parsed[activeFileId()]) {
           setActiveFileId(Object.keys(parsed)[0] || '');
        }
      } catch(e) {}
    }
  });

  // Save to local storage
  createEffect(() => {
    localStorage.setItem('dac_workspace', JSON.stringify(files()));
  });

  const activeDoc = () => files()[activeFileId()];

  const updateActiveDoc = (doc: any) => {
    setFiles(prev => ({ ...prev, [activeFileId()]: doc }));
  };

  const addFile = (name: string, type: string = 'CAD::Detail') => {
    let defaultContent: any = { type, version: '1.0' };
    if (type === 'CAD::SheetConfiguration') {
      defaultContent = { ...defaultContent, paperSize: 'ARCH_D', viewports: [], titleblocks: [], geometry: [] };
    } else if (type === 'CAD::Project') {
      defaultContent = { ...defaultContent, sheets: [] };
    } else {
      defaultContent = { ...defaultContent, scale: '1:1', geometry: [] };
    }
    setFiles(prev => ({ ...prev, [name]: defaultContent }));
    setActiveFileId(name);
  };

  const deleteFile = (name: string) => {
    const newFiles = { ...files() };
    delete newFiles[name];
    setFiles(newFiles);
    if (activeFileId() === name) {
      setActiveFileId(Object.keys(newFiles)[0] || '');
    }
  };

  const shareUrl = (fileIds: string[]) => {
    const payload: Record<string, any> = {};
    fileIds.forEach(id => {
      if (files()[id]) payload[id] = files()[id];
    });
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    return `https://aeckit.github.io/dac/#${compressed}`;
  };

  return { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl };
}
