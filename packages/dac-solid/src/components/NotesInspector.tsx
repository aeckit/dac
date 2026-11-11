import { createMemo, For, Show } from 'solid-js';
import { inspectorStyles } from './inspectorStyles';
import {
  extractDocumentNotesAndMeta,
  extractElementNotesAndMeta,
  type ElementNotesSummary,
} from './notesUtils';

export interface NotesInspectorProps {
  mode: 'document' | 'element';
  doc?: () => any;
  shape?: () => any;
}

/**
 * Context-aware Notes & metadata summary panel for document-level and element-level inspection.
 */
export function NotesInspector(props: NotesInspectorProps) {
  const summary = createMemo(() => {
    if (props.mode === 'document') {
      return extractDocumentNotesAndMeta(props.doc?.());
    }
    return extractElementNotesAndMeta(props.shape?.());
  });

  const badge = () =>
    props.mode === 'element' ? (summary() as ElementNotesSummary).elementLabel : null;

  const hasContent = () =>
    summary().notes.length > 0 || summary().metadataEntries.length > 0;

  const emptyMessage = () =>
    props.mode === 'document'
      ? 'No notes defined for this detail.'
      : `No notes for ${(summary() as ElementNotesSummary).elementLabel}`;

  return (
    <div style={inspectorStyles.notesSection} data-notes-section={props.mode}>
      <div style={inspectorStyles.notesHeader}>
        <p style={{ ...inspectorStyles.sectionTitle, margin: 0 }}>Notes</p>
        <Show when={badge()}>
          {(label) => (
            <span style={inspectorStyles.notesBadge} title={label()} data-notes-badge="true">
              {label()}
            </span>
          )}
        </Show>
      </div>

      <Show
        when={hasContent()}
        fallback={<div style={inspectorStyles.notesEmpty}>{emptyMessage()}</div>}
      >
        <div style={inspectorStyles.notesCard}>
          <Show when={summary().metadataEntries.length > 0}>
            <div style={inspectorStyles.notesMetaList}>
              <For each={summary().metadataEntries}>
                {(entry) => (
                  <div style={inspectorStyles.notesMetaItem}>
                    <span style={inspectorStyles.notesMetaKey}>{entry.key}</span>
                    <span style={inspectorStyles.notesMetaValue}>{entry.value}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={summary().notes.length > 0}>
            <div style={summary().metadataEntries.length > 0 ? inspectorStyles.notesDivider : undefined}>
              <ul style={inspectorStyles.notesList}>
                <For each={summary().notes}>
                  {(note) => (
                    <li style={inspectorStyles.notesListItem}>
                      <span style={inspectorStyles.notesBullet}>•</span>
                      <span>{note}</span>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
