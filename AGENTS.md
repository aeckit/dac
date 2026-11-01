# Antigravity Agent Guidelines

## 1. Tool Usage & Safety
- **NEVER** use `run_command` with terminal utilities like `cat`, `sed`, `grep`, `ls`, or `echo` to read, search, list, or manipulate files.
- **ALWAYS** use the dedicated native tools for these tasks:
  - `view_file` (instead of `cat`)
  - `grep_search` (instead of `grep`)
  - `list_dir` (instead of `ls`)
  - `replace_file_content` (instead of `sed`)
  - `write_to_file` (instead of `echo >`)

## 2. Git & Version Control
- **DO NOT** commit changes automatically. Always ask for explicit permission before running `git commit` or `git push`.
- When creating commits, ensure commit messages follow conventional commit formats (e.g., `feat(pkg-name): ...`, `refactor(pkg-name): ...`).

## 3. Monorepo Architecture
- **`@aeckit/dac-json-solver`**: Pure math, geometry resolution, and layout logic. Knows nothing about graphics or SVG.
- **`@aeckit/renderer-svg`**: Handles pure visual output. Converts math/layout into static SVG markup (e.g., origin indicators, line thicknesses).
- **`@aeckit/dac-solid`**: Reactivity and DOM integration. Mounts the SVG into the browser and handles user interaction (pan, zoom, click) via SolidJS.
- **`@aeckit/solid-playground`**: The end-user application consuming the above packages.

## 4. Code Quality & Pre-Commit Verification Checklist
Before completing any task or proposing commits:
1. **Modularity & Single Responsibility Review**:
   - Inspect all tracked files with changes.
   - Verify that new logic belongs in that file. If a file is growing large (>150–200 lines) or mixing multiple responsibilities (e.g., subcomponents inside an inspector, inline validation inside a solver loop, duplicated parameter resolution), proactively refactor subcomponents or helpers into dedicated files.
2. **Unit Test Requirement**:
   - Every pure function, math solver, schema validation update, or business logic change **MUST** be accompanied by dedicated unit tests (e.g., using Vitest in `src/__tests__/`).
   - Run the test suite (`vitest run`) and verify all tests pass.
3. **Proactive Reporting**:
   - In the completion summary, explicitly report the modularity evaluation and test coverage for all modified files.

