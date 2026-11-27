import { build } from "esbuild";

// Bundles workspace packages (shipped as TS source) into one ESM file;
// npm dependencies stay external and load from node_modules.
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  packages: "external",
  alias: { "@veritas/shared": "../../packages/shared/src/index.ts", "@veritas/db": "../../packages/db/src/index.ts" },
});
