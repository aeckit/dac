# @aeckit/dac-schema

Official JSON Schema and TypeScript type definitions for **Drawing-as-Code (DaC)** in the `aeckit` ecosystem.

## Features

- **Zod Schemas**: Full runtime validation schemas for DaC documents, primitives, viewports, and parameters.
- **TypeScript Types**: Inferred static types for strongly-typed CAD/drawing constructs.
- **Dual module build**: ESM and CommonJS support with TypeScript declaration files (`.d.ts`).

## Installation

```bash
npm install @aeckit/dac-schema
# or
pnpm add @aeckit/dac-schema
# or
yarn add @aeckit/dac-schema
```

## Basic Usage

```typescript
import {
  dacDocumentSchema,
  validateDacDocument,
  type DacDocument
} from '@aeckit/dac-schema';

// Validate a DaC document
const result = validateDacDocument(jsonContent);
if (result.success) {
  console.log('Valid document:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

## License

MIT © [aeckit](https://github.com/aeckit/dac)
