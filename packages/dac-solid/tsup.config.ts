import { defineConfig } from "tsup";
import { solidPlugin } from "esbuild-plugin-solid";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["solid-js", "solid-js/web", "solid-js/store"],
  esbuildPlugins: [solidPlugin()],
});
