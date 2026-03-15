#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { spawnSync } from "child_process";
import { resolveProjectRoot, runGit, getDefaultBranch } from "../../lib/git-utils.js";
import { getProjectConfig } from "../../lib/forge-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve code_path from project.json to absolute path. */
export function resolveCodePath(projectRoot, codePath) {
  if (!codePath || codePath === ".") return projectRoot;
  if (path.isAbsolute(codePath)) return codePath;
  return path.join(projectRoot, codePath.replace(/^\.\//, ""));
}

/** Detect package manager from lockfile and run install. */
function runInstall(cwd) {
  const pnpmLock = path.join(cwd, "pnpm-lock.yaml");
  const yarnLock = path.join(cwd, "yarn.lock");
  let r;
  if (fs.existsSync(pnpmLock)) {
    r = spawnSync("pnpm", ["i"], { cwd, stdio: "inherit" });
  } else if (fs.existsSync(yarnLock)) {
    r = spawnSync("yarn", ["install"], { cwd, stdio: "inherit" });
  } else {
    r = spawnSync("npm", ["i"], { cwd, stdio: "inherit" });
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function main() {
  const projectRoot = resolveProjectRoot(__dirname);
  const config = getProjectConfig(projectRoot);
  if (!config) {
    console.error("Error: .forge/project.json not found");
    process.exit(1);
  }

  const codePath = resolveCodePath(projectRoot, config.code_path ?? ".");
  if (!fs.existsSync(path.join(codePath, ".git"))) {
    console.error("Error: code_path is not a git repository");
    process.exit(1);
  }

  const defaultBranch = getDefaultBranch(codePath);
  runGit(["checkout", defaultBranch], codePath);
  runGit(["pull"], codePath);
  runInstall(codePath);
  console.log(`Ready. On ${defaultBranch}, up to date, dependencies installed.`);
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  main();
}
