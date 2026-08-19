import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceManager } from './Workspace';
import type { DetailDocument, SheetConfiguration } from '@aeckit/core-solver';

describe('WorkspaceManager & File Management UI Experience', () => {
  let onChange: () => void;
  let workspace: WorkspaceManager;

  beforeEach(() => {
    // Clear hash before each test
    window.location.hash = '';
    onChange = vi.fn();
    workspace = new WorkspaceManager(onChange);
  });

  describe('1. Creating Files', () => {
    it('calling createFile("detail.json", detailDoc) sets activeFilename and makes getActiveFileContent() return the new document', () => {
      const detailDoc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1/4" = 1\'-0"',
        geometry: [
          { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 10, height: 10 }
        ]
      };

      workspace.createFile('detail.json', detailDoc);

      expect(workspace.activeFilename).toBe('detail.json');
      expect(workspace.getActiveFileContent()).toEqual(detailDoc);
      expect(onChange).toHaveBeenCalled();
    });

    it('does not overwrite existing file if filename already exists', () => {
      const doc1: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1/4" = 1\'-0"',
        geometry: []
      };
      const doc2: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1/8" = 1\'-0"',
        geometry: []
      };

      workspace.createFile('existing.json', doc1);
      workspace.createFile('existing.json', doc2);

      expect(workspace.getActiveFileContent()).toEqual(doc1);
    });
  });

  describe('2. Monaco JSON Editor Synchronization', () => {
    describe('updateActiveFileFromString', () => {
      it('updateActiveFileFromString(jsonString) with valid JSON updates file content and returns success', () => {
        workspace.createFile('test.json', {
          type: 'CAD::Detail',
          version: '1.0',
          scale: '1=1',
          geometry: []
        });
        workspace.setActiveFile('test.json');

        const validJsonString = JSON.stringify({
          type: 'CAD::Detail',
          version: '1.0',
          scale: '1=2',
          geometry: []
        });

        const result = workspace.updateActiveFileFromString(validJsonString);
        expect(result.success).toBe(true);

        const updatedFile = workspace.getFiles()['test.json'] as DetailDocument;
        expect(updatedFile.scale).toBe('1=2');
      });

      it('updateActiveFileFromString(invalidJson) with malformed JSON gracefully returns false without crashing or corrupting document', () => {
        workspace.createFile('test.json', {
          type: 'CAD::Detail',
          version: '1.0',
          scale: '1=2',
          geometry: []
        });
        workspace.setActiveFile('test.json');
        
        const invalidJsonString = '{"type": "CAD::Detail", "version": '; // missing closing braces/quotes

        const result = workspace.updateActiveFileFromString(invalidJsonString);
        expect(result.success).toBe(false);

        // Verify the document was not corrupted
        const unchangedFile = workspace.getFiles()['test.json'] as DetailDocument;
        expect(unchangedFile.scale).toBe('1=2');
      });

      it('returns false if there is no active file', () => {
        workspace.activeFilename = null;
        const result = workspace.updateActiveFileFromString('{"type":"CAD::Detail"}');
        expect(result.success).toBe(false);
      });
    });
  });

  describe('3. Sheet Viewport Registration', () => {
    it('registers CAD::Detail documents in viewports and title blocks under both "filename.json" and "../filename.json" keys', () => {
      const detailDoc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1/4" = 1\'-0"',
        geometry: [
          { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 12, height: 12 }
        ]
      };
      const sheetDoc: SheetConfiguration = {
        type: 'CAD::SheetConfiguration',
        sheetNumber: 'A001',
        sheetName: 'Floor Plan Sheet',
        paperSize: 'ARCH D',
        titleBlockOverride: 'detail.json',
        viewports: []
      };

      workspace.createFile('detail.json', detailDoc);
      workspace.createFile('sheet.json', sheetDoc);

      const viewportsMap = workspace.getViewportsMap();
      const titleBlockMap = workspace.getTitleBlockMap();

      // Ensure detail.json is found by direct name and relative "../detail.json"
      expect(viewportsMap.get('detail.json')).toEqual(detailDoc);
      expect(viewportsMap.get('../detail.json')).toEqual(detailDoc);
      expect(titleBlockMap.get('detail.json')).toEqual(detailDoc);
      expect(titleBlockMap.get('../detail.json')).toEqual(detailDoc);

      // Ensure CAD::Sheet is not accidentally registered as a viewport
      expect(viewportsMap.has('sheet.json')).toBe(false);
      expect(viewportsMap.has('../sheet.json')).toBe(false);
    });
  });
});
