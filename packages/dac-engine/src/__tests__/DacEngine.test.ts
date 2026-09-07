import { describe, it, expect, beforeEach } from 'vitest';
import { DacEngine } from '../DacEngine';

describe('DacEngine', () => {
  let engine: DacEngine;

  beforeEach(() => {
    engine = new DacEngine();
  });

  describe('DocumentState', () => {
    it('sets and retrieves document correctly', () => {
      const mockDoc = { type: 'CAD::Detail', geometry: [] };
      engine.setDocument(mockDoc);
      expect(engine.getDocument()).toEqual(mockDoc);
    });

    it('emits document_changed event on setDocument', () => {
      const mockDoc = { type: 'CAD::Detail', geometry: [] };
      let eventFired = false;
      engine.addEventListener('document_changed', () => {
        eventFired = true;
      });
      engine.setDocument(mockDoc);
      expect(eventFired).toBe(true);
    });
  });

  describe('DocumentOperations (mutateDocument / mutateActiveSheet)', () => {
    it('mutates document and emits event', () => {
      const mockDoc = { type: 'CAD::Project', projectName: 'Old Name' };
      engine.setDocument(mockDoc);

      let eventFired = false;
      engine.addEventListener('document_changed', () => { eventFired = true; });

      engine.mutateDocument((doc) => {
        doc.projectName = 'New Name';
      });

      expect(engine.getDocument().projectName).toBe('New Name');
      expect(eventFired).toBe(true);
    });

    it('mutates active sheet and emits event', () => {
      const mockDoc = { type: 'CAD::Project', sheets: ['sheet-1'] };
      const nestedDocs = new Map();
      nestedDocs.set('sheet-1', { type: 'CAD::SheetConfiguration', sheetName: 'Old Sheet' });
      
      engine.setDocument(mockDoc, nestedDocs);
      engine.setActiveSheetId('sheet-1');

      let eventFired = false;
      engine.addEventListener('document_changed', () => { eventFired = true; });

      engine.mutateActiveSheet((sheet) => {
        sheet.sheetName = 'New Sheet';
      });

      const updatedSheet = engine.getNestedDocs().get('sheet-1');
      expect(updatedSheet.sheetName).toBe('New Sheet');
      expect(eventFired).toBe(true);
    });
  });

  describe('ShapeOperations', () => {
    it('adds rectangle to detail document', () => {
      const mockDoc = { type: 'CAD::Detail', geometry: [] };
      engine.setDocument(mockDoc);

      const rect = engine.shapes.addRectangle({ width: 20, height: 10 });
      expect(rect.type).toBe('CAD::Shape::Rectangle');
      expect(rect.width).toBe(20);
      
      const doc = engine.getDocument();
      expect(doc.geometry.length).toBe(1);
      expect(doc.geometry[0].componentId).toMatch(/^rect_/);
    });
  });

  describe('ComponentOperations', () => {
    it('updates component properties', () => {
      const mockDoc = { type: 'CAD::Detail', geometry: [{ componentId: 'rect_1', width: 10 }] };
      engine.setDocument(mockDoc);

      engine.components.updateComponent('rect_1', { width: 50 });
      
      const doc = engine.getDocument();
      expect(doc.geometry[0].width).toBe(50);
    });

    it('deletes component by id', () => {
      const mockDoc = { type: 'CAD::Detail', geometry: [{ componentId: 'rect_1' }, { componentId: 'rect_2' }] };
      engine.setDocument(mockDoc);

      engine.components.deleteComponent('rect_1');
      
      const doc = engine.getDocument();
      expect(doc.geometry.length).toBe(1);
      expect(doc.geometry[0].componentId).toBe('rect_2');
    });
  });
});
