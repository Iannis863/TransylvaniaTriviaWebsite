import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm } from "node:fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("Building client (Frontend)...");
  await viteBuild();

  console.log("Building server (Backend)...");
  await esbuild({
    entryPoints: ["api/index.js"],
    platform: "node",
    bundle: true,
    format: "esm",
    // Static assets and the server executable have separate deployment targets.
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    packages: "external",
    logLevel: "info",
  });

  console.log("Build successful. Assets are in dist/public and server is in dist/index.js");
}

buildAll().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
