#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { resolveProjectRoot, runGit } from "../../lib/git-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Parse args: <branch-name> [root-branch]. Returns { branchName, rootBranch } or null. */
export function parseArgs(argv) {
  if (!Array.isArray(argv) || argv.length < 3) return null;
  const branchName = argv[2];
  if (!branchName || typeof branchName !== "string" || !branchName.trim()) return null;
  const rootBranch = (argv[3] ?? "main").trim() || "main";
  return { branchName: branchName.trim(), rootBranch };
}

function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    console.error("Usage: create-feature-branch.js <branch-name> [root-branch]");
    process.exit(1);
  }

  const projectRoot = resolveProjectRoot(__dirname);
  if (!fs.existsSync(path.join(projectRoot, ".git"))) {
    console.error("Error: not a git repository.");
    process.exit(1);
  }

  runGit(["checkout", parsed.rootBranch], projectRoot);
  runGit(["pull"], projectRoot);
  runGit(["checkout", "-b", parsed.branchName], projectRoot);
  console.log(parsed.branchName);
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  main();
}
