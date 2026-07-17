#!/usr/bin/env bash
# Assert packaged VSIX includes Argo CD application webview media.
# vsce lays extension files under extension/ in the zip (see `unzip -l *.vsix`).
set -euo pipefail

REQUIRED_ENTRIES=(
  'extension/media/argocd-application/main.js'
  'extension/media/argocd-application/style.css'
  'extension/media/argocd-application/styles.css'
)

vsix_path="${1:-}"
if [[ -z "${vsix_path}" ]]; then
  shopt -s nullglob
  matches=( *.vsix )
  shopt -u nullglob
  if [[ ${#matches[@]} -eq 0 ]]; then
    echo "verify-vsix-argocd-media: no *.vsix in $(pwd); run npm run package first or pass a VSIX path" >&2
    exit 1
  fi
  if [[ ${#matches[@]} -gt 1 ]]; then
    echo "verify-vsix-argocd-media: multiple *.vsix files; pass the path explicitly: ${matches[*]}" >&2
    exit 1
  fi
  vsix_path="${matches[0]}"
fi

if [[ ! -f "${vsix_path}" ]]; then
  echo "verify-vsix-argocd-media: file not found: ${vsix_path}" >&2
  exit 1
fi

listing="$(unzip -l "${vsix_path}" | awk '{print $4}')"
missing=()
for entry in "${REQUIRED_ENTRIES[@]}"; do
  if ! grep -Fxq "${entry}" <<<"${listing}"; then
    missing+=("${entry}")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "verify-vsix-argocd-media: ${vsix_path} is missing required entries:" >&2
  printf '  %s\n' "${missing[@]}" >&2
  echo "verify-vsix-argocd-media: ensure build:webview emits main.js, React Flow style.css, and application styles.css under media/argocd-application/" >&2
  exit 1
fi

echo "verify-vsix-argocd-media: ok (${vsix_path} contains Argo CD application webview media)"
