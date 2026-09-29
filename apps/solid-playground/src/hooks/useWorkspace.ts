import { createSignal, createEffect } from 'solid-js';
import LZString from 'lz-string';

const DEMO_FILES = {
  'welcome-sheet.json': {
    type: 'CAD::Project',
    projectName: 'Playground Starter Guide',
    sheets: [
      {
        type: 'CAD::SheetConfiguration',
        sheetNumber: 'A101',
        sheetName: 'Welcome Guide',
        viewports: [
          {
            detail: 'guide-intro.json',
            x: 2, y: 20,
            scale: '1:1',
            detailNumber: '1',
            title: 'Welcome to aeckit DaC'
          },
          {
            detail: 'guide-json-editor.json',
            x: 2, y: 12,
            scale: '1:1',
            detailNumber: '2',
            title: 'Using the Editor'
          },
          {
            detail: 'guide-canvas.json',
            x: 2, y: 4,
            scale: '1:1',
            detailNumber: '3',
            title: 'Canvas Navigation'
          },
          {
            detail: 'guide-llm-prompt.json',
            x: 12, y: 12,
            scale: '1:1',
            detailNumber: '4',
            title: 'AI Generation Guide'
          }
        ]
      }
    ]
  },
  'guide-intro.json': {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1:1',
    geometry: [
      { type: 'Rectangle', x: 0, y: 0, width: 8, height: 4, fill: '#f0fdf4', color: '#16a34a' },
      { type: 'Text', x: 0.5, y: 3.2, text: 'Welcome to aeckit DaC Playground!', fontSize: 0.35, color: '#14532d' },
      { type: 'TextBox', x: 0.5, y: 2.2, width: 7, text: 'This is a Drawings-as-Code (DaC) environment where 2D structural and architectural details are defined purely by JSON. Everything you see is a live render of the text representation.', fontSize: 0.15, color: '#166534' }
    ]
  },
  'guide-json-editor.json': {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1:1',
    geometry: [
      { type: 'Rectangle', x: 0, y: 0, width: 8, height: 4, fill: '#eff6ff', color: '#2563eb' },
      { type: 'Text', x: 0.5, y: 3.2, text: 'The Inspector & JSON Editor', fontSize: 0.35, color: '#1e3a8a' },
      { type: 'TextBox', x: 0.5, y: 2.2, width: 7, text: 'On the right panel, you can view the active document.\n\n1. Use "Form" mode for a UI-based inspector.\n2. Use "JSON" mode to edit the raw underlying schema.\n\nChanges here instantly reflect on the canvas.', fontSize: 0.15, color: '#1e40af' }
    ]
  },
  'guide-canvas.json': {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1:1',
    geometry: [
      { type: 'Rectangle', x: 0, y: 0, width: 8, height: 4, fill: '#fdf4ff', color: '#c026d3' },
      { type: 'Text', x: 0.5, y: 3.2, text: 'Canvas Navigation', fontSize: 0.35, color: '#701a75' },
      { type: 'TextBox', x: 0.5, y: 2.2, width: 7, text: '- Middle Click & Drag: Pan around the canvas\n- Scroll Wheel: Zoom in and out\n- Top toolbar: Quick tools for fits and selection.', fontSize: 0.15, color: '#86198f' },
      { type: 'Leader', x: 6, y: 1, dx: 1, dy: -1, text: 'Try panning!', color: '#c026d3' }
    ]
  },
  'guide-llm-prompt.json': {
    type: 'CAD::Detail',
    version: '1.0',
    scale: '1:1',
    geometry: [
      { type: 'Rectangle', x: 0, y: -8, width: 16, height: 20, fill: '#fff7ed', color: '#ea580c' },
      { type: 'Text', x: 0.5, y: 11.2, text: 'AI Generation Prompt', fontSize: 0.35, color: '#9a3412' },
      { type: 'TextBox', x: 0.5, y: 10.2, width: 15, text: 'You can use LLMs (ChatGPT, Claude) to generate DaC JSON. Copy the prompt below:\n\nAct as an expert architectural drafter. Generate a 2D CAD drawing using the "Drawings-as-Code" (DaC) JSON schema.\n\nRules:\n1. Output ONLY valid JSON.\n2. Coordinate system is Cartesian: +X is Right, +Y is UP (bottom-left origin).\n\nRoot Structure:\n{\n  "type": "CAD::Detail",\n  "version": "1.0",\n  "scale": "1:1",\n  "geometry": []\n}\n\nAvailable Primitives:\n- Rectangle: x, y (bottom-left), width, height, fill, color\n- Line: x1, y1, x2, y2, color, strokeWidth\n- Circle: cx, cy, r, fill, color\n- Text: x, y, text, fontSize\n- TextBox: x, y, width, text\n- Dimension: x1, y1, x2, y2, offset\n- Leader: x, y (arrowhead), dx, dy (relative text offset), text\n\nTask: Draw a [INSERT DRAWING HERE]', fontSize: 0.16, color: '#9a3412' }
    ]
  }
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
