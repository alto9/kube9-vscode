/**
 * ESLint rule (legacy --rulesdir): blocks common forbid-list footguns in src/telemetry (TypeScript sources).
 * Spec: docs/telemetry-lint-guardrails.md and .forge/operations/observability.md (Never send).
 */
"use strict";

const path = require("path");

function isTelemetrySourceFile(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  return /\/src\/telemetry\/[^/]+\.ts$/.test(normalized);
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid interpolated templates and raw Error values as telemetry call arguments in the telemetry façade module.",
    },
    schema: [],
    messages: {
      noTemplateInterpolation:
        "Telemetry calls must not use template interpolation in arguments (risk of cluster/workspace leakage). Use static allowlisted literals or safe primitive props — see docs/telemetry-lint-guardrails.md.",
      noErrorIdentifier:
        "Do not pass exception objects into telemetry; map to enumerated error categories per .forge/operations/observability.md.",
      noErrorNew:
        "Do not construct or pass Error instances into telemetry payloads.",
    },
  },
  create(context) {
    if (!isTelemetrySourceFile(context.getFilename())) {
      return {};
    }

    return {
      CallExpression(node) {
        for (const arg of node.arguments) {
          if (arg.type === "TemplateLiteral" && arg.expressions.length > 0) {
            context.report({ node: arg, messageId: "noTemplateInterpolation" });
          }
          if (arg.type === "Identifier" && /^(err|error)$/i.test(arg.name)) {
            context.report({ node: arg, messageId: "noErrorIdentifier" });
          }
          if (
            arg.type === "NewExpression" &&
            arg.callee.type === "Identifier" &&
            arg.callee.name === "Error"
          ) {
            context.report({ node: arg, messageId: "noErrorNew" });
          }
        }
      },
    };
  },
};
