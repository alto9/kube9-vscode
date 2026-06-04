#!/usr/bin/env bash
# Assert packaged VSIX includes shipped webview header CSS.
# vsce lays extension files under extension/ in the zip (see `unzip -l *.vsix`).
set -euo pipefail

REQUIRED_ENTRIES=(
  'extension/media/styles/webview-header.css'
  'extension/media/styles/codicons/codicon.css'
  'extension/media/styles/codicons/codicon.ttf'
)

vsix_path="${1:-}"
if [[ -z "${vsix_path}" ]]; then
  shopt -s nullglob
  matches=( *.vsix )
  shopt -u nullglob
  if [[ ${#matches[@]} -eq 0 ]]; then
    echo "verify-vsix-header-css: no *.vsix in $(pwd); run npm run package first or pass a VSIX path" >&2
    exit 1
  fi
  if [[ ${#matches[@]} -gt 1 ]]; then
    echo "verify-vsix-header-css: multiple *.vsix files; pass the path explicitly: ${matches[*]}" >&2
    exit 1
  fi
  vsix_path="${matches[0]}"
fi

if [[ ! -f "${vsix_path}" ]]; then
  echo "verify-vsix-header-css: file not found: ${vsix_path}" >&2
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
  echo "verify-vsix-header-css: ${vsix_path} is missing required entries:" >&2
  printf '  %s\n' "${missing[@]}" >&2
  echo "verify-vsix-header-css: ensure build:webview copies header CSS and codicons into media/styles/" >&2
  exit 1
fi

echo "verify-vsix-header-css: ok (${vsix_path} contains shipped header CSS and codicons)"
