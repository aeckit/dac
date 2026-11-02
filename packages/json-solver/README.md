# @aeckit/dac-json-solver

Pure math, geometric resolution, constraint satisfaction, and parametric layout solver engine for **Drawing-as-Code (DaC)** in the `aeckit` ecosystem.

## Features

- **Geometric Resolution**: Evaluates parametric primitives, points, lines, arcs, polylines, dimensions, and text.
- **Parametric Constructs**: Resolves reusable parametric construct geometry (`resolveConstructGeometry`) with document and override parameters.
- **Formula Evaluation**: Evaluates live arithmetic and dimension expressions (e.g. `stud_height - 3.0`).
- **Framework Agnostic**: Pure math and geometry logic with 0 UI or DOM dependencies.

## Installation

```bash
npm install @aeckit/dac-json-solver @aeckit/dac-schema
# or
pnpm add @aeckit/dac-json-solver @aeckit/dac-schema
# or
yarn add @aeckit/dac-json-solver @aeckit/dac-schema
```

## Basic Usage

```typescript
import {
  solveDocument,
  resolveDocumentParameters,
  resolveConstructGeometry
} from '@aeckit/dac-json-solver';
import type { DacDocument } from '@aeckit/dac-schema';

// Solve a parametric DaC document into solved primitive geometry
const solvedResult = solveDocument(dacDocument);
console.log('Solved primitives:', solvedResult.primitives);
```

## License

MIT © [aeckit](https://github.com/aeckit/dac)
