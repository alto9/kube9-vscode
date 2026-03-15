#!/usr/bin/env node

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Recursively collect paths from knowledge_map node. */
export function collectPaths(node, paths = new Set()) {
  if (typeof node === "string") {
    paths.add(node);
    return paths;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectPaths(item, paths);
    }
    return paths;
  }
  if (node && typeof node === "object") {
    const primary = node.primary_doc;
    if (typeof primary === "string") paths.add(primary);
    const children = node.children;
    if (Array.isArray(children)) {
      for (const item of children) {
        collectPaths(item, paths);
      }
    }
    return paths;
  }
  return paths;
}

function usage() {
  console.log("Usage: init-forge.js [target-project-path]");
  console.log("");
  console.log("Scaffold .forge files from skills/init-forge/references/knowledge_map.json.");
  console.log("If target-project-path is omitted, current working directory is used.");
}

function main() {
  const arg = process.argv[2];
  if (arg === "-h" || arg === "--help") {
    usage();
    return;
  }

  const skillRoot = path.resolve(__dirname, "..");
  const mapFile = path.join(skillRoot, "references", "knowledge_map.json");
  const skillRegistryAsset = path.join(skillRoot, "references", "skill_registry.json");
  const targetRoot = arg ? path.resolve(arg) : process.cwd();

  if (!fs.existsSync(mapFile)) {
    console.error(`Error: knowledge map not found at ${mapFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(skillRegistryAsset)) {
    console.error(`Error: static skill registry asset not found at ${skillRegistryAsset}`);
    process.exit(1);
  }

  let data;
  try {
    const content = fs.readFileSync(mapFile, "utf8");
    data = JSON.parse(content);
  } catch (err) {
    console.error(`Error: failed to read knowledge map: ${err.message}`);
    process.exit(1);
  }

  const paths = collectPaths(data.knowledge_map || []);
  const sortedPaths = [...paths].sort();

  if (sortedPaths.length === 0) {
    console.log("No paths found in knowledge map. Nothing to do.");
    return;
  }

  const created = [];
  const updated = [];
  const existing = [];
  const skipped = [];

  const assetPaths = new Set([".forge/skill_registry.json", ".forge/knowledge_map.json"]);
  const assetContent = fs.readFileSync(skillRegistryAsset, "utf8");
  const mapContent = fs.readFileSync(mapFile, "utf8");

  for (const rel of sortedPaths) {
    const relPath = path.normalize(rel).replace(/\\/g, "/");
    if (path.isAbsolute(relPath) || relPath.includes("..")) {
      skipped.push(rel);
      continue;
    }

    const outPath = path.resolve(targetRoot, relPath);
    const targetRootNorm = path.resolve(targetRoot);
    const relative = path.relative(targetRootNorm, outPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      skipped.push(rel);
      continue;
    }

    const parentDir = path.dirname(outPath);
    fs.mkdirSync(parentDir, { recursive: true });

    const relNorm = relPath.replace(/\\/g, "/");
    const isAsset = assetPaths.has(relNorm);

    if (isAsset) {
      const existed = fs.existsSync(outPath);
      if (relNorm === ".forge/skill_registry.json") {
        fs.writeFileSync(outPath, assetContent, "utf8");
      } else {
        fs.writeFileSync(outPath, mapContent, "utf8");
      }
      const relToTarget = path.relative(targetRoot, outPath);
      if (existed) {
        updated.push(relToTarget);
      } else {
        created.push(relToTarget);
      }
      continue;
    }

    if (fs.existsSync(outPath)) {
      existing.push(path.relative(targetRoot, outPath));
      continue;
    }

    const ext = path.extname(outPath).toLowerCase();
    if (ext === ".json") {
      fs.writeFileSync(outPath, "{}\n", "utf8");
    } else {
      fs.writeFileSync(outPath, "", "utf8");
    }
    created.push(path.relative(targetRoot, outPath));
  }

  console.log(`Forge init complete in: ${targetRoot}`);
  console.log(`Created files: ${created.length}`);
  if (updated.length > 0) {
    console.log(`Updated assets: ${updated.length}`);
  }
  console.log(`Existing files (unchanged): ${existing.length}`);
  if (skipped.length > 0) {
    console.log(`Skipped unsafe paths: ${skipped.length}`);
  }
  if (created.length > 0) {
    console.log("\nCreated:");
    for (const p of created) {
      console.log(`  - ${p}`);
    }
  }
  if (updated.length > 0) {
    console.log("\nUpdated (canonical assets):");
    for (const p of updated) {
      console.log(`  - ${p}`);
    }
  }
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMainModule) {
  main();
}
