import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import * as monaco from 'monaco-editor';
import { useDac } from '@aeckit/dac-solid';

export function MonacoJsonEditor() {
  const { doc, builder } = useDac();
  let containerRef: HTMLDivElement | undefined;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  const [isTyping, setIsTyping] = createSignal(false);

  onMount(() => {
    if (!containerRef) return;
    editor = monaco.editor.create(containerRef, {
      value: JSON.stringify(doc() || {}, null, 2),
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false }
    });

    const disposable = editor.onDidChangeModelContent(() => {
      if (editor?.hasTextFocus()) {
        setIsTyping(true);
        try {
          const val = editor.getValue();
          const parsed = JSON.parse(val);
          builder().setDocument(parsed);
        } catch (e) {
          // invalid json, ignore
        }
      }
    });

    const blurDisposable = editor.onDidBlurEditorText(() => setIsTyping(false));

    onCleanup(() => {
      disposable.dispose();
      blurDisposable.dispose();
      editor?.dispose();
    });
  });

  createEffect(() => {
    const d = doc();
    if (editor && !isTyping()) {
      const current = editor.getValue();
      const next = JSON.stringify(d || {}, null, 2);
      if (current !== next) {
        // Prevent cursor jumping
        const position = editor.getPosition();
        editor.setValue(next);
        if (position) editor.setPosition(position);
      }
    }
  });

  return <div ref={containerRef} style={{ width: '100%', height: '100%', "min-height": '0' }} />;
}
