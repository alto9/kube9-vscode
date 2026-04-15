# Build And Packaging

## Toolchain

- Node.js 22+
- TypeScript + webpack for extension bundle
- esbuild for webview bundles
- `vsce` for VSIX packaging

## Core Commands

- `npm run compile`
- `npm run build`
- `npm run test:unit`
- `npm run package`

## Packaging Contract

Release artifacts are VSIX packages built from current repository state. Versioning and publishing run in the **Release** GitHub Actions workflow, which maintainers start manually (`workflow_dispatch`) after merges to `main`; semantic-release updates the version and changelog before marketplaces publish.
