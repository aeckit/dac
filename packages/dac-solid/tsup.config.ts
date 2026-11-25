import { defineConfig } from "tsup";
import { transform } from "@solidjs/compiler";
import fs from "fs";

const solid2Plugin = {
  name: "solid2",
  setup(build: any) {
    build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args: any) => {
      const text = await fs.promises.readFile(args.path, "utf8");
      const { code } = transform(text, { filename: args.path, generate: "dom" });
      return {
        contents: code,
        loader: args.path.endsWith(".tsx") ? "ts" : "js",
      };
    });
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: [
    "solid-js",
    "@solidjs/web",
    "@solidjs/signals",
    "@aeckit/dac-json-builder",
    "@aeckit/dac-json-solver",
    "@aeckit/dac-renderer-svg",
    "@aeckit/dac-schema"
  ],
  esbuildPlugins: [solid2Plugin],
});
