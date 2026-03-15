#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import { resolveProjectRoot, isProtectedBranch, runGitCapture } from "../../lib/git-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Parse -m "message" from argv. Returns { message } or null if invalid. */
export function parseCommitArgs(argv) {
  if (!Array.isArray(argv) || argv.length < 3) return null;
  const mIdx = argv.indexOf("-m");
  if (mIdx === -1 || mIdx + 1 >= argv.length) return null;
  const message = argv[mIdx + 1];
  return typeof message === "string" && message.length > 0 ? { message } : null;
}

function run(cmd, cwd, options = {}) {
  return execSync(cmd, {
    cwd,
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit",
    ...options,
  });
}

function main() {
  const projectRoot = resolveProjectRoot(__dirname);

  if (!fs.existsSync(path.join(projectRoot, ".git"))) {
    console.error("Error: not a git repository.");
    process.exit(1);
  }

  const branch = runGitCapture(["rev-parse", "--abbrev-ref", "HEAD"], projectRoot);
  if (isProtectedBranch(branch)) {
    console.error("Error: cannot commit on main branch. Create a feature branch first.");
    process.exit(1);
  }

  const parsed = parseCommitArgs(process.argv);
  if (!parsed) {
    console.error('Error: pass commit message with -m "message"');
    process.exit(1);
  }

  const preCommitHook = path.join(projectRoot, ".git", "hooks", "pre-commit");
  if (fs.existsSync(preCommitHook)) {
    try {
      run(preCommitHook, projectRoot);
    } catch {
      // pre-commit may exit non-zero; continue
    }
  }

  try {
    run("npm run lint", projectRoot, { silent: true });
  } catch {
    // lint optional
  }

  try {
    run("npm run test", projectRoot, { silent: true });
  } catch {
    // test optional
  }

  execSync("git add -A", { cwd: projectRoot, stdio: "inherit" });
  execSync("git status", { cwd: projectRoot, stdio: "inherit" });
  spawnSync("git", ["commit", "-m", parsed.message], { cwd: projectRoot, stdio: "inherit" });
  console.log("Committed successfully.");
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  main();
}
