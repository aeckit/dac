import { createSignal, createEffect } from 'solid-js';
import LZString from 'lz-string';

const DEMO_FILES = {
  'DEMO-1.json': { type: 'CAD::Detail', geometry: [{ type: 'Rectangle', id: 'r1', x: 0, y: 0, width: 4, height: 2 }] },
  'DEMO-2.json': { type: 'CAD::Detail', geometry: [{ type: 'Circle', id: 'c1', x: 2, y: 2, radius: 2 }] }
};

export function useWorkspace() {
  const [files, setFiles] = createSignal<Record<string, any>>(DEMO_FILES);
  const [activeFileId, setActiveFileId] = createSignal<string>('DEMO-1.json');
  
  // Load from local storage
  createEffect(() => {
    const saved = localStorage.getItem('dac_workspace');
    if (saved) {
      try {
        setFiles(JSON.parse(saved));
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
    setFiles(prev => ({ ...prev, [name]: { type: 'CAD::Detail', geometry: [] } }));
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
