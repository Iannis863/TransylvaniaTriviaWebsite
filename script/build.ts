import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

async function buildAll() {
  // 1. Clean the board - remove old artifacts
  await rm("dist", { recursive: true, force: true });

  console.log("Building client (Frontend)...");
  await viteBuild();

  console.log("Building server (Backend)...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  
  // Exclude deps that aren't in our bundle allowlist
  const externals = allDeps;

  await esbuild({
    // THE INTELLIGENCE: Build from your Vercel entry point
    entryPoints: ["api/index.js"], 
    platform: "node",
    bundle: true,
    format: "esm", // Use ESM for modern Vercel compatibility
    
    // THE CRITICAL FIX: Save the bundled executable to dist/index.js
    // This ensures it is NOT inside the 'public' folder.
    outfile: "dist/index.js", 
    
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("Build successful. Assets are in dist/public and server is in dist/index.js");
}

buildAll().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
