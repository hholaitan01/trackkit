import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "TrackKit",
      formats: ["umd", "es"],
      fileName: (format) =>
        format === "umd" ? "trackkit-widget.js" : "trackkit-widget.esm.js",
    },
    rollupOptions: {
      // MapLibre GL is bundled in (not external) so the widget is self-contained
    },
    sourcemap: true,
  },
});
