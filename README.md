# DaC: Drawings as Code

Welcome to the **Drawings as Code (DaC)** monorepo. DaC is a system of packages including a parametric 2D CAD visualizer engine, SolidJS web UI components, a standalone web playground, and a VS Code extension that renders construction details as interactive, blueprint-style drawings.

---

## Monorepo Architecture

This repository uses npm workspaces and Turborepo. It is broken down into highly specialized, isolated packages:

### Packages (`packages/`)
* **`@aeckit/dac-schema`**: The Zod schemas and TypeScript types defining the DaC document structure (Projects, Sheets, Details, and Geometry Primitives).
* **`@aeckit/dac-json-builder`**: A workspace mutation API that safely traverses nested documents to apply transformations, moves, and deletions to the underlying JSON state.
* **`@aeckit/dac-json-solver`**: A pure math/geometry resolution engine. Resolves algebraic coordinate expressions (e.g. `"240 + {parameters.offset} - 10"`) into absolute floats, maintaining constraints and dependencies without any graphical output.
* **`@aeckit/renderer-svg`**: The pure visual output engine. Converts the algebraically solved layouts into static SVG markup representing the final CAD drawing.
* **`@aeckit/dac-solid`**: Reactivity and DOM integration layer. Built in SolidJS, it mounts the SVG into the browser and powers the interactive UI tools (selection gizmos, inspector panels, pan/zoom canvas).
* **`@aeckit/dac-cli`**: A command-line interface for headless rendering, validation, and CLI-driven workflows.

### Apps (`apps/`)
* **`@aeckit/solid-playground`**: The end-user standalone browser application. Built with Vite and SolidJS, it provides an interactive web workspace to edit `.json` code and view real-time rendered CAD results.
* **`dac-vsix`**: The VS Code extension. Embeds the `@aeckit/dac-solid` components in a Webview Panel, providing bidirectional real-time synchronization between the active text editor buffer and the visual canvas.

---

## Getting Started

### Prerequisites

* Node.js >= 18
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
   npm run build
   ```

---

## Local Development & Debugging

### Running the Web Playground
The easiest way to develop and test the engine is to run the standalone SolidJS playground.

```bash
npm run dev
```
Navigate to `http://localhost:5173` to open the Playground. Any new `.json` files dropped into `apps/solid-playground/src/demo/` will instantly appear in the sidebar upon resetting the workspace.

### Running the VS Code Extension
1. Open the root `dac/` directory in VS Code.
2. Open the **Run and Debug** panel (`Ctrl+Shift+D` or `Cmd+Shift+D`).
3. Select **Launch Extension** and press **`F5`**.
4. An *Extension Development Host* window will open.
5. In the host window, open any DaC JSON file and run the **DAC: Open Preview** command from the editor title bar menu (or right-click).

---

## Packaging for Release

To package the VS Code extension for manual publication to the marketplace:

```bash
npm run package
```

This will run the Turborepo pipeline and generate the installable `dac-vsix-0.0.1.vsix` package inside `apps/dac-vsix/`.
