import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import * as monaco from 'monaco-editor';

export function MonacoJsonEditor(props: { value: string; onChange: (value: string) => void }) {
  let containerRef: HTMLDivElement | undefined;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  const [isTyping, setIsTyping] = createSignal(false);

  onMount(() => {
    if (!containerRef) return;
    editor = monaco.editor.create(containerRef, {
      value: props.value,
      language: 'json',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false }
    });

    const disposable = editor.onDidChangeModelContent(() => {
      if (editor?.hasTextFocus()) {
        setIsTyping(true);
        props.onChange(editor.getValue());
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
    if (editor && !isTyping()) {
      const current = editor.getValue();
      const next = props.value;
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
