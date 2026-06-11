# Build And Packaging

## Toolchain

- Node.js 22+
- TypeScript + webpack for extension host bundle and webpack-built webview bundles (describe panels, cluster manager)
- esbuild for standalone React webview bundles (Argo CD application detail, event viewer, pod logs, and others listed in `build:webview`)
- `vsce` for VSIX packaging

## Core Commands

- `npm run compile`
- `npm run build`
- `npm run test:unit`
- `npm run package`

## Webview Build Split

| Surface | Builder | Output |
|---------|---------|--------|
| Extension host (`src/extension.ts`) | webpack | `dist/extension.js` |
| Describe / cluster-manager webviews | webpack (`webpack.config.js`) | `dist/media/<surface>/index.js` |
| Argo CD application detail webview | esbuild (`build:webview`) | `media/argocd-application/main.js` |
| Kubernetes AI Conformance report webview | esbuild (`build:webview`) | `media/ai-conformance-report/main.js` |

The Argo CD application webview source lives under `src/webview/argocd-application/` and is **excluded from the extension webpack ts-loader** (`webpack.config.js` extension `module.rules` exclude) so it is not compiled twice. The esbuild entry is `src/webview/argocd-application/index.tsx`.

**esbuild invocation (see `package.json` `build:webview`):** first command bundles `src/webview/argocd-application/index.tsx` to `media/argocd-application/main.js` with `--bundle --format=iife --platform=browser --minify`.

## Argo CD Application Webview Dependencies

Browser-side graph dependencies for this webview belong in the **esbuild bundle only** (not the extension host):

- **`@xyflow/react`** — interactive graph canvas, nodes, edges, pan/zoom controls
- **Layout library** — **`@dagrejs/dagre`** (preferred; matches React Flow dagre layout examples) or **`elkjs`** if a future layout mode needs ELK; pick one primary layout engine for the initial ship

These packages are **devDependencies** bundled into `media/argocd-application/main.js`. They do not ship as separate npm runtime deps inside the VSIX beyond the single IIFE artifact.

## Shared webview header CSS (packaging contract)

All in-scope webview HTML shells must load **one canonical shipped stylesheet** for page headers:

- **Source:** `src/webview/styles/webview-header.css`
- **Shipped artifact:** `media/styles/webview-header.css` (copied on every `npm run build` / `build:webview`)
- **VSIX:** The shipped path must be included in the package (`.vscodeignore` must not exclude it). Production panels must **not** link to unpackaged `src/webview/styles/` URIs.

**Delivery:** Shell HTML may **link** the shipped file (with `localResourceRoots` including `media/styles/`) or **inline** CSS read from the shipped path at build or panel generation time. Legacy inline generators and React shells both depend on this artifact.

**CI gate:** After `npm run package`, CI **fails** if `webview-header.css` is missing from the VSIX artifact (automated assert on the packaged file path).

**Consolidation:** Duplicate shell-scoped `!important` header overrides in individual panels should fold into the shared file or one optional `webview-header-overrides.css` shipped alongside the base file when shells converge.

## CSS Load Order (Argo CD Application Webview)

The webview HTML is assembled in `ArgoCDApplicationWebviewProvider.getWebviewContent`. Styles must load in this order so React Flow base rules apply before kube9 overrides:

1. **`media/styles/webview-header.css`** (shared header styles; shipped artifact)
2. **React Flow base stylesheet** — `@xyflow/react/dist/style.css`, copied or linked from `media/argocd-application/` at build time (do not rely on bundler-injected CSS alone; CSP and load order are explicit in HTML)
3. **Application styles** — `src/webview/argocd-application/styles.css` copied to `media/argocd-application/styles.css` by `build:webview` and linked from HTML (graph tile, theme tokens, layout chrome)
4. **Script last** — `media/argocd-application/main.js`

Graph-specific overrides (node tiles, edge dash patterns, toolbar) belong in application styles, not in forked React Flow CSS.

## Bundle Size Expectations

| Artifact | Without graph stack | With `@xyflow/react` + layout lib |
|----------|----------------------|-----------------------------------|
| `media/argocd-application/main.js` | Order of ~160 KB minified (React tab UI) | Target **≤ 450 KB** minified; justify growth in release notes if adding graph UI; prefer tree-shaking and lazy layout import if the budget is exceeded |

**Rationale:** The canvas and layout libraries are user-facing value for topology; they stay out of the extension host bundle and ship as one minified IIFE so install size stays predictable relative to other webview copies in `build:webview`.

`build:webview` runs with esbuild **`--minify`**. There is no separate size gate in CI today; maintainers should spot-check the Argo CD bundle after dependency changes. The VSIX total size should remain acceptable for marketplace download; this webview artifact is the primary size growth vector when graph dependencies are present.

## Kubernetes AI Conformance Report Webview

The conformance report follows the existing operator report bundle pattern:

- React source under `src/webview/ai-conformance-report/`.
- Host panel/provider source under `src/webview/AIConformanceReportPanel.ts` or equivalent.
- Tree category source under `src/tree/categories/reports/`.
- Built artifact under `media/ai-conformance-report/main.js`, with `styles.css` copied beside it when the surface uses a separate stylesheet.

`npm run build:webview` must include the conformance report bundle and style copy before the feature is considered packaged. `npm run build`, `npm run compile`, and CI must therefore exercise the new webview bundle. If packaging adds a new media path, `.vscodeignore` must continue to include `media/` artifacts in the VSIX.

## Packaging Contract

Release artifacts are VSIX packages built from current repository state. Versioning and publishing run in **[Cut Release](../../.github/workflows/cut-release.yml)** (`workflow_dispatch`), which maintainers start manually after merges to `main`; semantic-release updates the version and changelog before marketplaces publish.

`npm run build` and `npm run compile` both invoke `build:webview`, so Argo CD application webview bundle changes are included in local builds, CI test runs, and release packages.

## Shared webview header CSS

- **Source of truth:** `src/webview/styles/webview-header.css` (edited by developers; excluded from the VSIX via `.vscodeignore` `src/**`).
- **Shipped copy:** `build:webview` runs `mkdir -p media/styles` and copies the file to `media/styles/webview-header.css`, which is included in the VSIX because `media/` is not ignored.
- **CI gate:** After `npm run package`, CI runs `scripts/verify-vsix-header-css.sh` (also `npm run verify:vsix-header-css`) and fails the **Build Extension** job if the VSIX zip lacks `extension/media/styles/webview-header.css` (vsce `extension/` root prefix inside the archive).
