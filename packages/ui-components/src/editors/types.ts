import type { DetailDocument } from '@aeckit/dac-schema';

export interface PropertyEditorContext {
  container: HTMLElement;
  shapeIndex: number;
  getLatestShape: () => any;
  updateAndNotify?: () => void;
  engine?: any;
}

export interface ParametricEditorContext {
  container: HTMLElement;
  componentParams: [string, any][];
  getLatestDoc: () => DetailDocument | null;
  updateAndNotify?: () => void;
  engine?: any;
}

export interface PropertyEditor {
  renderHTML(shape: any, index: number): string;
  bindListeners(context: PropertyEditorContext): void;
}
