import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import * as monaco from 'monaco-editor';

export function MonacoJsonEditor(props: { value: string; onChange: (value: string) => void; selectedId?: string }) {
  let containerRef: HTMLDivElement | undefined;
  const [editor, setEditor] = createSignal<monaco.editor.IStandaloneCodeEditor | undefined>();
  const [isTyping, setIsTyping] = createSignal(false);

  onMount(() => {
    if (!containerRef) return;
    const ed = monaco.editor.create(containerRef, {
      value: props.value,
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false }
    });
    setEditor(ed);

    const disposable = ed.onDidChangeModelContent(() => {
      if (ed.hasTextFocus()) {
        setIsTyping(true);
        props.onChange(ed.getValue());
      }
    });

    const blurDisposable = ed.onDidBlurEditorText(() => setIsTyping(false));

    onCleanup(() => {
      disposable.dispose();
      blurDisposable.dispose();
      ed.dispose();
    });
  });

  createEffect(() => {
    const ed = editor();
    if (ed && !isTyping()) {
      const current = ed.getValue();
      const next = props.value;
      if (current !== next) {
        // Prevent cursor jumping
        const position = ed.getPosition();
        ed.setValue(next);
        if (position) ed.setPosition(position);
      }
    }
  });

  createEffect(() => {
    const ed = editor();
    if (ed && props.selectedId) {
      const model = ed.getModel();
      if (!model) return;
      const matches = model.findMatches(`"componentId": "${props.selectedId}"`, false, false, false, null, true);
      if (matches.length > 0) {
        const match = matches[0];
        ed.revealLineInCenter(match.range.startLineNumber);
        ed.setSelection(match.range);
      }
    }
  });

  return <div ref={containerRef} style={{ width: '100%', height: '100%', "min-height": '0' }} />;
}
