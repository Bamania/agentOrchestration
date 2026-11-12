import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// Two aliases:
//   @        → client/src                               (shadcn / prompt-kit convention)
//   @shared  → harness-engineering/shared/events        (the SAME event contract the server uses)
//
// So `import { EventType } from "@shared/events"` resolves to
// harness-engineering/shared/events/events.ts — one source of truth for both sides.
const harnessShared = fileURLToPath(
  new URL("../harness-engineering/shared/events", import.meta.url),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": harnessShared,
    },
  },
  server: {
    port: 5173,
    // allow Vite to serve files from outside client/ (i.e. harness-engineering/shared)
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
});
