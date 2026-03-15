/**
 * Shared git utilities for forge-cursor-plugin skills.
 */

import path from "path";
import fs from "fs";
import { spawnSync } from "child_process";

/** Resolve project root: walk up from dir to find .git directory */
export function resolveProjectRoot(dir) {
  let current = dir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(dir, "..", "..", "..", "..");
}

const PROTECTED_BRANCHES = ["main", "master", "develop"];

/** Check if branch name is protected (no direct push/commit) */
export function isProtectedBranch(branch) {
  return typeof branch === "string" && PROTECTED_BRANCHES.includes(branch.trim());
}

/** Run git command. Exits process on non-zero. */
export function runGit(args, cwd) {
  const r = spawnSync("git", args, { cwd, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Run git command, return stdout. Throws on non-zero. */
export function runGitCapture(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
  if (r.status !== 0) {
    throw new Error(r.stderr || "git command failed");
  }
  return (r.stdout || "").trim();
}

/** Get default branch (e.g. main). Returns "main" if unable to determine. */
export function getDefaultBranch(cwd) {
  const r = spawnSync("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], {
    cwd,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (r.status !== 0 || !r.stdout) return "main";
  const match = (r.stdout || "").trim().match(/refs\/remotes\/origin\/(.+)/);
  return match ? match[1].trim() : "main";
}
