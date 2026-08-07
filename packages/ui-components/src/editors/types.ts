import { DetailDocument } from '@aeckit/core-solver';

export interface PropertyEditorContext {
  container: HTMLElement;
  shapeIndex: number;
  getLatestShape: () => any;
  updateAndNotify: () => void;
}

export interface ParametricEditorContext {
  container: HTMLElement;
  componentParams: [string, any][];
  getLatestDoc: () => DetailDocument | null;
  updateAndNotify: () => void;
}

export interface PropertyEditor {
  renderHTML(shape: any, index: number): string;
  bindListeners(context: PropertyEditorContext): void;
}
