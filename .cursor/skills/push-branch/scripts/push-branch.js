#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import { resolveProjectRoot, isProtectedBranch, runGitCapture, runGit } from "../../lib/git-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function main() {
  const projectRoot = resolveProjectRoot(__dirname);
  const branch = runGitCapture(["rev-parse", "--abbrev-ref", "HEAD"], projectRoot);
  if (isProtectedBranch(branch)) {
    console.error("Error: cannot push main branch directly.");
    process.exit(1);
  }

  runGit(["fetch", "origin"], projectRoot);
  const lsOut = runGitCapture(["ls-remote", "--heads", "origin", branch], projectRoot);
  const hasRemote = lsOut.length > 0;
  if (hasRemote) {
    runGit(["push", "origin", "HEAD"], projectRoot);
  } else {
    runGit(["push", "-u", "origin", "HEAD"], projectRoot);
  }
  console.log("Pushed successfully.");
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  main();
}
