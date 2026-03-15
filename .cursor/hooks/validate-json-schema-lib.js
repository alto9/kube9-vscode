/**
 * Shared validation logic for .forge JSON schema validation.
 * Exported for unit testing.
 */

import fs from "fs";
import path from "path";

export function parsePayload(raw) {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getRepoRoot(dirname) {
  return path.resolve(dirname, "..", "..");
}

export function resolveTargetPath(payload, repoRoot, argv) {
  const candidates = [
    payload.file_path,
    payload.filePath,
    payload.target_file,
    payload.targetFile,
    argv?.[2]
  ];

  const filePath = candidates.find((c) => typeof c === "string" && c.trim().length > 0);
  if (!filePath) return null;

  return path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(repoRoot, filePath);
}

export function inferSchemaPath(repoRoot, targetPath) {
  const normalizedTarget = path.resolve(targetPath);
  const forgeDir = path.resolve(repoRoot, ".forge");
  const forgeDirPrefix = forgeDir + path.sep;
  if (!normalizedTarget.startsWith(forgeDirPrefix)) {
    return null;
  }
  const base = path.basename(normalizedTarget);
  const schemaMap = {
    "project.json": "project.schema.json",
    "vision.json": "vision.schema.json",
    "roadmap.json": "roadmap.schema.json"
  };
  const schemaFile = schemaMap[base];
  if (!schemaFile) return null;
  return path.resolve(forgeDir, "schemas", schemaFile);
}

export function resolveLocalRef(rootSchema, ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return null;

  const pathParts = ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current = rootSchema;
  for (const part of pathParts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return null;
    }
    current = current[part];
  }
  return current;
}

export function typeName(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function matchesType(value, expected) {
  switch (expected) {
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "string":
      return typeof value === "string";
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return false;
  }
}

export function validate(instance, schema, atPath, errors, rootSchema) {
  if (schema && typeof schema.$ref === "string") {
    const resolvedSchema = resolveLocalRef(rootSchema, schema.$ref);
    if (!resolvedSchema) {
      errors.push(`${atPath}: could not resolve local schema reference ${JSON.stringify(schema.$ref)}`);
      return;
    }
    validate(instance, resolvedSchema, atPath, errors, rootSchema);
    return;
  }

  const expectedType = schema.type;
  if (typeof expectedType === "string" && !matchesType(instance, expectedType)) {
    errors.push(`${atPath}: expected ${expectedType}, got ${typeName(instance)}`);
    return;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(instance)) {
    errors.push(`${atPath}: value ${JSON.stringify(instance)} is not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (typeof instance === "string") {
    if (Number.isInteger(schema.minLength) && instance.length < schema.minLength) {
      errors.push(`${atPath}: string length must be >= ${schema.minLength}`);
    }
    if (typeof schema.pattern === "string") {
      const re = new RegExp(schema.pattern);
      if (!re.test(instance)) {
        errors.push(`${atPath}: string does not match pattern ${JSON.stringify(schema.pattern)}`);
      }
    }
  }

  if (Array.isArray(instance)) {
    if (Number.isInteger(schema.minItems) && instance.length < schema.minItems) {
      errors.push(`${atPath}: array length must be >= ${schema.minItems}`);
    }
    if (schema.items && typeof schema.items === "object") {
      instance.forEach((item, idx) => validate(item, schema.items, `${atPath}[${idx}]`, errors, rootSchema));
    }
  }

  if (instance && typeof instance === "object" && !Array.isArray(instance)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in instance)) {
          errors.push(`${atPath}: missing required property ${JSON.stringify(key)}`);
        }
      }
    }

    const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};

    for (const [key, subSchema] of Object.entries(props)) {
      if (key in instance && subSchema && typeof subSchema === "object") {
        validate(instance[key], subSchema, `${atPath}.${key}`, errors, rootSchema);
      }
    }

    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(props));
      for (const key of Object.keys(instance)) {
        if (!allowed.has(key)) {
          errors.push(`${atPath}: unexpected property ${JSON.stringify(key)}`);
        }
      }
    }
  }
}

export function relPath(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath) || targetPath;
}

export function runValidation(repoRoot, targetPath, schemaPath) {
  if (!fs.existsSync(schemaPath) || !fs.existsSync(targetPath)) {
    return { ok: false, error: "file not found" };
  }
  let schema;
  let instance;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (err) {
    return { ok: false, error: `Failed reading schema: ${err.message}` };
  }
  try {
    instance = JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${err.message}` };
  }
  const errors = [];
  validate(instance, schema, "$", errors, schema);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
