# @aeckit/dac-json-builder

Programmatic fluent builder, composition API, and document mutation utilities for **Drawing-as-Code (DaC)** in the `aeckit` ecosystem.

## Features

- **Fluent Drawing API**: Create primitives, lines, rectangles, dimensions, and text with clean builder methods.
- **Parametric Constructs**: Define reusable drawing components and parametric constructs programmatically.
- **Strict Validation**: Builds documents that strictly adhere to `@aeckit/dac-schema`.

## Installation

```bash
npm install @aeckit/dac-json-builder @aeckit/dac-schema
# or
pnpm add @aeckit/dac-json-builder @aeckit/dac-schema
```

## Basic Usage

```typescript
import { JsonBuilder } from '@aeckit/dac-json-builder';

const builder = new JsonBuilder();

// Draw framing shapes
builder.shapes.addRectangle({
  x: 0,
  y: 0,
  width: 5.5,
  height: 1.5,
  fill: 'rgba(217, 119, 6, 0.15)',
  hatch: 'TimberCross',
  componentId: 'top_plate'
});

// Output validated DaC Document
const doc = builder.build();
```

## License

MIT © [aeckit](https://github.com/aeckit/dac)
