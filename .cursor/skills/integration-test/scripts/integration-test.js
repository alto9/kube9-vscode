#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import { spawnSync } from "child_process";
import { resolveProjectRoot } from "../../lib/git-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main() {
  const projectRoot = resolveProjectRoot(__dirname);
  const r = spawnSync("npm", ["run", "test:integration"], { cwd: projectRoot, stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  main();
}
