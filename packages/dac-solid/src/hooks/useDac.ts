import { useContext } from 'solid-js';
import { DacContext } from '../context/DacContext';

export function useDac() {
  const context = useContext(DacContext);
  if (!context) {
    throw new Error('useDac must be used within a DacProvider');
  }

  const {
    doc,
    effectiveDoc,
    nestedDocs,
    builder,
    selectionIds,
    setSelectionIds,
    zoom,
    setZoom,
    pan,
    setPan,
    activeSheetId,
    setActiveSheetId,
    canvasTheme,
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
  } = context;

  const selectShape = (id: string, multi = false) => {
    if (multi) {
      setSelectionIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectionIds([id]);
    }
  };

  const clearSelection = () => setSelectionIds([]);

  const addShape = (type: string, options?: any) => {
    const b = builder();
    let newShape;
    switch (type) {
      case 'Rectangle': newShape = b.addRectangle(options); break;
      case 'Line': newShape = b.addLine(options); break;
      case 'Circle': newShape = b.addCircle(options); break;
      case 'Text': newShape = b.addText(options); break;
      case 'Leader': newShape = b.addLeader(options); break;
      case 'Dimension': newShape = b.addDimension(options); break;
      case 'Polyline': newShape = b.addPolyline(options?.points || [[0, 0], [4, 0], [4, 2]], options); break;
      default:
        newShape = b.addShapeToTarget({ type, ...options });
        break;
    }
    if (newShape) {
      setSelectionIds([newShape.componentId || newShape.id]);
    }
  };

  const updateShape = (id: string, properties: any, isTransient = false) => {
    builder().updateComponent(id, properties, isTransient);
  };

  const deleteShape = (id: string) => {
    builder().deleteComponent(id);
    setSelectionIds((prev: string[]) => prev.filter(i => i !== id));
  };

  const selectedShape = () => {
    const d = doc();
    const ids = selectionIds();
    if (!d || ids.length !== 1) return null;
    
    try {
      const targetDoc = d; // Use the properly evaluated doc() to support nested sheets!
      if (!targetDoc) return null;

      const findShape = (items: any[], prefix: string) => {
        let autoIndex = 0;
        for (const g of items || []) {
          const sid = g.componentId || `${prefix}${autoIndex++}`;
          if (sid === ids[0]) {
            return { ...g, componentId: sid };
          }
        }
        return null;
      };

      if (targetDoc.geometry) {
        const res = findShape(targetDoc.geometry, 'shape_');
        if (res) return res;
      }
      if (targetDoc.viewports) {
        const res = findShape(targetDoc.viewports, 'vp_');
        if (res) return { ...res, type: 'CAD::Viewport' };
      }
      if (targetDoc.titleblocks) {
        const res = findShape(targetDoc.titleblocks, 'tb_');
        if (res) return { ...res, type: 'CAD::TitleBlock' };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  return {
    doc,
    effectiveDoc,
    nestedDocs,
    builder,
    selectionIds,
    setSelectionIds,
    selectedShape,
    selectShape,
    clearSelection,
    addShape,
    updateShape,
    deleteShape,
    zoom,
    setZoom,
    pan,
    setPan,
    activeSheetId,
    setActiveSheetId,
    canvasTheme,
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
}

export function usePlayback() {
  const dac = useDac();
  return {
    step: dac.playbackStep,
    setStep: dac.setPlaybackStep,
    isPlaying: dac.isPlaying,
    speed: dac.playbackSpeed,
    setSpeed: dac.setPlaybackSpeed,
    isLooping: dac.isLooping,
    setIsLooping: dac.setIsLooping,
    totalSteps: dac.totalPlaybackSteps,
    currentElement: dac.currentPlaybackElement,
    effectiveDoc: dac.effectiveDoc,
    play: dac.play,
    pause: dac.pause,
    togglePlay: dac.togglePlay,
    reset: dac.resetPlayback,
    stepForward: dac.stepForward,
    stepBackward: dac.stepBackward,
    seekTo: dac.seekPlayback
  };
}
