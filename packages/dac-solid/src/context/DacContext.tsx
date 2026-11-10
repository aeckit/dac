import { createContext, createSignal, createEffect, createMemo, onCleanup, ParentComponent, Accessor, Setter } from 'solid-js';
import { JsonBuilder } from '@aeckit/dac-json-builder';
import { CadTheme } from '@aeckit/dac-renderer-svg';

export interface DacContextValue {
  doc: Accessor<any>;
  effectiveDoc: Accessor<any>;
  nestedDocs: Accessor<Map<string, any> | undefined>;
  builder: Accessor<JsonBuilder>;
  selectionIds: Accessor<string[]>;
  setSelectionIds: Setter<string[]>;
  activeSheetId: Accessor<string | null>;
  setActiveSheetId: Setter<string | null>;
  zoom: Accessor<number>;
  setZoom: Setter<number>;
  pan: Accessor<{x: number, y: number}>;
  setPan: Setter<{x: number, y: number}>;
  canvasTheme: Accessor<CadTheme | undefined>;
  triggerFitView: Accessor<number>;
  fitView: () => void;
  solverWarnings: Accessor<any[]>;
  setSolverWarnings: Setter<any[]>;

  // Playback state and actions
  playbackStep: Accessor<number | null>;
  setPlaybackStep: Setter<number | null>;
  isPlaying: Accessor<boolean>;
  setIsPlaying: Setter<boolean>;
  playbackSpeed: Accessor<number>;
  setPlaybackSpeed: Setter<number>;
  isLooping: Accessor<boolean>;
  setIsLooping: Setter<boolean>;
  totalPlaybackSteps: Accessor<number>;
  currentPlaybackElement: Accessor<any | null>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  resetPlayback: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekPlayback: (step: number) => void;
}

export const DacContext = createContext<DacContextValue>();

export interface DacProviderProps {
  doc: any;
  nestedDocs?: Map<string, any>;
  onChange?: (doc: any, nestedDocs?: Map<string, any>, isTransient?: boolean) => void;
  canvasTheme?: CadTheme;
}

export const DacProvider: ParentComponent<DacProviderProps> = (props) => {
  const [docSignal, setDocSignal] = createSignal<any>(props.doc, { equals: false });
  const [nestedDocsSignal, setNestedDocsSignal] = createSignal<Map<string, any> | undefined>(props.nestedDocs, { equals: false });
  const [canvasThemeSignal, setCanvasThemeSignal] = createSignal<CadTheme | undefined>(props.canvasTheme);
  const [builderSignal] = createSignal<JsonBuilder>(new JsonBuilder());
  const [selectionIds, setSelectionIds] = createSignal<string[]>([]);
  const [activeSheetId, setActiveSheetId] = createSignal<string | null>(null);
  const [zoom, setZoom] = createSignal<number>(1);
  const [pan, setPan] = createSignal<{x: number, y: number}>({ x: 0, y: 0 });
  const [triggerFitView, setTriggerFitView] = createSignal<number>(0);
  const [solverWarnings, setSolverWarnings] = createSignal<any[]>([]);

  // Playback signals
  const [playbackStep, setPlaybackStep] = createSignal<number | null>(null);
  const [isPlaying, setIsPlaying] = createSignal<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = createSignal<number>(1);
  const [isLooping, setIsLooping] = createSignal<boolean>(false);

  const fitView = () => setTriggerFitView(v => v + 1);

  const totalPlaybackSteps = createMemo(() => {
    const d = docSignal();
    if (d?.type !== 'CAD::Detail' || !Array.isArray(d?.geometry)) return 0;
    return d.geometry.length;
  });

  const effectiveDoc = createMemo(() => {
    const currentDoc = docSignal();
    const step = playbackStep();
    if (step === null || currentDoc?.type !== 'CAD::Detail' || !Array.isArray(currentDoc.geometry)) {
      return currentDoc;
    }
    return {
      ...currentDoc,
      geometry: currentDoc.geometry.slice(0, step)
    };
  });

  const currentPlaybackElement = createMemo(() => {
    const step = playbackStep();
    const currentDoc = docSignal();
    if (step === null || step <= 0 || currentDoc?.type !== 'CAD::Detail' || !Array.isArray(currentDoc.geometry)) {
      return null;
    }
    return currentDoc.geometry[step - 1] || null;
  });

  const play = () => {
    const total = totalPlaybackSteps();
    if (total === 0) return;
    setSelectionIds([]);
    setPlaybackStep(prev => (prev === null || prev >= total ? 0 : prev));
    setIsPlaying(true);
  };

  const pause = () => {
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying()) {
      pause();
    } else {
      play();
    }
  };

  const resetPlayback = () => {
    setIsPlaying(false);
    setPlaybackStep(null);
  };

  const stepForward = () => {
    setIsPlaying(false);
    const total = totalPlaybackSteps();
    if (total === 0) return;
    setPlaybackStep(prev => {
      const current = prev === null ? 0 : prev;
      return Math.min(total, current + 1);
    });
  };

  const stepBackward = () => {
    setIsPlaying(false);
    const total = totalPlaybackSteps();
    if (total === 0) return;
    setPlaybackStep(prev => {
      const current = prev === null ? total : prev;
      return Math.max(0, current - 1);
    });
  };

  const seekPlayback = (step: number) => {
    const total = totalPlaybackSteps();
    const clamped = Math.max(0, Math.min(total, Math.round(step)));
    setPlaybackStep(clamped);
  };

  // Playback timer ticker
  createEffect(() => {
    if (!isPlaying()) return;
    const total = totalPlaybackSteps();
    if (total === 0) {
      setIsPlaying(false);
      return;
    }

    const speed = playbackSpeed() || 1;
    const intervalMs = Math.max(100, Math.round(600 / speed));

    const timer = setInterval(() => {
      setPlaybackStep(prev => {
        const current = prev === null ? 0 : prev;
        if (current >= total) {
          if (isLooping()) {
            return 0;
          } else {
            setIsPlaying(false);
            return total;
          }
        }
        return current + 1;
      });
    }, intervalMs);

    onCleanup(() => clearInterval(timer));
  });

  // Reset playback if incoming doc prop changes
  createEffect(() => {
    props.doc;
    setIsPlaying(false);
    setPlaybackStep(null);
  });

  createEffect(() => {
    const b = builderSignal();
    b.setDocument(props.doc, props.nestedDocs, true);
    setDocSignal(props.doc);
    setNestedDocsSignal(props.nestedDocs);
  });

  createEffect(() => {
    const b = builderSignal();
    b.setActiveSheetId(activeSheetId());
  });

  createEffect(() => {
    const b = builderSignal();
    const handleChanged = (e: any) => {
      setDocSignal({ ...e.detail.document });
      setNestedDocsSignal(e.detail.nestedDocs ? new Map<string, any>(e.detail.nestedDocs) : undefined);
      if (props.onChange) {
        props.onChange(e.detail.document, e.detail.nestedDocs, e.detail.isTransient);
      }
    };
    b.addEventListener('document_changed', handleChanged);
    onCleanup(() => {
      b.removeEventListener('document_changed', handleChanged);
    });
  });

  createEffect(() => {
    setCanvasThemeSignal(props.canvasTheme);
  });

  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectionIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  const value: DacContextValue = {
    doc: docSignal,
    effectiveDoc,
    nestedDocs: nestedDocsSignal,
    builder: builderSignal,
    selectionIds,
    setSelectionIds,
    activeSheetId,
    setActiveSheetId,
    zoom,
    setZoom,
    pan,
    setPan,
    canvasTheme: canvasThemeSignal,
    triggerFitView,
    fitView,
    solverWarnings,
    setSolverWarnings,
    playbackStep,
    setPlaybackStep,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    isLooping,
    setIsLooping,
    totalPlaybackSteps,
    currentPlaybackElement,
    play,
    pause,
    togglePlay,
    resetPlayback,
    stepForward,
    stepBackward,
    seekPlayback
  };

  return (
    <DacContext.Provider value={value}>
      {props.children}
    </DacContext.Provider>
  );
};
