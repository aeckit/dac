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
  
  // Load from local storage
  createEffect(() => {
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

  const addFile = (name: string) => {
    setFiles(prev => ({ ...prev, [name]: { type: 'CAD::Detail', version: '1.0', scale: '1:1', geometry: [] } }));
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

  const shareUrl = () => {
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(activeDoc()));
    return `${window.location.origin}${window.location.pathname}#${compressed}`;
  };

  return { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl };
}
