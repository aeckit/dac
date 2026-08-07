import { PropertyEditor } from './types';
import { RectangleEditor } from './RectangleEditor';
import { LineEditor } from './LineEditor';
import { TextEditor } from './TextEditor';
import { DefaultEditor } from './DefaultEditor';
import { ParametricEditor } from './ParametricEditor';

import { DocumentEditor } from './DocumentEditor';
import { ViewportEditor } from './ViewportEditor';

export {
  RectangleEditor,
  LineEditor,
  TextEditor,
  DefaultEditor,
  ParametricEditor,
  DocumentEditor,
  ViewportEditor
};

export const getEditorForShape = (type: string): PropertyEditor => {
  switch (type) {
    case 'CAD::Shape::Rectangle':
      return RectangleEditor;
    case 'CAD::Shape::Line':
      return LineEditor;
    case 'CAD::Annotation::Text':
      return TextEditor;
    default:
      return DefaultEditor;
  }
};
