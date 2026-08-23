export function getSubComponent(doc: any, id: string): any {
  if (!doc) return null;
  if (doc.type === 'CAD::Detail' || doc.type === 'CAD::TitleBlock') {
    let autoIndex = 0;
    for (const g of doc.geometry || []) {
      const cid = g.componentId || `shape_${autoIndex++}`;
      if (cid === id) return g;
    }
  }
  if (doc.type === 'CAD::SheetConfiguration') {
    return doc.viewports?.find((v: any) => v.componentId === id);
  }
  if (doc.type === 'CAD::Project') {
    const ds = doc as any;
    if (Array.isArray(ds.sheets)) {
      for (const sheet of ds.sheets) {
        if (typeof sheet === 'object') {
          const v = sheet.viewports?.find((v: any) => v.componentId === id);
          if (v) return v;
        }
      }
    }
  }
  return null;
}

export function updateSubComponent(doc: any, id: string, newComponent: any): boolean {
  if (!doc) return false;
  if (doc.type === 'CAD::Detail' || doc.type === 'CAD::TitleBlock') {
    let autoIndex = 0;
    const geom = doc.geometry || [];
    for (let i = 0; i < geom.length; i++) {
      const g = geom[i];
      const cid = g.componentId || `shape_${autoIndex++}`;
      if (cid === id) {
        geom[i] = newComponent;
        return true;
      }
    }
  }
  if (doc.type === 'CAD::SheetConfiguration') {
    const idx = doc.viewports?.findIndex((v: any) => v.componentId === id);
    if (idx !== undefined && idx !== -1) {
      doc.viewports[idx] = newComponent;
      return true;
    }
  }
  if (doc.type === 'CAD::Project') {
    const ds = doc as any;
    if (Array.isArray(ds.sheets)) {
      for (const sheet of ds.sheets) {
        if (typeof sheet === 'object') {
          const idx = sheet.viewports?.findIndex((v: any) => v.componentId === id);
          if (idx !== undefined && idx !== -1) {
            sheet.viewports[idx] = newComponent;
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function getUniqueName(base: string, getFiles: () => Record<string, any>) {
  let name = base + '.json';
  let i = 1;
  const files = getFiles();
  while (files[name]) {
    name = `${base}-${i}.json`;
    i++;
  }
  return name;
}
