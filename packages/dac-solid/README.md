# @aeckit/dac-solid

Reactive UI components, canvas viewer, pan/zoom controller, and parameter inspectors for **Drawing-as-Code (DaC)** built with [SolidJS](https://www.solidjs.com).

## Features

- **`<DacCanvas />`**: High-performance pan/zoom drawing canvas with live grid and SVG rendering.
- **`<DacInspector />`**: Interactive entity and layer inspector.
- **`<DocumentParametersInspector />`**: Dynamic parameter controls with live dropdowns, number steppers, and resolved formula badges.
- **Smooth reactivity**: Powered by SolidJS fine-grained reactivity.

## Installation

```bash
npm install @aeckit/dac-solid @aeckit/dac-schema @aeckit/dac-json-solver @aeckit/dac-renderer-svg solid-js
# or
pnpm add @aeckit/dac-solid @aeckit/dac-schema @aeckit/dac-json-solver @aeckit/dac-renderer-svg solid-js
```

## Basic Usage

```tsx
import { DacCanvas, DacInspector } from '@aeckit/dac-solid';
import { createSignal } from 'solid-js';

function DrawingViewer(props) {
  const [doc, setDoc] = createSignal(props.initialDoc);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <DacCanvas
        doc={doc()}
        onDocChange={setDoc}
        width="100%"
        height="100%"
      />
      <DacInspector
        doc={doc()}
        onDocChange={setDoc}
      />
    </div>
  );
}
```

## License

MIT © [aeckit](https://github.com/aeckit/dac)
