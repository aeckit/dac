import { createContext, createSignal, createEffect, onCleanup, ParentComponent, Accessor, Setter } from 'solid-js';
import { JsonBuilder } from '@aeckit/dac-json-builder';

export interface DacContextValue {
  doc: Accessor<any>;
  nestedDocs: Accessor<Map<string, any> | undefined>;
  builder: Accessor<JsonBuilder>;
  selectionIds: Accessor<string[]>;
  setSelectionIds: Setter<string[]>;
  activeSheetId: Accessor<string | null>;
  setActiveSheetId: Setter<string | null>;
  zoom: Accessor<number>;
  setZoom: Setter<number>;
}

export const DacContext = createContext<DacContextValue>();

export interface DacProviderProps {
  doc: any;
  nestedDocs?: Map<string, any>;
  onChange?: (doc: any, nestedDocs?: Map<string, any>, isTransient?: boolean) => void;
}

export const DacProvider: ParentComponent<DacProviderProps> = (props) => {
  const [docSignal, setDocSignal] = createSignal<any>(props.doc);
  const [nestedDocsSignal, setNestedDocsSignal] = createSignal<Map<string, any> | undefined>(props.nestedDocs);
  const [builderSignal] = createSignal<JsonBuilder>(new JsonBuilder());
  const [selectionIds, setSelectionIds] = createSignal<string[]>([]);
  const [activeSheetId, setActiveSheetId] = createSignal<string | null>(null);
  const [zoom, setZoom] = createSignal<number>(1);

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
      setDocSignal(e.detail.document);
      setNestedDocsSignal(e.detail.nestedDocs);
      if (props.onChange) {
        props.onChange(e.detail.document, e.detail.nestedDocs, e.detail.isTransient);
      }
    };
    b.addEventListener('document_changed', handleChanged);
    onCleanup(() => {
      b.removeEventListener('document_changed', handleChanged);
    });
  });

  const value: DacContextValue = {
    doc: docSignal,
    nestedDocs: nestedDocsSignal,
    builder: builderSignal,
    selectionIds,
    setSelectionIds,
    activeSheetId,
    setActiveSheetId,
    zoom,
    setZoom
  };

  return (
    <DacContext.Provider value={value}>
      {props.children}
    </DacContext.Provider>
  );
};
