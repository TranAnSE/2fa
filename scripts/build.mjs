import { build } from "esbuild";

await build({
  // Array form so the JS and CSS pairs can share an `out` base name —
  // esbuild appends the extension from each entry's loader.
  entryPoints: [
    { in: "app.js", out: "app.bundle" },
    { in: "extension/popup.js", out: "extension/popup.bundle" },
    { in: "styles.css", out: "styles.bundle" },
    { in: "extension/popup.css", out: "extension/popup.bundle" },
  ],
  bundle: true,
  // Vendored fonts keep their original url() paths — the service worker
  // pre-caches ./fonts/*.woff2 by name, so they must not be hashed/copied.
  external: ["*.woff2"],
  format: "esm",
  target: ["chrome114", "safari16", "firefox115"],
  sourcemap: false,
  minify: true,
  outdir: ".",
  logLevel: "info",
});
