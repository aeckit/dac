import { describe, it, expect } from 'vitest';
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { DacProvider, DacInspector, useDac } from '../index';
import {
  collectNotes,
  extractDocumentNotesAndMeta,
  extractElementNotesAndMeta,
  PLACEHOLDER_DESCRIPTION,
} from '../components/notesUtils';

describe('@aeckit/dac-solid notesUtils unit tests', () => {
  it('collects and deduplicates notes from strings and arrays while ignoring blanks', () => {
    const result = collectNotes(
      '  First note  ',
      ['First note', 'Second note', '   ', null, 42],
      ['Second note', 'Third note']
    );

    expect(result).toEqual(['First note', 'Second note', 'Third note']);
  });

  it('extracts document notes and metadata properties while filtering excluded and placeholder values', () => {
    const doc = {
      type: 'CAD::Detail',
      version: '1.0',
      notes: ['Verify frost depth', 'Doc-level only note'],
      metadata: {
        id: 'detail-1',
        title: 'Slab Curb',
        description: PLACEHOLDER_DESCRIPTION,
        author: 'Jane Doe',
        category: 'Foundation',
        tags: ['concrete', '#curb', '  slab  ', ''],
        notes: ['Pour 4000 psi concrete', 'Verify frost depth'],
        note: 'Should not appear in metadata entries',
        revision: 3,
        stamped: true,
        nestedObj: { ignore: true },
      },
      geometry: [],
    };

    const summary = extractDocumentNotesAndMeta(doc);

    expect(summary.notes).toEqual([
      'Pour 4000 psi concrete',
      'Verify frost depth',
      'Doc-level only note',
    ]);

    expect(summary.metadataEntries).toEqual([
      { key: 'author', value: 'Jane Doe' },
      { key: 'category', value: 'Foundation' },
      { key: 'tags', value: '#concrete #curb #slab' },
      { key: 'revision', value: '3' },
      { key: 'stamped', value: 'true' },
    ]);
  });

  it('includes non-placeholder document description', () => {
    const summary = extractDocumentNotesAndMeta({
      type: 'CAD::Detail',
      metadata: {
        description: 'Exterior perimeter curb at slab-on-grade.',
      },
    });

    expect(summary.metadataEntries).toEqual([
      { key: 'description', value: 'Exterior perimeter curb at slab-on-grade.' },
    ]);
  });

  it('extracts element notes, badge, and metadata without duplicating metadata and shape fields', () => {
    const shape = {
      type: 'CAD::Shape::Rectangle',
      componentId: 'footing_stem',
      notes: ['Hold 3" clear cover', 'Inspect prior to pour'],
      note: 'Inspect prior to pour',
      description: 'Concrete stem wall',
      spec: 'ACI 318-19',
      material: '4000 psi Concrete',
      tag: 'F-1',
      comments: 'Coord with structural',
      metadata: {
        notes: ['From metadata', 'Hold 3" clear cover'],
        note: 'Single metadata note',
        material: 'Metadata Concrete Override',
        manufacturer: 'Generic',
        fireRatingHr: 2,
      },
    };

    const summary = extractElementNotesAndMeta(shape);

    expect(summary.elementLabel).toBe('footing_stem');
    expect(summary.notes).toEqual([
      'Hold 3" clear cover',
      'Inspect prior to pour',
      'From metadata',
      'Single metadata note',
    ]);
    expect(summary.metadataEntries).toEqual([
      { key: 'material', value: 'Metadata Concrete Override' },
      { key: 'manufacturer', value: 'Generic' },
      { key: 'fireRatingHr', value: '2' },
      { key: 'description', value: 'Concrete stem wall' },
      { key: 'spec', value: 'ACI 318-19' },
      { key: 'tag', value: 'F-1' },
      { key: 'comments', value: 'Coord with structural' },
    ]);
  });

  it('falls back element label to type or Selected Element', () => {
    expect(extractElementNotesAndMeta({ type: 'CAD::Shape::Line' }).elementLabel).toBe('CAD::Shape::Line');
    expect(extractElementNotesAndMeta({}).elementLabel).toBe('Selected Element');
  });
});

describe('@aeckit/dac-solid DacInspector component tests', () => {
  it('renders document Notes after Parameters and above Viewports/Title Block/Geometries with Geometries ordered last', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc = {
      type: 'CAD::SheetConfiguration',
      sheetNumber: 'A101',
      sheetName: 'Foundation Plan',
      titleBlockRef: 'titleblock.json',
      notes: 'Sheet-level note',
      metadata: {
        description: PLACEHOLDER_DESCRIPTION,
        author: 'A. Architect',
        category: 'Structural',
        tags: ['foundation', 'detail'],
        notes: ['Metadata note 1', 'Sheet-level note'],
        discipline: 'S',
      },
      parameters: {
        slabThickness: { label: 'Slab Thickness', type: 'number', default: 4 },
      },
      viewports: [
        {
          componentId: 'vp-main',
          title: 'Main Section',
          detail: 'section.json',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        },
      ],
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'sheet_border_box',
          x: 0,
          y: 0,
          width: 24,
          height: 18,
        },
      ],
    };

    const dispose = render(
      () =>
        createComponent(DacProvider, {
          doc,
          get children() {
            return createComponent(DacInspector, {});
          },
        }),
      container
    );

    const text = container.textContent || '';
    expect(text).toContain('Metadata note 1');
    expect(text).toContain('Sheet-level note');
    expect(text).toContain('A. Architect');
    expect(text).toContain('Structural');
    expect(text).toContain('#foundation #detail');
    expect(text).toContain('S');
    expect(text).not.toContain(PLACEHOLDER_DESCRIPTION);

    // Ensure doc.notes is not rendered as a redundant DocumentField label/input
    const labels = Array.from(container.querySelectorAll('label')).map((el) => el.textContent);
    expect(labels).not.toContain('notes');
    expect(labels).not.toContain('note');

    // Verify section ordering: Parameters -> Notes -> Viewports -> Title Block -> Geometries (last)
    const sectionTitles = Array.from(container.querySelectorAll('p')).map((p) => p.textContent?.trim());
    const idxParams = sectionTitles.indexOf('Parameters');
    const idxNotes = sectionTitles.indexOf('Notes');
    const idxViewports = sectionTitles.indexOf('Viewports');
    const idxTitleBlock = sectionTitles.indexOf('Title Block');
    const idxGeometries = sectionTitles.indexOf('Geometries');

    expect(idxParams).toBeGreaterThanOrEqual(0);
    expect(idxNotes).toBeGreaterThan(idxParams);
    expect(idxViewports).toBeGreaterThan(idxNotes);
    expect(idxTitleBlock).toBeGreaterThan(idxViewports);
    expect(idxGeometries).toBeGreaterThan(idxTitleBlock);
    expect(idxGeometries).toBe(sectionTitles.length - 1);

    dispose();
    container.remove();
  });

  it('renders subtle document empty state when neither notes nor metadata properties are present', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const doc = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      metadata: {
        id: 'empty-doc',
        title: 'Empty',
        description: PLACEHOLDER_DESCRIPTION,
        tags: [],
      },
      geometry: [],
    };

    const dispose = render(
      () =>
        createComponent(DacProvider, {
          doc,
          get children() {
            return createComponent(DacInspector, {});
          },
        }),
      container
    );

    const notesSection = container.querySelector('[data-notes-section="document"]');
    expect(notesSection).not.toBeNull();
    expect(notesSection!.textContent).toContain('No notes defined for this detail.');

    dispose();
    container.remove();
  });

  it('renders selected-element Notes at bottom with badge, avoids PropertyField duplication, and handles empty state', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let dacApi: ReturnType<typeof useDac> | null = null;
    const nestedDocs = new Map<string, any>([
      [
        'rebar-construct.json',
        {
          type: 'CAD::Construct',
          version: '1.0',
          parameters: {
            barSize: { label: 'Bar Size', type: 'string', default: '#4' },
          },
          geometry: [],
        },
      ],
    ]);

    const doc = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'sill_plate',
          x: 0,
          y: 0,
          width: 5.5,
          height: 1.5,
          material: 'PT Hem-Fir',
          spec: 'AWC NDS',
          description: 'Treated sill plate',
          tag: 'SP-1',
          comments: 'Anchor at 48" O.C.',
          notes: 'Install sill sealer beneath plate',
          note: ['Install sill sealer beneath plate', 'Verify anchor bolt torque'],
          metadata: {
            notes: 'Metadata sill note',
            grade: 'No. 2',
          },
        },
        {
          type: 'ConstructReference',
          componentId: 'rebar_ref',
          x: 2,
          y: 2,
          constructId: 'rebar-construct.json',
          notes: 'Place at mid-depth',
        },
        {
          type: 'CAD::Shape::Circle',
          componentId: 'plain_bolt',
          cx: 1,
          cy: 1,
          r: 0.25,
        },
      ],
    };

    function Harness() {
      dacApi = useDac();
      return createComponent(DacInspector, {});
    }

    const dispose = render(
      () =>
        createComponent(DacProvider, {
          doc,
          nestedDocs,
          get children() {
            return createComponent(Harness, {});
          },
        }),
      container
    );

    // Select sill_plate
    dacApi!.selectShape('sill_plate');

    const elNotes = container.querySelector('[data-notes-section="element"]');
    expect(elNotes).not.toBeNull();
    expect(container.querySelector('[data-notes-badge="true"]')?.textContent).toBe('sill_plate');
    expect(elNotes!.textContent).toContain('Install sill sealer beneath plate');
    expect(elNotes!.textContent).toContain('Verify anchor bolt torque');
    expect(elNotes!.textContent).toContain('Metadata sill note');
    expect(elNotes!.textContent).toContain('PT Hem-Fir');
    expect(elNotes!.textContent).toContain('AWC NDS');
    expect(elNotes!.textContent).toContain('Treated sill plate');
    expect(elNotes!.textContent).toContain('SP-1');
    expect(elNotes!.textContent).toContain('Anchor at 48" O.C.');
    expect(elNotes!.textContent).toContain('No. 2');

    // Ensure PropertyField labels do not duplicate summary/note fields
    const propertyLabels = Array.from(container.querySelectorAll('label')).map((l) => l.textContent);
    expect(propertyLabels).toContain('width');
    expect(propertyLabels).not.toContain('notes');
    expect(propertyLabels).not.toContain('note');
    expect(propertyLabels).not.toContain('material');
    expect(propertyLabels).not.toContain('spec');
    expect(propertyLabels).not.toContain('description');
    expect(propertyLabels).not.toContain('tag');
    expect(propertyLabels).not.toContain('comments');

    // Select ConstructReference and verify Notes renders below Construct Parameters
    dacApi!.selectShape('rebar_ref');
    const pTitles = Array.from(container.querySelectorAll('p')).map((p) => p.textContent?.trim());
    expect(pTitles.indexOf('Notes')).toBeGreaterThan(pTitles.indexOf('Construct Parameters'));
    expect(container.querySelector('[data-notes-badge="true"]')?.textContent).toBe('rebar_ref');
    expect(container.querySelector('[data-notes-section="element"]')?.textContent).toContain('Place at mid-depth');

    // Select plain_bolt with no notes/metadata and verify empty state
    dacApi!.selectShape('plain_bolt');
    expect(container.querySelector('[data-notes-badge="true"]')?.textContent).toBe('plain_bolt');
    expect(container.querySelector('[data-notes-section="element"]')?.textContent).toContain('No notes for plain_bolt');

    dispose();
    container.remove();
  });
});
