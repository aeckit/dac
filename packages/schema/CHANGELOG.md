# @aeckit/dac-schema

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
