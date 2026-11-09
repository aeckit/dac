# @aeckit/dac-json-builder

## 0.3.0

### Minor Changes

- 527e8bd: Add parametric `cornerRadius` (fillet) support for `Polyline` primitives across schema, json-solver, renderer-svg, json-builder, and dac-solid inspector, and remove legacy concrete hatch pattern in favor of clean material fills.

### Patch Changes

- Updated dependencies [527e8bd]
  - @aeckit/dac-schema@0.4.0

## 0.2.0

### Minor Changes

- 029deb7: Implement support for `Polyline` 2D geometry primitive across `@aeckit` monorepo packages:
  - `@aeckit/dac-schema`: Add `PolylineSchema` and `PolylinePrimitive` supporting open/closed polylines, numeric and expression-based coordinates, and standard shape styling properties.
  - `@aeckit/dac-json-solver`: Add `SolvedPolyline` and update `GeometryPrimitive` / `SolvedPrimitive` unions; support expression evaluation for `points` and coordinate translation/rotation in construct resolution.
  - `@aeckit/dac-renderer-svg`: Add `drawPolyline` drawer rendering `<polyline>` or `<polygon>` (for closed polylines) with interactive hit area and rotation support; update `computeBoundingBox` to calculate bounds across polyline points.
  - `@aeckit/dac-json-builder`: Add `addPolyline` helper method in `ShapeOperations` and `JsonBuilder` with `PolylineOptions`.
  - `@aeckit/dac-solid`: Add Polyline tool to `DacToolbar`, support `Polyline` in `useDac` `addShape`, add interactive vertex and midpoint grabbers (`PolylineGrips`) to `SelectionGizmo`, and provide structured coordinate table editing with vertex addition and removal in `PointsField` / `DacInspector`.
  - `@aeckit/solid-playground`: Add `polyline-demo.json` showcase demo detail with parametric open and closed polylines.

### Patch Changes

- f991f0e: Add showGizmoActions prop to DacCanvas and SelectionGizmo, fix DacProvider reactivity on document mutations, and support mutating CAD::Construct documents in getTargetDocument.
- Updated dependencies [029deb7]
- Updated dependencies [aa4cc9c]
  - @aeckit/dac-schema@0.3.0

## 0.1.1

### Patch Changes

- 68fc62b: Initial automated release and verification of npm trusted publishing.
