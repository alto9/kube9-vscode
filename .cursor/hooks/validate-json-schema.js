#!/usr/bin/env node

import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import {
  parsePayload,
  getRepoRoot,
  resolveTargetPath,
  inferSchemaPath,
  relPath,
  runValidation
} from "./validate-json-schema-lib.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

async function main() {
  const repoRoot = getRepoRoot(__dirname);
  const payload = parsePayload(await readStdin());
  const targetPath = resolveTargetPath(payload, repoRoot, process.argv);
  if (!targetPath) {
    process.exit(0);
  }

  const schemaPath = inferSchemaPath(repoRoot, targetPath);
  if (!schemaPath) {
    process.exit(0);
  }

  if (!fs.existsSync(schemaPath)) {
    process.exit(0);
  }

  if (!fs.existsSync(targetPath)) {
    process.exit(0);
  }

  const result = runValidation(repoRoot, targetPath, schemaPath);

  if (!result.ok) {
    if (result.error) {
      console.error(`[schema-hook] ${result.error}`);
    }
    if (result.errors && result.errors.length > 0) {
      console.error(
        `[schema-hook] Validation failed for ${relPath(repoRoot, targetPath)} against ${relPath(repoRoot, schemaPath)}`
      );
      for (const err of result.errors.slice(0, 30)) {
        console.error(`  - ${err}`);
      }
      if (result.errors.length > 30) {
        console.error(`  - ... and ${result.errors.length - 30} more errors`);
      }
    }
    process.exit(1);
  }

  console.error(`[schema-hook] OK: ${relPath(repoRoot, targetPath)} matches ${relPath(repoRoot, schemaPath)}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[schema-hook] Unexpected error: ${err.message}`);
  process.exit(1);
});
