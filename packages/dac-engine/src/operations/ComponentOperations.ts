import { DacEngine } from '../DacEngine';

export class ComponentOperations {
  constructor(private engine: DacEngine) {}

  public updateComponent(id: string, properties: Partial<any>, isTransient: boolean = false): void {
    const targetDoc = this.engine.getTargetDocument();
    
    if (targetDoc.geometry) {
      let autoIndex = 0;
      const shapeIndex = targetDoc.geometry.findIndex((g: any) => {
        const sid = g.componentId || 'shape_' + autoIndex++;
        return sid === id;
      });
      if (shapeIndex !== -1) {
        targetDoc.geometry[shapeIndex] = { ...targetDoc.geometry[shapeIndex], ...properties };
        this.engine.notifyChanged(isTransient);
        return;
      }
    }
    
    if (targetDoc.viewports) {
      let autoIndex = 0;
      const vpIndex = targetDoc.viewports.findIndex((v: any) => {
        const sid = v.componentId || 'vp_' + autoIndex++;
        return sid === id;
      });
      if (vpIndex !== -1) {
        targetDoc.viewports[vpIndex] = { ...targetDoc.viewports[vpIndex], ...properties };
        this.engine.notifyChanged(isTransient);
        return;
      }
    }

    // Search nested docs if not found in root
    for (const [key, nestedDoc] of this.engine.getNestedDocs().entries()) {
      if (nestedDoc.geometry) {
        let autoIndex = 0;
        const shapeIndex = nestedDoc.geometry.findIndex((g: any) => {
          const sid = g.componentId || 'shape_' + autoIndex++;
          return sid === id;
        });
        if (shapeIndex !== -1) {
          nestedDoc.geometry[shapeIndex] = { ...nestedDoc.geometry[shapeIndex], ...properties };
          this.engine.notifyChanged(isTransient);
          return;
        }
      }
    }

    throw new Error(`Component ${id} not found`);
  }

  public replaceComponentWithShapes(id: string, newShapes: any[]): void {
    const targetDoc = this.engine.getTargetDocument();
    
    if (targetDoc.geometry) {
      let autoIndex = 0;
      const shapeIndex = targetDoc.geometry.findIndex((g: any) => {
        const sid = g.componentId || 'shape_' + autoIndex++;
        return sid === id;
      });
      if (shapeIndex !== -1) {
        targetDoc.geometry.splice(shapeIndex, 1, ...newShapes);
        this.engine.notifyChanged();
        return;
      }
    }

    // Search nested docs if not found in root
    for (const [key, nestedDoc] of this.engine.getNestedDocs().entries()) {
      if (nestedDoc.geometry) {
        let autoIndex = 0;
        const shapeIndex = nestedDoc.geometry.findIndex((g: any) => {
          const sid = g.componentId || 'shape_' + autoIndex++;
          return sid === id;
        });
        if (shapeIndex !== -1) {
          nestedDoc.geometry.splice(shapeIndex, 1, ...newShapes);
          this.engine.notifyChanged();
          return;
        }
      }
    }

    throw new Error(`Component ${id} not found for replacement`);
  }

  public deleteComponent(id: string): void {
    const targetDoc = this.engine.getTargetDocument();
    
    if (targetDoc.geometry) {
      let autoIndex = 0;
      targetDoc.geometry = targetDoc.geometry.filter((g: any) => {
        const sid = g.componentId || 'shape_' + autoIndex++;
        return sid !== id;
      });
    }
    if (targetDoc.viewports) {
      let autoIndex = 0;
      targetDoc.viewports = targetDoc.viewports.filter((v: any) => {
        const sid = v.componentId || 'vp_' + autoIndex++;
        return sid !== id;
      });
    }

    // Search nested docs
    for (const [key, nestedDoc] of this.engine.getNestedDocs().entries()) {
      if (nestedDoc.geometry) {
        let autoIndex = 0;
        nestedDoc.geometry = nestedDoc.geometry.filter((g: any) => {
          const sid = g.componentId || 'shape_' + autoIndex++;
          return sid !== id;
        });
      }
    }
    
    this.engine.notifyChanged();
  }
}
