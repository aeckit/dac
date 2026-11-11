export interface MetadataSummaryEntry {
  key: string;
  value: string;
}

export interface DocumentNotesSummary {
  notes: string[];
  metadataEntries: MetadataSummaryEntry[];
}

export interface ElementNotesSummary {
  elementLabel: string;
  notes: string[];
  metadataEntries: MetadataSummaryEntry[];
}

export const PLACEHOLDER_DESCRIPTION = 'Parametric Drawing-as-Code architectural detail.';

export const ELEMENT_SUMMARY_FIELDS = ['description', 'spec', 'material', 'tag', 'comments'] as const;

export const ELEMENT_EXCLUDED_PROPERTY_KEYS = new Set<string>([
  'notes',
  'note',
  ...ELEMENT_SUMMARY_FIELDS,
]);

const DOCUMENT_EXCLUDED_META_KEYS = new Set<string>([
  'notes',
  'note',
  'description',
  'author',
  'category',
  'tags',
  'id',
  'title',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatPrimitive(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function formatTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  const formatted = tags
    .map((tag) => (typeof tag === 'string' || typeof tag === 'number' ? String(tag).trim() : ''))
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  return formatted.length > 0 ? formatted.join(' ') : null;
}

/**
 * Collects, trims, and deduplicates note strings across one or more string or string[] sources.
 */
export function collectNotes(...sources: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const addNote = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  };

  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const item of source) {
        addNote(item);
      }
    } else {
      addNote(source);
    }
  }

  return result;
}

/**
 * Extracts document-level notes and formatted metadata summary entries from a DAC document.
 */
export function extractDocumentNotesAndMeta(doc: any): DocumentNotesSummary {
  const notes = collectNotes(doc?.metadata?.notes, doc?.notes);
  const metadataEntries: MetadataSummaryEntry[] = [];

  const meta = isPlainObject(doc?.metadata) ? doc.metadata : null;
  if (!meta) {
    return { notes, metadataEntries };
  }

  const description = formatPrimitive(meta.description);
  if (description && description !== PLACEHOLDER_DESCRIPTION) {
    metadataEntries.push({ key: 'description', value: description });
  }

  const author = formatPrimitive(meta.author);
  if (author) {
    metadataEntries.push({ key: 'author', value: author });
  }

  const category = formatPrimitive(meta.category);
  if (category) {
    metadataEntries.push({ key: 'category', value: category });
  }

  const tags = formatTags(meta.tags);
  if (tags) {
    metadataEntries.push({ key: 'tags', value: tags });
  }

  for (const [key, rawVal] of Object.entries(meta)) {
    if (DOCUMENT_EXCLUDED_META_KEYS.has(key)) continue;
    const formatted = formatPrimitive(rawVal);
    if (formatted !== null) {
      metadataEntries.push({ key, value: formatted });
    }
  }

  return { notes, metadataEntries };
}

/**
 * Extracts element-level notes, identifier badge, and metadata summary entries from a selected shape.
 */
export function extractElementNotesAndMeta(shape: any): ElementNotesSummary {
  const elementLabel = String(shape?.componentId || shape?.type || 'Selected Element');
  const notes = collectNotes(
    shape?.notes,
    shape?.note,
    shape?.metadata?.notes,
    shape?.metadata?.note
  );

  const metadataEntries: MetadataSummaryEntry[] = [];
  const seenKeys = new Set<string>();

  if (isPlainObject(shape?.metadata)) {
    for (const [key, rawVal] of Object.entries(shape.metadata)) {
      if (key === 'notes' || key === 'note') continue;
      const formatted = formatPrimitive(rawVal);
      if (formatted !== null) {
        metadataEntries.push({ key, value: formatted });
        seenKeys.add(key);
      }
    }
  }

  if (isPlainObject(shape)) {
    for (const field of ELEMENT_SUMMARY_FIELDS) {
      if (seenKeys.has(field)) continue;
      const rawVal = shape[field];
      const formatted = Array.isArray(rawVal)
        ? rawVal.map(formatPrimitive).filter((v): v is string => v !== null).join(', ') || null
        : formatPrimitive(rawVal);
      if (formatted !== null) {
        metadataEntries.push({ key: field, value: formatted });
        seenKeys.add(field);
      }
    }
  }

  return { elementLabel, notes, metadataEntries };
}
