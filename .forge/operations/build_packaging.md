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

Release artifacts are VSIX packages built from current repository state and published through CI after semantic-release versioning.
