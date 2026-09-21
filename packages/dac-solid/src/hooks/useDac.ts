import { useContext } from 'solid-js';
import { DacContext } from '../context/DacContext';

export function useDac() {
  const context = useContext(DacContext);
  if (!context) {
    throw new Error('useDac must be used within a DacProvider');
  }

  const { doc, builder, selectionIds, setSelectionIds, zoom, setZoom, pan, setPan, activeSheetId, setActiveSheetId, nestedDocs, canvasTheme, triggerFitView, fitView } = context;

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
      case 'Text': newShape = b.addText(options); break;
      default:
        newShape = b.addShapeToTarget({ type, ...options });
        break;
    }
    if (newShape) {
      setSelectionIds([newShape.id]);
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
      const targetDoc = builder().getTargetDocument();
      if (!targetDoc) return null;
      let autoIndex = 0;
      const findShape = (items: any[]) => items?.find((g: any) => {
        const sid = g.componentId || 'shape_' + autoIndex++;
        return sid === ids[0];
      }) || null;

      if (targetDoc.geometry) return findShape(targetDoc.geometry);
      if (targetDoc.viewports) return findShape(targetDoc.viewports);
      if (targetDoc.titleblocks) return findShape(targetDoc.titleblocks);
      return null;
    } catch (e) {
      return null;
    }
  };

  return {
    doc,
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
    fitView
  };
}
