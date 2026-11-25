---
"@aeckit/dac-solid": major
---

Hard cutover to Solid 2.0:
- Upgraded peerDependencies to `solid-js` ^2.0.0.
- Migrated JSX runtime and imports to `@solidjs/web`.
- Updated reactive primitives and context usage to Solid 2 standards (`createTrackedEffect`, `onSettled`, direct `<DacContext value={...}>` provider).
- Replaced `lucide-solid` dependency with self-contained, lightweight Solid 2 SVG icons.
- Updated build pipeline to use `@solidjs/compiler` for native DOM transform.
