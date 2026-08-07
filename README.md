# DaC: Drawings as Code

Welcome to the **Drawings as Code (DaC)** monorepo. This workspace houses a parametric 2D CAD visualizer engine, web UI components, and a VS Code extension that renders construction details (e.g., foundation-to-sill plate connections) as interactive, blueprint-style drawings directly inside the IDE.

![DaC Extension Preview](apps/dac-vsix/resources/preview.gif)

---

## Monorepo Layout

This repository uses npm workspaces:

```text
dac/
├── packages/
│   ├── core-solver/      # @aeckit/core-solver — Pure TypeScript CAD renderer
│   └── ui-components/    # @aeckit/ui-components — Vanilla JS viewport and property panel
└── apps/
    └── dac-vsix/         # dac-vsix — VS Code extension wrapper
```

### 1. Core Solver (`packages/core-solver`)
* **npm package:** `@aeckit/core-solver`
* **Role**: A stateless geometric compiler. It resolves algebraic coordinate expressions (e.g., `"240 + {parameters.offset} - 10"`) and compiles drawing schemas into raw vector SVG strings.

### 2. UI Components (`packages/ui-components`)
* **npm package:** `@aeckit/ui-components`
* **Role**: Browser-native split-panel interface. The left panel dynamically generates properties forms from active parameters. The right panel renders the interactive SVG canvas, including custom zoom/pan and outline highlights on click.

### 3. VS Code Extension (`apps/dac-vsix`)
* **npm package:** `dac-vsix`
* **Role**: VS Code extension wrapper. Mounts the UI components in a Webview Panel, listens to saves/changes on `.json` detail files, and handles real-time bidirectional parameter synchronization back to the active text editor buffer.

---

## CAD Geometry & Interactive Selection

### 1. Cartesian Coordinate System (`+Y = UP`)
Unlike standard web SVG/HTML coordinates where the Y-axis points down from the top-left, **DaC uses a standard CAD Cartesian coordinate system**:
* **Origin `(0, 0)`:** Located at the **bottom-left** of the canvas or drawing sheet.
* **Axes:** `+X` extends to the right; **`+Y` extends upwards**.
* **Origin UCS Indicator:** In detail views, a red/cyan CAD coordinate axis icon (`X →`, `Y ↑`) is displayed at `(0, 0)` on the blueprint grid to provide visual orientation.

### 2. Interactive Selection & Component Grouping
Every geometry primitive in a drawing is **selectable and highlightable** in the interactive viewer by default:
* **Explicit `componentId` (Grouping):** When one or more primitives share an explicit `componentId` (e.g., `"componentId": "anchor_bolt"` on 4 lines and a polygon), the solver groups them together into a single interactive assembly (`<g data-component-id="anchor_bolt">`). Clicking any line in the assembly highlights the entire anchor bolt.
* **Implicit Auto-Indexing (Fallback):** If an element in `geometry` does not specify a `componentId`, `@aeckit/core-solver` automatically assigns an indexed fallback ID (`shape_0`, `shape_1`, etc.). This ensures **every element on the canvas is clickable and inspectable by default**.

---

## Getting Started

### Prerequisites

* Node.js $\ge 18$
* npm (bundled with Node)

### Setup & Compilation

1. Clone the repository:
   ```bash
   git clone https://github.com/aeckit/dac.git
   cd dac
   ```

2. Install workspace dependencies:
   ```bash
   npm install
   ```

3. Build all packages:
   ```bash
   npm run compile
   ```

---

## Local Development & Debugging

1. Open the root `dac/` directory in VS Code.
2. Open the **Run and Debug** panel (`Ctrl+Shift+D` or `Cmd+Shift+D`).
3. Select **Launch Extension** and press **`F5`**.
4. An *Extension Development Host* window will open.
5. In the host window, open a detail configuration file (like `detail-prototype.json`) and run the **DAC: Open Preview** command from the editor title bar menu (or right-click).

---

## Packaging for Release

To package the VS Code extension for manual publication to the marketplace:

```bash
cd apps/dac-vsix
npx @vscode/vsce package --no-dependencies
```

This will generate the installable `dac-vsix-0.0.1.vsix` package in that folder.
