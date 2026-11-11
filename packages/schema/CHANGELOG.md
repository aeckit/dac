# @aeckit/dac-schema

## 0.4.1

### Patch Changes

- d8e4b01: Support parametric expressions on `ConstructReference` coordinates, disable invalid 8-way resize handles on `ConstructReference`, guard against zero-drag and NaN mutations, and add a dedicated `length` grabber handle for constructs defining a numeric `length` parameter.

## 0.4.0

### Minor Changes

- 527e8bd: Add parametric `cornerRadius` (fillet) support for `Polyline` primitives across schema, json-solver, renderer-svg, json-builder, and dac-solid inspector, and remove legacy concrete hatch pattern in favor of clean material fills.

## 0.3.0

### Minor Changes

- 029deb7: Implement support for `Polyline` 2D geometry primitive across `@aeckit` monorepo packages:
  - `@aeckit/dac-schema`: Add `PolylineSchema` and `PolylinePrimitive` supporting open/closed polylines, numeric and expression-based coordinates, and standard shape styling properties.
  - `@aeckit/dac-json-solver`: Add `SolvedPolyline` and update `GeometryPrimitive` / `SolvedPrimitive` unions; support expression evaluation for `points` and coordinate translation/rotation in construct resolution.
  - `@aeckit/dac-renderer-svg`: Add `drawPolyline` drawer rendering `<polyline>` or `<polygon>` (for closed polylines) with interactive hit area and rotation support; update `computeBoundingBox` to calculate bounds across polyline points.
  - `@aeckit/dac-json-builder`: Add `addPolyline` helper method in `ShapeOperations` and `JsonBuilder` with `PolylineOptions`.
  - `@aeckit/dac-solid`: Add Polyline tool to `DacToolbar`, support `Polyline` in `useDac` `addShape`, add interactive vertex and midpoint grabbers (`PolylineGrips`) to `SelectionGizmo`, and provide structured coordinate table editing with vertex addition and removal in `PointsField` / `DacInspector`.
  - `@aeckit/solid-playground`: Add `polyline-demo.json` showcase demo detail with parametric open and closed polylines.
- aa4cc9c: Add DocumentMetadataSchema to dac-schema, computeBoundingBox and renderThumbnailSvg to renderer-svg, and autoFit prop to DacCanvas in dac-solid.

## 0.2.0

### Minor Changes

- 6ac4cb0: Initial release of `@aeckit/dac-schema`: Zod schemas and TypeScript type definitions for Drawing-as-Code (DaC) primitives, documents, and parametric constructs.
