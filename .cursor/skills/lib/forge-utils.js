/**
 * Shared Forge project utilities for forge-cursor-plugin skills.
 */

import path from "path";
import fs from "fs";

/** Read and parse .forge/project.json. Returns parsed object or null. */
export function getProjectConfig(projectRoot) {
  const projectFile = path.join(projectRoot, ".forge", "project.json");
  if (!fs.existsSync(projectFile)) return null;
  try {
    const content = fs.readFileSync(projectFile, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Parse github_url from .forge/project.json to owner/repo */
export function getRepoPath(projectRoot) {
  const data = getProjectConfig(projectRoot);
  if (!data) return null;
  const url = data.github_url;
  if (!url || typeof url !== "string") return null;
  const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  return match ? `${match[1]}/${match[2]}` : null;
}
