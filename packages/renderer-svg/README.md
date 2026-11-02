# @aeckit/dac-renderer-svg

Pure, framework-agnostic SVG rendering engine for **Drawing-as-Code (DaC)** Intermediate Representation in the `aeckit` ecosystem.

## Features

- **Direct SVG Generation**: Converts solved DaC primitives directly into static, clean SVG markup or DOM nodes.
- **CAD Styling**: Handles line weights, dimension lines, arrows, hatch patterns (e.g. TimberCross), text alignments, and viewport bounds.
- **Zero DOM Lock-in**: Can run in Node.js (SSR), worker threads, or in the browser.

## Installation

```bash
npm install @aeckit/dac-renderer-svg @aeckit/dac-json-solver @aeckit/dac-schema
# or
pnpm add @aeckit/dac-renderer-svg @aeckit/dac-json-solver @aeckit/dac-schema
```

## Basic Usage

```typescript
import { renderSheet } from '@aeckit/dac-renderer-svg';
import { solveDocument } from '@aeckit/dac-json-solver';

// 1. Solve geometry
const solved = solveDocument(dacDocument);

// 2. Render to SVG
const svgMarkup = renderSheet(solved, {
  showDimensions: true,
  theme: 'light'
});
```

## License

MIT © [aeckit](https://github.com/aeckit/dac)
