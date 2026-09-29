import { createSignal, createEffect } from 'solid-js';
import LZString from 'lz-string';
import welcomeSheet from '../demo/welcome-sheet.json';
import guideIntro from '../demo/guide-intro.json';
import guideJsonEditor from '../demo/guide-json-editor.json';
import guideCanvas from '../demo/guide-canvas.json';
import guideLlmPrompt from '../demo/guide-llm-prompt.json';

const DEMO_FILES = {
  'welcome-sheet.json': welcomeSheet,
  'guide-intro.json': guideIntro,
  'guide-json-editor.json': guideJsonEditor,
  'guide-canvas.json': guideCanvas,
  'guide-llm-prompt.json': guideLlmPrompt
};

export function useWorkspace() {
  const [files, setFiles] = createSignal<Record<string, any>>(DEMO_FILES);
  const [activeFileId, setActiveFileId] = createSignal<string>('welcome-sheet.json');
  
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
