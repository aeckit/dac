import { PropertyEditor } from './types';
import { RectangleEditor } from './RectangleEditor';
import { LineEditor } from './LineEditor';
import { TextEditor } from './TextEditor';
import { DefaultEditor } from './DefaultEditor';
import { ParametricEditor } from './ParametricEditor';
import { ImageEditor } from './ImageEditor';

import { DocumentEditor } from './DocumentEditor';
import { ViewportEditor } from './ViewportEditor';
import { ConstructReferenceEditor } from './ConstructReferenceEditor';

export {
  RectangleEditor,
  LineEditor,
  TextEditor,
  DefaultEditor,
  ParametricEditor,
  ImageEditor,
  DocumentEditor,
  ViewportEditor,
  ConstructReferenceEditor
};

export const getEditorForShape = (type: string): PropertyEditor => {
  switch (type) {
    case 'CAD::Shape::Rectangle':
      return RectangleEditor;
    case 'CAD::Shape::Line':
      return LineEditor;
    case 'CAD::Annotation::Text':
      return TextEditor;
    case 'CAD::Annotation::Image':
      return ImageEditor;
    case 'ConstructReference':
      return ConstructReferenceEditor;
    default:
      return DefaultEditor;
  }
};
