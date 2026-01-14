# [1.22.0](https://github.com/alto9/kube9-vscode/compare/v1.21.1...v1.22.0) (2026-01-14)


### Bug Fixes

* close all webviews unconditionally when switching contexts ([dbf4cb2](https://github.com/alto9/kube9-vscode/commit/dbf4cb20193a10e59b36b0fc81172b3152df31ba))
* enable ESM imports in tests and align pre-push hook with GitHub Actions ([9cfd4dc](https://github.com/alto9/kube9-vscode/commit/9cfd4dcc0b9d3af10d307fcf92b3c76ae1f9ed95))
* improve context switching UX and namespace integration ([b5d82f7](https://github.com/alto9/kube9-vscode/commit/b5d82f78992dce1cf695765f503209993b5169cb))
* properly close all webview panels when switching contexts ([5d61176](https://github.com/alto9/kube9-vscode/commit/5d61176a168e5cf54c8bcd50bce1cc1874370c25))
* re-parse kubeconfig after context switch to update tree view ([5ad9b84](https://github.com/alto9/kube9-vscode/commit/5ad9b8413a6f513ae2888fcab3ae26246ea7554e))
* update contextValue when restoring cached cluster status ([00d60fa](https://github.com/alto9/kube9-vscode/commit/00d60fae33809db8235fd531a2758092cc3e523b))


### Features

* add kubectl context switching from VS Code ([1eb8711](https://github.com/alto9/kube9-vscode/commit/1eb8711e93215f354b37e254ac566fb9ad442b0b)), closes [#8](https://github.com/alto9/kube9-vscode/issues/8)

## [1.21.1](https://github.com/alto9/kube9-vscode/compare/v1.21.0...v1.21.1) (2026-01-09)


### Bug Fixes

* explicitly set owner parameter in GitHub App token step ([3b20767](https://github.com/alto9/kube9-vscode/commit/3b20767b4e2aebe5bce9b696a0aafff963b13e0c))
* remove comment from repositories list in GitHub App token step ([6858fc9](https://github.com/alto9/kube9-vscode/commit/6858fc972d4bfcc0599ecd6ed0d7392edc3b0f46))

# [1.21.0](https://github.com/alto9/kube9-vscode/compare/v1.20.1...v1.21.0) (2026-01-09)


### Bug Fixes

* improve Helm installation error handling ([ecfab9e](https://github.com/alto9/kube9-vscode/commit/ecfab9e60feef0719f615626955ebabab8859252))


### Features

* add automatic polling for Helm release status updates ([cb74d79](https://github.com/alto9/kube9-vscode/commit/cb74d79b66ab9ff18cd49d9e81daece5eb954686))
* add Helm Package Manager tree item ([d747f32](https://github.com/alto9/kube9-vscode/commit/d747f32304a0085e65b8d671920c3836268be119))
* add YAML values editor to Helm chart installation form ([a2ee4d9](https://github.com/alto9/kube9-vscode/commit/a2ee4d920e7984ee053a2a2025e04b5e0c2a48d5))
* create Helm Package Manager webview panel infrastructure ([335b4e9](https://github.com/alto9/kube9-vscode/commit/335b4e9e7e6749ea7126dcf18a8c571690faa6d5))
* create HelmService class with CLI integration ([ac9b0ea](https://github.com/alto9/kube9-vscode/commit/ac9b0ead365ae693f256b141f80660af5b72fe8f))
* create React app structure for Helm Package Manager webview ([6119802](https://github.com/alto9/kube9-vscode/commit/6119802fac9ecbce80fffe7ad8ffb966b62fd6f4))
* **helm:** implement package manager UI sections (005) ([02ad6ed](https://github.com/alto9/kube9-vscode/commit/02ad6ed9e4986ca09ef5288d3092b2a74232f342))
* implement basic chart installation form modal ([36d2e87](https://github.com/alto9/kube9-vscode/commit/36d2e87e6d9fd066c34a20c24c299d4342988e95))
* implement chart detail modal ([4a6ae6e](https://github.com/alto9/kube9-vscode/commit/4a6ae6e019d7063d5d45949ceba2e212fa328c2d))
* implement chart discovery commands for Helm Package Manager ([558d79b](https://github.com/alto9/kube9-vscode/commit/558d79bc4993dc6ffe185db7b3f3a0d690c7dfe0))
* implement comprehensive error handling for Helm Package Manager ([09e8293](https://github.com/alto9/kube9-vscode/commit/09e8293bfbb84695dbb65be495ac1b56d9b0d9b1))
* implement Helm chart installation command ([c5ae660](https://github.com/alto9/kube9-vscode/commit/c5ae660a1a9acd6c82afada5cfef855163a2324a))
* implement Helm release management commands ([84b7862](https://github.com/alto9/kube9-vscode/commit/84b786250a97a3b81c54b5ae41661cec9993d44c))
* implement operator install modal with Pro tier support ([b79423c](https://github.com/alto9/kube9-vscode/commit/b79423c7bbf7a0e416131b7bd18df8562575de5f))
* implement operator status detection for Helm Package Manager ([528e667](https://github.com/alto9/kube9-vscode/commit/528e6678b67d69f10bfc43cf6e05f17b832efb44))
* implement release detail modal with tabbed interface ([13811a6](https://github.com/alto9/kube9-vscode/commit/13811a60e54a08e21006276fa0e108a53f0d0ae5))
* implement repository add and confirm modals ([e6e80e3](https://github.com/alto9/kube9-vscode/commit/e6e80e3d6fc2d0b3394aefe4aba9f260a2f45420))
* implement repository management commands for Helm Package Manager ([c9e8759](https://github.com/alto9/kube9-vscode/commit/c9e8759bdf85b57fa616b37c1e85ff4e93c35546))
* implement state persistence and caching for Helm Package Manager ([387721e](https://github.com/alto9/kube9-vscode/commit/387721e42cdfbfcfcedfb8b95eb37ebbff5ea8a2))
* implement upgrade release modal ([c5f8504](https://github.com/alto9/kube9-vscode/commit/c5f8504bbab8dff45c0aa18e5e16221987e1a007))

## [1.20.1](https://github.com/alto9/kube9-vscode/compare/v1.20.0...v1.20.1) (2026-01-08)

# [1.20.0](https://github.com/alto9/kube9-vscode/compare/v1.19.0...v1.20.0) (2026-01-08)


### Bug Fixes

* align health column in namespace workloads table ([c55d057](https://github.com/alto9/kube9-vscode/commit/c55d057a60b4511a4c25490daf3e4ac03abb3710))
* debug config and namespace describe webview ([494e7ec](https://github.com/alto9/kube9-vscode/commit/494e7ecb18ff973989d96f98c1da7943fde98bdb))
* use shared describe webview for namespace tree items ([9fbf8e4](https://github.com/alto9/kube9-vscode/commit/9fbf8e4d4ca7080c64a817cdaf025ba877e2802a))


### Features

* add Events tab to namespace describe webview ([cad366d](https://github.com/alto9/kube9-vscode/commit/cad366d6ced08a32b8339785ad7c4da85cb39917))
* add limit ranges tab component ([7a3671a](https://github.com/alto9/kube9-vscode/commit/7a3671aef7b1da855ed7049f2f18197cb92a3732))
* add namespace describe webview integration ([cc5e25d](https://github.com/alto9/kube9-vscode/commit/cc5e25d55c7f7e7fdcb44a65e55b6baa08efc2f3))
* add NamespaceDescribeProvider foundation ([a29f8ad](https://github.com/alto9/kube9-vscode/commit/a29f8adad2d2f8a15c824a58abaadcb4245a00fe))
* add NamespaceTreeItem with describe command ([e5b477e](https://github.com/alto9/kube9-vscode/commit/e5b477edb3e283c1daa27e8d17a26b2bf6460086))
* add overview tab to namespace describe webview ([e5fc1e8](https://github.com/alto9/kube9-vscode/commit/e5fc1e89a4114fb6d293ed21484eca9540eaf1a2))
* add Quotas tab component for namespace describe webview ([234fdb7](https://github.com/alto9/kube9-vscode/commit/234fdb7a81023a208024321447a683374f6bc5b8))
* add Resources tab to Namespace Describe webview ([38aed90](https://github.com/alto9/kube9-vscode/commit/38aed907ded8d24da7b8c2f4eccfec30cbf07d04))
* implement namespace events fetching and formatting ([8ef9776](https://github.com/alto9/kube9-vscode/commit/8ef97763bae6a80d06a9bb59c1a1355c608e1f28))
* implement namespace message handlers in describe webview ([ea6c463](https://github.com/alto9/kube9-vscode/commit/ea6c463572ad66462e84512d7898ca31929cd41a))
* implement resource counting for namespace describe webview ([fdad876](https://github.com/alto9/kube9-vscode/commit/fdad876d897e741124002edff842800bbabf2b9b))
* implement resource quota and limit range fetching for namespace describe ([97d92ef](https://github.com/alto9/kube9-vscode/commit/97d92ef03ffac9c2d1c83d693df1f1c916863d86))
* **namespace-describe:** create React app base component for namespace describe webview ([e206a09](https://github.com/alto9/kube9-vscode/commit/e206a09567635055266716e0395f00ecf077dcba))

# [1.19.0](https://github.com/alto9/kube9-vscode/compare/v1.18.3...v1.19.0) (2026-01-07)


### Features

* add context menu help commands for pods, deployments, and services ([4210d92](https://github.com/alto9/kube9-vscode/commit/4210d92c97cdcce8c87fce60b521102ad249d167))
* add context menu help items for pods, deployments, and services ([2db7cc8](https://github.com/alto9/kube9-vscode/commit/2db7cc8116bc84d88189ff0645bb51cc3d744d7c))
* add help button to webview templates ([8fd0bc1](https://github.com/alto9/kube9-vscode/commit/8fd0bc105f02d63a82c052b0f7ef18ecba23950d))
* add HelpController class for centralized help functionality ([89cb39f](https://github.com/alto9/kube9-vscode/commit/89cb39fc11eaba72a363ba128221ce882792a68f))
* add reusable help button component for webviews ([f6097ba](https://github.com/alto9/kube9-vscode/commit/f6097ba98e1b5595e0877379c5489e9d4893043b))
* add showErrorWithHelp static method to ErrorHandler ([f54ea08](https://github.com/alto9/kube9-vscode/commit/f54ea0861ec9773cfda73fa4c7195cd567d0703c))
* add webview help message handler for contextual documentation ([7bfdb06](https://github.com/alto9/kube9-vscode/commit/7bfdb06a36e316f4f5dde16c4959792844dde2d2))
* create help status bar item ([af44759](https://github.com/alto9/kube9-vscode/commit/af44759366b706637de4d75dd0910af30bb2181e))
* integrate HelpController in extension activation ([0e02341](https://github.com/alto9/kube9-vscode/commit/0e02341649ec538a2ac139bccb79df9c7e9a003a))
* register help commands in package.json ([19c5868](https://github.com/alto9/kube9-vscode/commit/19c5868a33b2308d1a92e591f69d2f2bbe652cb7))

## [1.18.3](https://github.com/alto9/kube9-vscode/compare/v1.18.2...v1.18.3) (2026-01-06)


### Bug Fixes

* apply all resources from multi-document YAML files ([d72f92b](https://github.com/alto9/kube9-vscode/commit/d72f92be5717f39785669c1c5ff3cf1f9ecd6157))
* default missing namespace to 'default' for namespaced resources ([1b77f4b](https://github.com/alto9/kube9-vscode/commit/1b77f4bdfc7bab896b5c28c7d2f9ab06ac2715bc))
* implement proper dry-run validation for apply operations ([8b30d34](https://github.com/alto9/kube9-vscode/commit/8b30d345e3a8abe5c3ee172704e942896d97a403))
* update tutorial webview ([063d950](https://github.com/alto9/kube9-vscode/commit/063d95010f279ffbdcb6714372297171d1ca1bb8))

## [1.18.2](https://github.com/alto9/kube9-vscode/compare/v1.18.1...v1.18.2) (2026-01-04)


### Bug Fixes

* **cluster-manager:** improve usability with rename buttons, context menus, and drag-drop reordering ([ef62963](https://github.com/alto9/kube9-vscode/commit/ef62963afcbb7f6b2bb36578ce2f4f3535456d91))
* remove unused variable in clusterManagerReorder test ([532614c](https://github.com/alto9/kube9-vscode/commit/532614c9ae7f8d178fd6d2740d5e3828c76736c9))

## [1.18.1](https://github.com/alto9/kube9-vscode/compare/v1.18.0...v1.18.1) (2026-01-04)


### Bug Fixes

* **event-viewer:** prevent Kubernetes event types from being sent to operator CLI ([e2c714d](https://github.com/alto9/kube9-vscode/commit/e2c714d197d70bcffb5ad17cea21ed5ba3563522))
* **event-viewer:** remove Go to Resource and View YAML buttons ([a02000c](https://github.com/alto9/kube9-vscode/commit/a02000c5c7ab644df33983f1c94397a6acaa7b85))
* **event-viewer:** resolve filters panel, row overlap, and resize scrolling issues ([6f7697e](https://github.com/alto9/kube9-vscode/commit/6f7697e91e4c448a0ef3814199ccac00795d8bbd))
* **event-viewer:** resolve UI issues - filters panel, row overlap, and resize scrolling ([0e9e92d](https://github.com/alto9/kube9-vscode/commit/0e9e92da2761032e095cfc066af3d257f57c4909))

# [1.18.0](https://github.com/alto9/kube9-vscode/compare/v1.17.0...v1.18.0) (2026-01-04)


### Bug Fixes

* add namespace support to describeRaw command and fix Uri mock ([05b549b](https://github.com/alto9/kube9-vscode/commit/05b549b45458ce3a28c3e5116e5127413fed80a3))


### Features

* add namespace expansion tracking for tutorial Step 3 ([6e7e678](https://github.com/alto9/kube9-vscode/commit/6e7e678c2db91076152652cde5a2114ed0ef36e7))
* add show tutorial command for walkthrough replay ([fa9ce7d](https://github.com/alto9/kube9-vscode/commit/fa9ce7dcff8555e59d5b23ee60e3770257ad7758))
* add start tutorial button to welcome screen ([b8806a6](https://github.com/alto9/kube9-vscode/commit/b8806a69febd9dd54cb71f3787539ea3d90fe896))
* add walkthrough contribution for interactive tutorial step 1 ([cfaead7](https://github.com/alto9/kube9-vscode/commit/cfaead713ceadf6e09cdde8dba7f164a386babb0)), closes [001-add-walkthrou#contribution-step1](https://github.com/001-add-walkthrou/issues/contribution-step1)
* add walkthrough steps 2-3 for interactive tutorial ([fc412f5](https://github.com/alto9/kube9-vscode/commit/fc412f5b8472b65312ef5e6637bcb1d6869d9737))
* add walkthrough steps 4-5 for resource viewing and pod logs ([27ab168](https://github.com/alto9/kube9-vscode/commit/27ab168277e0423b357b5c9dc0afec19b9a21301)), closes [003-add-walkthrou#steps4-5](https://github.com/003-add-walkthrou/issues/steps4-5)
* add walkthrough steps 6-7 for resource management and documentation ([175d586](https://github.com/alto9/kube9-vscode/commit/175d58610c6233b429011bee32739e4651989cd8)), closes [004-add-walkthrou#steps6-7](https://github.com/004-add-walkthrou/issues/steps6-7)
* handle start tutorial message from welcome screen ([c751275](https://github.com/alto9/kube9-vscode/commit/c7512753c01d1d3da425fcfbbd90c535d40b082a))
* implement pod click tracking for tutorial step 4 ([753b266](https://github.com/alto9/kube9-vscode/commit/753b266acfd8f30e3a5c262c0f84730a335ced8d))
* implement tutorial completion state management ([4edf566](https://github.com/alto9/kube9-vscode/commit/4edf566216dd8180eb54eb915f951518d0fad9f4))
* register Step 4 fallback command for tutorial ([2ae8a9a](https://github.com/alto9/kube9-vscode/commit/2ae8a9a665d86b7b59b6c5d71cbf8ed95da3fe45))
* **tutorial:** register step 3 fallback command ([9fab42b](https://github.com/alto9/kube9-vscode/commit/9fab42bdff6605bc837f33d6cc340e648d6882da))

# [1.17.0](https://github.com/alto9/kube9-vscode/compare/v1.16.0...v1.17.0) (2026-01-02)


### Features

* add copy cluster ID handler to health report panel ([1888633](https://github.com/alto9/kube9-vscode/commit/188863379ffbee2dce27b45b119e541489bd4586))
* create React component for operator health report webview ([494a8c7](https://github.com/alto9/kube9-vscode/commit/494a8c730414c5b1651a974b18a5f720e2eee95c))
* integrate OperatorStatusClient in HealthReportPanel ([a8d1d52](https://github.com/alto9/kube9-vscode/commit/a8d1d52c77fa7832b678094f080eaa3d722ea4da))

# [1.16.0](https://github.com/alto9/kube9-vscode/compare/v1.15.0...v1.16.0) (2026-01-02)


### Bug Fixes

* enhance describe raw tab title to include namespace for deployments ([dcd2b1d](https://github.com/alto9/kube9-vscode/commit/dcd2b1dfada1e11e530a7e6fe75004bfd2c52f27))
* prevent duplicate tabs when switching between node and deployment webviews ([f5a7071](https://github.com/alto9/kube9-vscode/commit/f5a7071efab3f8edc05c32751f42571f0ecdbfdd))
* **test:** fix vscode mock extensions API for test compatibility ([ea6254f](https://github.com/alto9/kube9-vscode/commit/ea6254fac2b6d8ebb31daef7e99918400729dab4))


### Features

* add deployment describe data transformer ([0fe6e6d](https://github.com/alto9/kube9-vscode/commit/0fe6e6daeb9ace7f76ca77f6c0275dda97b51485))
* add deployment utility functions for resource parsing and time formatting ([95b4562](https://github.com/alto9/kube9-vscode/commit/95b4562ac65bf793154e7001e3cd833688c62800))
* add getDeploymentDetails method to WorkloadCommands ([1d226f2](https://github.com/alto9/kube9-vscode/commit/1d226f2a5d1098096d534c2311520c510d9c7a10))
* add getDeploymentEvents method to WorkloadCommands ([1ff117c](https://github.com/alto9/kube9-vscode/commit/1ff117cd746a8c060c31a6b156920d49872acfa6))
* add getRelatedReplicaSets method to WorkloadCommands ([9f947ab](https://github.com/alto9/kube9-vscode/commit/9f947ab1b4a342c09193e1ae00525a8c510039fc))
* add HTML structure and styles for deployment describe webview ([441a1e3](https://github.com/alto9/kube9-vscode/commit/441a1e39253aafc82ce07c4e19a3b5d4b2af8ce1))
* add ReplicaSet navigation from deployment describe webview ([45cdfa5](https://github.com/alto9/kube9-vscode/commit/45cdfa57132d4ffa5c60a334e172c6bd4eb53cba))
* create DeploymentDescribeWebview class ([39971a6](https://github.com/alto9/kube9-vscode/commit/39971a6b54c029cbbf01979cb7fcb4f8d79d9a29))
* implement deployment webview rendering logic ([1e293d2](https://github.com/alto9/kube9-vscode/commit/1e293d2876f70708321a888b9833943d75733d24))
* route deployments to DeploymentDescribeWebview in DescribeWebview ([66a5312](https://github.com/alto9/kube9-vscode/commit/66a531299722ccf5f7c8f419d999a79000c1fc32))

# [1.15.0](https://github.com/alto9/kube9-vscode/compare/v1.14.0...v1.15.0) (2026-01-02)


### Bug Fixes

* add error handling to ClusterTreeProvider with graceful degradation ([2652e7d](https://github.com/alto9/kube9-vscode/commit/2652e7dd71671db7ed136962327a27461445ab04))


### Features

* add error commands for tree item context menu ([c8cf1ec](https://github.com/alto9/kube9-vscode/commit/c8cf1ec0df446a4ed4ae81ffa2307f267ab052b0))
* add error handling configuration and commands to package.json ([0357ea5](https://github.com/alto9/kube9-vscode/commit/0357ea5f0b66fc61c12930254c95c63b8ff026e3))
* add error types and interfaces for error handling system ([1675fca](https://github.com/alto9/kube9-vscode/commit/1675fcac031241b6f184c19862ed98e7e471103a))
* add ErrorTreeItem class for tree view error display ([30d2588](https://github.com/alto9/kube9-vscode/commit/30d25882e520343cb8d375a21e0622e87927e379))
* add OutputPanelLogger singleton for structured error logging ([0f32f55](https://github.com/alto9/kube9-vscode/commit/0f32f55ee995f9b2e34e89c65fd4e7550967ea76))
* add specific error handlers for connection, RBAC, not found, timeout, and API errors ([8170b82](https://github.com/alto9/kube9-vscode/commit/8170b82e08de07675ca8aa54084fac2e13c37102))
* create error metrics tracker ([766dcf8](https://github.com/alto9/kube9-vscode/commit/766dcf82eaee73f04b8807a39206c65684743a36))
* create main error handler singleton class ([382c8e3](https://github.com/alto9/kube9-vscode/commit/382c8e3e5ca91b212b2e32757a71e2ea3b5372bc))
* initialize OutputPanelLogger in extension activation ([cc17ce5](https://github.com/alto9/kube9-vscode/commit/cc17ce527f39e07c5b990254c97a73bda51a2e0f))

# [1.14.0](https://github.com/alto9/kube9-vscode/compare/v1.13.0...v1.14.0) (2026-01-02)


### Bug Fixes

* **pod-describe:** Fix webview layout and match node webview design ([b56e58f](https://github.com/alto9/kube9-vscode/commit/b56e58f87484c298212a9e2601c1cfb10929cb4d))
* singular describe webview ([5c15324](https://github.com/alto9/kube9-vscode/commit/5c153247a00bf26be932756de6bbaed74046c3f1))


### Features

* add click command to PodTreeItem for Describe webview ([efb17ed](https://github.com/alto9/kube9-vscode/commit/efb17eddc6fd227633ec5609bd04f9abdb1c0672))
* add Pod describe functionality to DescribeWebview ([b3da741](https://github.com/alto9/kube9-vscode/commit/b3da741fa546e3d39ccbf16c6c7a3b9538642b8d))
* add PodDescribeProvider interfaces ([cfc68c5](https://github.com/alto9/kube9-vscode/commit/cfc68c58881e1c2ecd0af81f5ef2d90e6f62598f))
* create pod describe webview HTML/CSS structure ([33b2b1b](https://github.com/alto9/kube9-vscode/commit/33b2b1ba0ee29c6562bbb2d815d996ebca85e583))
* create React PodDescribeApp component for pod describe webview ([0f1f17f](https://github.com/alto9/kube9-vscode/commit/0f1f17f989ee517174e22e1ba4027839bca392b4))
* implement PodDescribeProvider data fetching logic ([fb0dfc0](https://github.com/alto9/kube9-vscode/commit/fb0dfc01f3be9fbda0f0da353e98cb26afdc66eb))
* **pod-describe:** add Overview, Conditions, Containers, and Events tabs ([a8c33b1](https://github.com/alto9/kube9-vscode/commit/a8c33b1d50c0a2afd862b79e59ffe6598e46cf95))
* register kube9.describePod command ([ad2b231](https://github.com/alto9/kube9-vscode/commit/ad2b231ba778ba6b5b28859d3e31b93d1af1ffb2))

# [1.13.0](https://github.com/alto9/kube9-vscode/compare/v1.12.0...v1.13.0) (2026-01-01)


### Bug Fixes

* prevent duplicate registration for events category ([b54867c](https://github.com/alto9/kube9-vscode/commit/b54867c67c6102d41ad01561205398d4eb118ce4))


### Features

* update welcome screen and branding ([e074aa8](https://github.com/alto9/kube9-vscode/commit/e074aa828ea72c1880a69f61d70622105475d575))

# [1.12.0](https://github.com/alto9/kube9-vscode/compare/v1.11.0...v1.12.0) (2026-01-01)


### Bug Fixes

* add error handling and auto-reconnect for pod logs streaming ([a2934f9](https://github.com/alto9/kube9-vscode/commit/a2934f909ca86c0330e67d3fb9eb923d8fe48d03))
* pod log viewer logs not loading after container selection ([6906ef7](https://github.com/alto9/kube9-vscode/commit/6906ef73179b1f21760f773a1c4d1dcf6a5be5fe))
* remove unused PodLogsViewerPanel re-export causing duplicate identifier ([6e409fd](https://github.com/alto9/kube9-vscode/commit/6e409fd8a1f843eedfd1879a4f2990b8d20cbd11))
* remove unused PodLogsViewerPanel re-export causing duplicate identifier error ([13cbc28](https://github.com/alto9/kube9-vscode/commit/13cbc288b5285d765cf4e314dac06154f9d2dc5a))
* resolve circular dependency causing duplicate identifier error ([626202d](https://github.com/alto9/kube9-vscode/commit/626202df7c6999e14c63485e6e54533982710c80))
* webpack dependency build issue ([e91be39](https://github.com/alto9/kube9-vscode/commit/e91be39dfd8b5aab85f596590c06866dbd88db3f))


### Features

* add 30-second data caching for node describe ([cacdab6](https://github.com/alto9/kube9-vscode/commit/cacdab6867c9264ffaa4f7e37649b0634be5d87f))
* add container switching and previous logs support to pod logs viewer ([dfb60a4](https://github.com/alto9/kube9-vscode/commit/dfb60a4faba28982d4b3d9fdec30b1a7feca51db))
* add Describe (Raw) command for nodes ([0d8d6de](https://github.com/alto9/kube9-vscode/commit/0d8d6de640d16229f3dd60dac47f983df627e6d5))
* add getNodeDetails method to NodeCommands ([6605e1f](https://github.com/alto9/kube9-vscode/commit/6605e1f089d767d2ec2dc3921b349470064b69fd))
* add HTML structure and styles for node describe webview ([84c8461](https://github.com/alto9/kube9-vscode/commit/84c8461ea6a24fca9b90f4ad6ad1333b46291735))
* add keyboard shortcuts and accessibility features to pod logs viewer ([553561b](https://github.com/alto9/kube9-vscode/commit/553561b075ef1d137d03bfa988a805050377b153))
* add line limit selector and timestamps toggle to pod logs viewer ([4906e0a](https://github.com/alto9/kube9-vscode/commit/4906e0a2c878e60fcae0aa481c492e29c69c69a5))
* add loading, empty, and error states to pod logs viewer ([5f86550](https://github.com/alto9/kube9-vscode/commit/5f86550644fc0837b36c522522d952f1b17e7255))
* add LogsProvider class for Kubernetes pod log streaming ([a56fade](https://github.com/alto9/kube9-vscode/commit/a56fadee715210c0fbac676628eb0821115f2f97))
* add node describe data transformer ([cde14d9](https://github.com/alto9/kube9-vscode/commit/cde14d9bd40163f53ebcedce532fb22c772878a4))
* add NodeDescribeWebview class for node details webview ([f2d9cb8](https://github.com/alto9/kube9-vscode/commit/f2d9cb8e7a158e86e71847b98ec5c8316892c147))
* add pod navigation from node describe webview ([2e9fa1e](https://github.com/alto9/kube9-vscode/commit/2e9fa1e6ee47290c6402d858c4c16cd82ea88fbf))
* add PodCommands.getPodsOnNode() method ([1e4d429](https://github.com/alto9/kube9-vscode/commit/1e4d429883ed4a1d4e2b592e5860d9bfe051cfbd))
* add PreferencesManager for per-cluster pod logs preferences ([3e30984](https://github.com/alto9/kube9-vscode/commit/3e30984e7892a6411240f58738b6cebff859b428))
* add React webview scaffolding for pod logs viewer ([e11afe4](https://github.com/alto9/kube9-vscode/commit/e11afe47e196b94ede7d84022c8dcd4de000f289))
* add webview HTML template with CSP for pod logs viewer ([a99da03](https://github.com/alto9/kube9-vscode/commit/a99da03bd21e40b91bbf6824b39d9cdeadd07d77))
* create PodLogsViewerPanel class with cluster-specific registry ([843e807](https://github.com/alto9/kube9-vscode/commit/843e8074316d7bb3c510eed3930a63cea7feba4c))
* fix pod log viewing bugs ([e62ddb5](https://github.com/alto9/kube9-vscode/commit/e62ddb5a8aa7d381cb560dd89ad32959417f7f42))
* implement container selection for multi-container pods ([2df699e](https://github.com/alto9/kube9-vscode/commit/2df699e0e7cbd828c00948e5b5427c670e2a1ed2))
* implement follow mode toggle for pod logs viewer ([7001746](https://github.com/alto9/kube9-vscode/commit/70017460a00ab19a461b720948b27694b249458d))
* implement log streaming from Kubernetes API to webview ([48458da](https://github.com/alto9/kube9-vscode/commit/48458da49aa136902eaea8bcb42ae3761e39fcde)), closes [#011-implement-log-streaming](https://github.com/alto9/kube9-vscode/issues/011-implement-log-streaming)
* implement message protocol for pod logs viewer ([5b212b5](https://github.com/alto9/kube9-vscode/commit/5b212b5d4d1561da9a12112f72f492e6a25513fc))
* implement toolbar and footer components for pod logs viewer ([e630cbc](https://github.com/alto9/kube9-vscode/commit/e630cbc42ddd6c6f20795c341bc630557c8e1b38))
* implement webview JavaScript rendering logic for node describe ([3c38c90](https://github.com/alto9/kube9-vscode/commit/3c38c90662db5bdea73278407ac1cc9218277828))
* **pod-logs:** add copy, export, and search actions ([5ca5aff](https://github.com/alto9/kube9-vscode/commit/5ca5affa10eda6ee08d9853e447e8b5dbd85299e))
* **pod-logs:** implement LogDisplay with virtual scrolling and JSON syntax highlighting ([373f5ad](https://github.com/alto9/kube9-vscode/commit/373f5ad982315f13d9f93a158c0f6a631225a973)), closes [#010-implement-logdisplay-with-virtual-scrolling](https://github.com/alto9/kube9-vscode/issues/010-implement-logdisplay-with-virtual-scrolling) [#010-add-json-syntax-highlighting](https://github.com/alto9/kube9-vscode/issues/010-add-json-syntax-highlighting)
* register view pod logs command ([d18cef6](https://github.com/alto9/kube9-vscode/commit/d18cef6840c1da0417b8abc5255a70339f4066ec))
* **utils:** add Kubernetes quantity parsing and time formatting utilities ([d29b71c](https://github.com/alto9/kube9-vscode/commit/d29b71c90cf60373ec2e5b30e6ab9560938d0cc5))
* wire up tree view node click to open describe webview ([0dbb730](https://github.com/alto9/kube9-vscode/commit/0dbb730ac71d4c5f39e8346fc41b216d907a4337))

# [1.11.0](https://github.com/alto9/kube9-vscode/compare/v1.10.0...v1.11.0) (2025-12-31)


### Bug Fixes

* add error handling and auto-reconnect for pod logs streaming ([8de8bd7](https://github.com/alto9/kube9-vscode/commit/8de8bd75446448049a2dc2ac5a584598e10897bf))
* pod log viewer logs not loading after container selection ([cbea0f4](https://github.com/alto9/kube9-vscode/commit/cbea0f422548ec85fb57a8fe7c93760babe72738))


### Features

* add container switching and previous logs support to pod logs viewer ([d559c5f](https://github.com/alto9/kube9-vscode/commit/d559c5ff7ce8d4f8d60ba7c24fe9eb6f72788374))
* add keyboard shortcuts and accessibility features to pod logs viewer ([d3bfecb](https://github.com/alto9/kube9-vscode/commit/d3bfecb661658862920172d122321d9674d163d5))
* add line limit selector and timestamps toggle to pod logs viewer ([16bcd2c](https://github.com/alto9/kube9-vscode/commit/16bcd2c7715a2a6ee27cfde32ff08df15c950578))
* add loading, empty, and error states to pod logs viewer ([77e6b48](https://github.com/alto9/kube9-vscode/commit/77e6b48ca3d97408e38fcd436ee9f496436cd6de))
* add LogsProvider class for Kubernetes pod log streaming ([038d480](https://github.com/alto9/kube9-vscode/commit/038d480bbe06c9036223f0d9efe60030cd5e38b5))
* add PreferencesManager for per-cluster pod logs preferences ([85e14c0](https://github.com/alto9/kube9-vscode/commit/85e14c0be03d61fbb182721a8205c28b8fb85e11))
* add React webview scaffolding for pod logs viewer ([313b1c3](https://github.com/alto9/kube9-vscode/commit/313b1c3506cd02a8fa7e8e59f00174fb7c5ec590))
* add webview HTML template with CSP for pod logs viewer ([9615c2b](https://github.com/alto9/kube9-vscode/commit/9615c2b01375e5c477ae9101fe7420484d1bcd60))
* create PodLogsViewerPanel class with cluster-specific registry ([60f9684](https://github.com/alto9/kube9-vscode/commit/60f9684d1458a976cbba84d246f48119c87626a3))
* fix pod log viewing bugs ([15bcd59](https://github.com/alto9/kube9-vscode/commit/15bcd5950ab9468db57c6b3b95eabe96a6702366))
* implement container selection for multi-container pods ([6cc9917](https://github.com/alto9/kube9-vscode/commit/6cc99179d66705439535a1dc76eb715531a1fa91))
* implement follow mode toggle for pod logs viewer ([335c188](https://github.com/alto9/kube9-vscode/commit/335c18878d39c93795552c1f6df4cc0a70605b16))
* implement log streaming from Kubernetes API to webview ([e9a0ad2](https://github.com/alto9/kube9-vscode/commit/e9a0ad2815e301022ceb9a79aa22941b96b2d4a4)), closes [#011-implement-log-streaming](https://github.com/alto9/kube9-vscode/issues/011-implement-log-streaming)
* implement message protocol for pod logs viewer ([35bb2b0](https://github.com/alto9/kube9-vscode/commit/35bb2b08aa53beb3c1098418d38b806ea6bc27b4))
* implement toolbar and footer components for pod logs viewer ([a58fa33](https://github.com/alto9/kube9-vscode/commit/a58fa339e51ecdcf76e04959f253adfa39990872))
* **pod-logs:** add copy, export, and search actions ([37cec6b](https://github.com/alto9/kube9-vscode/commit/37cec6ba03f2d0aae5996f4c15e33f6d8748fe1b))
* **pod-logs:** implement LogDisplay with virtual scrolling and JSON syntax highlighting ([264225b](https://github.com/alto9/kube9-vscode/commit/264225bbd06ecb84558f55eb0c5c981095cab364)), closes [#010-implement-logdisplay-with-virtual-scrolling](https://github.com/alto9/kube9-vscode/issues/010-implement-logdisplay-with-virtual-scrolling) [#010-add-json-syntax-highlighting](https://github.com/alto9/kube9-vscode/issues/010-add-json-syntax-highlighting)
* register view pod logs command ([ba1a970](https://github.com/alto9/kube9-vscode/commit/ba1a97067a316198995dc6758f61f22243e66e9e))

# [1.10.0](https://github.com/alto9/kube9-vscode/compare/v1.9.5...v1.10.0) (2025-12-30)


### Bug Fixes

* add comprehensive error handling for port forwarding edge cases ([20b0959](https://github.com/alto9/kube9-vscode/commit/20b0959c927a7d57885057cb4c7dfcf472edf330))
* add tree refresh subscription for port forward events ([cef5919](https://github.com/alto9/kube9-vscode/commit/cef5919a10e4f5cb88a869505fd4bbfe44efab45))
* unit test failures ([03dc6af](https://github.com/alto9/kube9-vscode/commit/03dc6af11ebc12904143eb41c02c82c89cda3b36))


### Features

* add additional context menu actions for port forwards ([f498229](https://github.com/alto9/kube9-vscode/commit/f4982290a70d8a7a32503b410d042561f9bb8d01))
* add pod badges for active port forwards ([c3ff17f](https://github.com/alto9/kube9-vscode/commit/c3ff17f29ef10acc92663e694e13c5454cdf885b))
* add port forward tree item types ([7bf2bf2](https://github.com/alto9/kube9-vscode/commit/7bf2bf2638cbe447c3e43ede8e39d3404d3fbf0c))
* add port forwarding factory methods to TreeItemFactory ([2681e66](https://github.com/alto9/kube9-vscode/commit/2681e6639caa5996a20caf30279c4098ad157ddb))
* add Port Forwarding subcategory to Networking category ([f51338c](https://github.com/alto9/kube9-vscode/commit/f51338cc34816ab9bcf80f5399916439a3602278))
* create PortForwardingSubcategory class for port forward tree items ([d7ae674](https://github.com/alto9/kube9-vscode/commit/d7ae674611e33f1f7521daecd6319c869b3504bd))
* create PortForwardManager singleton service ([80e7ddd](https://github.com/alto9/kube9-vscode/commit/80e7ddd55c933999b531604df56db316b5796749))
* implement port forward manager start logic ([7fdd197](https://github.com/alto9/kube9-vscode/commit/7fdd1978dd63b0f95359bd2e545b237ca7cce74c))
* implement port forward manager stop logic ([ded1b7a](https://github.com/alto9/kube9-vscode/commit/ded1b7a4503eaf2e17d27e28e4dd275c1b008750))
* implement port forward pod command ([7d30463](https://github.com/alto9/kube9-vscode/commit/7d30463e18265dda49b4d852642da3741247a2f6))
* implement stop port forward commands ([3b85cc3](https://github.com/alto9/kube9-vscode/commit/3b85cc3e36d26334fbe210d3d85a25d4ead497ff))
* integrate port forwarding in tree provider ([dbda632](https://github.com/alto9/kube9-vscode/commit/dbda63283828b782255bba1164eb872664413a27))
* register port forwarding commands in extension ([db11560](https://github.com/alto9/kube9-vscode/commit/db11560b81514fd8f418e0947e59aa4c762775ed))
* register port forwarding commands in package.json ([44cac49](https://github.com/alto9/kube9-vscode/commit/44cac49ac071d86e37fd86847b4909ed74bbcd93))

## [1.9.5](https://github.com/alto9/kube9-vscode/compare/v1.9.4...v1.9.5) (2025-12-23)

## [1.9.4](https://github.com/alto9/kube9-vscode/compare/v1.9.3...v1.9.4) (2025-12-22)


### Bug Fixes

* **lint:** remove unused variables to fix test failures ([c311a34](https://github.com/alto9/kube9-vscode/commit/c311a346b887293d10391d0f14fd68a96069a0f9))

## [1.9.3](https://github.com/alto9/kube9-vscode/compare/v1.9.2...v1.9.3) (2025-12-22)


### Bug Fixes

* **events:** reduce event limit to 25 and improve namespace discovery ([48518f8](https://github.com/alto9/kube9-vscode/commit/48518f8948c4b4be16f9f0f4e757a69e6a70a1ba))

## [1.9.2](https://github.com/alto9/kube9-vscode/compare/v1.9.1...v1.9.2) (2025-12-22)


### Bug Fixes

* **tree:** refresh should clear caches and force status re-check ([308baa9](https://github.com/alto9/kube9-vscode/commit/308baa94356f8050c54b3899d8839c53998b8a11))

## [1.9.1](https://github.com/alto9/kube9-vscode/compare/v1.9.0...v1.9.1) (2025-12-22)


### Bug Fixes

* **tree:** preserve operator status across tree refresh ([b4f862c](https://github.com/alto9/kube9-vscode/commit/b4f862cb4c5ef0dfe43302d1fc549891d8daf6dd))

# [1.9.0](https://github.com/alto9/kube9-vscode/compare/v1.8.0...v1.9.0) (2025-12-22)


### Features

* add action buttons to event details pane ([788477b](https://github.com/alto9/kube9-vscode/commit/788477b6f42274aa0964088a2337cb4c1a5ca79a))
* add active column highlighting to table header ([0fff152](https://github.com/alto9/kube9-vscode/commit/0fff1521c0ade996d50d5c1beccb139aaf9fce31))
* add namespace field to operator status ConfigMap ([356ae8b](https://github.com/alto9/kube9-vscode/commit/356ae8b98de41f84c6c899b1a9c73f4405f2def7))
* add operator namespace settings schema ([0c75a39](https://github.com/alto9/kube9-vscode/commit/0c75a39bedc863dd9cae5eef29a3e573c52181cb))
* add OperatorNamespaceResolver for dynamic namespace discovery ([1a4aed5](https://github.com/alto9/kube9-vscode/commit/1a4aed57e9f9105b5e457fb27bc2fdb0eb9a3c5d))
* add SearchBox component for event viewer filtering ([a32b9f4](https://github.com/alto9/kube9-vscode/commit/a32b9f42df56629e49b8f4660bc11d6fe2a831f8))
* create EventDetails and DetailRow components ([712c457](https://github.com/alto9/kube9-vscode/commit/712c4579126e51e2de28a181d9a163111125521b))
* create EventRow component with color coding ([f8cbbc9](https://github.com/alto9/kube9-vscode/commit/f8cbbc9137c5d413d1ef0004c7cba122e1066171))
* create EventViewerApp root component for events webview ([ddcc2b7](https://github.com/alto9/kube9-vscode/commit/ddcc2b705a816288ded48466df17fcd6efc4b6b5))
* create EventViewerPanel class for Events Viewer webview ([0fe4110](https://github.com/alto9/kube9-vscode/commit/0fe41100daecf85adab02f9cca492a2f7e0e6f15))
* create FilterPane and FilterSection components ([d43914b](https://github.com/alto9/kube9-vscode/commit/d43914bd7450da2bfc2841df147a49e524819422))
* create individual filter components for event viewer ([d196f25](https://github.com/alto9/kube9-vscode/commit/d196f25b407c57638dc9b99b16dc4da476f3f118))
* create ThreePaneLayout component with resizable panes ([6d79979](https://github.com/alto9/kube9-vscode/commit/6d79979ec13c077649c25e6efd6442e0a20639c3))
* create toolbar component with action buttons for events viewer ([2ed1bb6](https://github.com/alto9/kube9-vscode/commit/2ed1bb6448c9ae354f62e10daa420cc61f40b701))
* **events:** register commands for opening Events Viewer ([7aa432a](https://github.com/alto9/kube9-vscode/commit/7aa432aecd4db278807bceca0db8e4b6cff4b66f))
* implement EventTable component with virtual scrolling ([c4352f1](https://github.com/alto9/kube9-vscode/commit/c4352f17d95737497384c0482dc3c586879f781f))
* implement ResizeHandle drag functionality ([d86d7d0](https://github.com/alto9/kube9-vscode/commit/d86d7d066aad410ea7a5ad3589e436a0225225bf))
* implement StatusBar component for Events Viewer ([c56bcc7](https://github.com/alto9/kube9-vscode/commit/c56bcc7d390b2d5ec64a884b116f225be220d169))
* split table state components into separate files ([49daca9](https://github.com/alto9/kube9-vscode/commit/49daca9fd1d114715f1c97155802de9256f3ee9e))
* update EventsCategory to launch webview instead of expanding tree ([89fec00](https://github.com/alto9/kube9-vscode/commit/89fec009e3da30f926c9d46d220343c57ac0cc09))

# [1.8.0](https://github.com/alto9/kube9-vscode/compare/v1.7.0...v1.8.0) (2025-12-18)


### Features

* events viewer ([0ed9ce8](https://github.com/alto9/kube9-vscode/commit/0ed9ce8133eb7070fee2b9227e8dce31740adbc8))

# [1.7.0](https://github.com/alto9/kube9-vscode/compare/v1.6.0...v1.7.0) (2025-12-17)


### Bug Fixes

* add comprehensive error handling with user-friendly messages ([bb277fd](https://github.com/alto9/kube9-vscode/commit/bb277fd61dd9d28c6be9758e623e4fd0c02b4b5c))
* tree navigation timing and concurrency issues ([a3a4bfe](https://github.com/alto9/kube9-vscode/commit/a3a4bfe270b0f2f221725381b53e526e6997c389))
* tree refresh issue ([913e18e](https://github.com/alto9/kube9-vscode/commit/913e18ee33cb98de87bbb7ed578999754577de0f))


### Features

* add cache invalidation on tree refresh ([fadbf22](https://github.com/alto9/kube9-vscode/commit/fadbf2241043eaad89e2f82c4ab048a63db909b1))
* add cache statistics debug command ([0de4fcd](https://github.com/alto9/kube9-vscode/commit/0de4fcd89dafb8be0faa4d45fc86c39dc5b7b301))
* add TTL-based cache infrastructure for Kubernetes resources ([157b606](https://github.com/alto9/kube9-vscode/commit/157b606efe8c5f911440015ff719a280d8ef7219))
* create Kubernetes API client singleton ([343cc77](https://github.com/alto9/kube9-vscode/commit/343cc77e3b65ed7e0a9277d0b440766a7475ea51))
* create resource fetcher functions for Kubernetes API client ([0108f15](https://github.com/alto9/kube9-vscode/commit/0108f150fb9b9cfb5f919674885e65c6ea32940e))


### Performance Improvements

* implement parallel resource loading in tree provider ([7eb73b2](https://github.com/alto9/kube9-vscode/commit/7eb73b2e8afe3cc3d43a23a1ee2a7bff6a35bfc3))

# [1.6.0](https://github.com/alto9/kube9-vscode/compare/v1.5.0...v1.6.0) (2025-12-17)


### Bug Fixes

* cluster organizer rename and enhanced UI ([6c970bd](https://github.com/alto9/kube9-vscode/commit/6c970bd69492dc52e4825f4b8d118de35b6cf540))


### Features

* add event system to ClusterCustomizationService ([7886536](https://github.com/alto9/kube9-vscode/commit/788653614c3425ee772a6ad01c7c0681ed3d94a4))
* add folder context menu with rename and delete operations ([4b857ac](https://github.com/alto9/kube9-vscode/commit/4b857ac9ba81b3dd957818f8033e1e65c94ce7c9))
* add folder list UI in cluster manager webview ([90d1c72](https://github.com/alto9/kube9-vscode/commit/90d1c72e3fc3a27ba56488346b32ed8e603ac4b2))
* add import/export configuration for cluster customizations ([4a821df](https://github.com/alto9/kube9-vscode/commit/4a821df391f6ad15fa3bf677bec40d093d94bcc3))
* add inline alias editing UI in Cluster Manager webview ([3e6def3](https://github.com/alto9/kube9-vscode/commit/3e6def32eb2a71096df482a3e7e4e28efabdde3e))
* add keyboard accessibility to cluster manager webview ([eec4fbd](https://github.com/alto9/kube9-vscode/commit/eec4fbda851ccbbff32beabbc0c896898d4b3c34))
* add new folder button and dialog to cluster manager ([e6b0125](https://github.com/alto9/kube9-vscode/commit/e6b01257723c1e34c2bc0ead05ff75685a8d3324))
* add React webview app skeleton for Cluster Manager ([8f755e3](https://github.com/alto9/kube9-vscode/commit/8f755e38e4ccadc51ec415e3ed66f5231875fed3))
* add search filter to cluster manager webview ([b632d57](https://github.com/alto9/kube9-vscode/commit/b632d57e33f55fad3ac2f369e127430ba09410ad))
* add setVisibility method to ClusterCustomizationService ([b8dfe0e](https://github.com/alto9/kube9-vscode/commit/b8dfe0e94324f6a1f67d4f9409e7d1b5a4bffea1))
* add status footer with cluster counts and hidden filter ([110057b](https://github.com/alto9/kube9-vscode/commit/110057bf30ce9bc1397c82a68608dada1d751afe))
* add theme synchronization to cluster manager webview ([c8afe10](https://github.com/alto9/kube9-vscode/commit/c8afe1049ade8488e2ef1f92e4cb059b61679b7c))
* add visibility toggle UI in cluster manager webview ([21ba917](https://github.com/alto9/kube9-vscode/commit/21ba9177ed264a5c66dd08c6f011871c4f73dda9))
* create ClusterCustomizationService skeleton ([602f796](https://github.com/alto9/kube9-vscode/commit/602f7966bace25fd41282d820ac3de6f34a5f4dc))
* create ClusterManagerWebview class with singleton pattern ([89e4486](https://github.com/alto9/kube9-vscode/commit/89e44864e054cc3bd97a8ac6191f1c4f1827b855))
* display cluster aliases in tree view ([794ade5](https://github.com/alto9/kube9-vscode/commit/794ade58b27bf35c35f75245175f60e23a8f7531))
* display cluster list in Cluster Manager webview ([82d9788](https://github.com/alto9/kube9-vscode/commit/82d9788b34a747e88947e01c5a5fd82bda0d098f))
* display folders in tree view ([dd73f1f](https://github.com/alto9/kube9-vscode/commit/dd73f1f26ea1d0fc94d5863914cfecb1a23b9c0d))
* filter hidden clusters from tree view ([d122dc5](https://github.com/alto9/kube9-vscode/commit/d122dc57444b009c45eb0c7329a2e3e6c35f2dea))
* implement alias CRUD operations in ClusterCustomizationService ([30c29a5](https://github.com/alto9/kube9-vscode/commit/30c29a5f100ea3ddc81cc2be8507ca342ff40098))
* implement drag-and-drop cluster to folder ([84189a4](https://github.com/alto9/kube9-vscode/commit/84189a42fa542f845c9a272820efe777a07c2fd3))
* implement folder CRUD operations in ClusterCustomizationService ([c6f3814](https://github.com/alto9/kube9-vscode/commit/c6f38148f8283d00deda17389711749e5927f60c))
* implement get clusters message protocol for cluster manager webview ([6ce95da](https://github.com/alto9/kube9-vscode/commit/6ce95da0635bb0b16a1b4bbce42932dfa836c2f9))
* implement moveCluster operation for cluster organization ([e357d44](https://github.com/alto9/kube9-vscode/commit/e357d445641189e9dd257cf6e7e9c0a2b05647e4))
* register Cluster Manager command ([7d803ed](https://github.com/alto9/kube9-vscode/commit/7d803ed364e59a5eb6cf292c219c392db97d92e2))

# [1.5.0](https://github.com/alto9/kube9-vscode/compare/v1.4.1...v1.5.0) (2025-12-16)


### Bug Fixes

* add comprehensive error handling for ArgoCD operations ([a9f4eab](https://github.com/alto9/kube9-vscode/commit/a9f4eab356b27222c6fb4abddfb0353b3d3c7152))


### Features

* add application querying methods to ArgoCDService ([b2c8cf1](https://github.com/alto9/kube9-vscode/commit/b2c8cf1e1479c85dce83f028d6f0447dad07b798))
* add ArgoCD application context menu commands ([eb56a91](https://github.com/alto9/kube9-vscode/commit/eb56a913d12ab8e42649a1e3dc729c5d0d75a3a3))
* add ArgoCD status icon mapping utility ([effbc40](https://github.com/alto9/kube9-vscode/commit/effbc404874f1cbdbf48f561d0e22a2c1a74951d))
* add ArgoCD type definitions ([0b5265e](https://github.com/alto9/kube9-vscode/commit/0b5265eaff39fbe78160c6ad5571983552451ec9))
* add ArgoCDCategory class for tree view ([31ae42d](https://github.com/alto9/kube9-vscode/commit/31ae42dadc28e6304b18cff0a374c14cb0878a06))
* add ArgoCDStatus interface to OperatorStatusTypes ([c41cae1](https://github.com/alto9/kube9-vscode/commit/c41cae1f53fc7f967d7ba1cf20f588c26ee92f3f))
* add progress notifications for ArgoCD sync operations ([358d559](https://github.com/alto9/kube9-vscode/commit/358d559249462d5727910e389caebdb71993b49e))
* add React webview app structure for ArgoCD application view ([a121264](https://github.com/alto9/kube9-vscode/commit/a121264d66aae5eb973a349077cdf8a20f5d9fd0))
* create ArgoCD application webview provider ([8ae7e7a](https://github.com/alto9/kube9-vscode/commit/8ae7e7a8d860129cc503a4e50f9aa8860adae008))
* implement ArgoCD service detection with operated and basic modes ([81531ff](https://github.com/alto9/kube9-vscode/commit/81531ff38de52b8c53f3d17c2674cb0543c93bde))
* implement cache invalidation for ArgoCD sync operations ([32faa18](https://github.com/alto9/kube9-vscode/commit/32faa186bed429c8f6516b72ab6e910396173422))
* implement CRD parsing methods in ArgoCDService ([97ac4b5](https://github.com/alto9/kube9-vscode/commit/97ac4b5f7d96dcfc338f4767a6680ff2674648bf))
* implement drift details tab with resource table and filtering ([0b32558](https://github.com/alto9/kube9-vscode/commit/0b32558b82bbca8588f25d9a476f6a6488ca9077))
* implement overview tab components for ArgoCD application webview ([8b2089b](https://github.com/alto9/kube9-vscode/commit/8b2089b29f85cdb4dee0deaf0190a847e7be81e2))
* implement sync actions and operation tracking in ArgoCDService ([9f9e187](https://github.com/alto9/kube9-vscode/commit/9f9e1878543ecfe06ece501a18474beff9a973f6))
* integrate ArgoCD category into cluster tree provider ([ef50410](https://github.com/alto9/kube9-vscode/commit/ef504108024c8432516d98384ff604a5582196b2))
* wire view details command to open ArgoCD webview ([757e12d](https://github.com/alto9/kube9-vscode/commit/757e12d86bf42dde4f0180df417c106ea5ac1d4d))

## [1.4.1](https://github.com/alto9/kube9-vscode/compare/v1.4.0...v1.4.1) (2025-12-11)


### Bug Fixes

* complete updates for namespace management commands and error handling ([c1a15cc](https://github.com/alto9/kube9-vscode/commit/c1a15cc198a29c2835752c9412a920160d589902))
* enhance namespace management with context-aware functionality ([c26871d](https://github.com/alto9/kube9-vscode/commit/c26871d9c26fb807b906bf24fbbf09b88e6249c0))

# [1.4.0](https://github.com/alto9/kube9-vscode/compare/v1.3.0...v1.4.0) (2025-12-11)


### Bug Fixes

* onchange handler for dont show message ([38f2ec4](https://github.com/alto9/kube9-vscode/commit/38f2ec450a52a86182ebc271f4a9ddc1ed6bba5a))
* small verbiage adjustments ([4085c18](https://github.com/alto9/kube9-vscode/commit/4085c18ab2d377cc4bf64cd48af0aca61560fbdf))


### Features

* update Forge documentation with new command structure and guidelines ([fc896d5](https://github.com/alto9/kube9-vscode/commit/fc896d566f0ca7d88e78b751ffbae1e4a8edb6ed))

# [1.3.0](https://github.com/alto9/kube9-vscode/compare/v1.2.0...v1.3.0) (2025-12-09)


### Bug Fixes

* add comprehensive error handling for open terminal command ([4ae3538](https://github.com/alto9/kube9-vscode/commit/4ae35389a69d142a8f4fa8315f5db09807998585))


### Features

* add container selection for multi-container pods ([4671d55](https://github.com/alto9/kube9-vscode/commit/4671d5527206cfacd7fc84d82c543f5e7f06b77c))
* add pod terminal command validation ([9769437](https://github.com/alto9/kube9-vscode/commit/97694375940dede1bf01547a501e4315f2355f48))
* implement pod status query for terminal command ([e46d868](https://github.com/alto9/kube9-vscode/commit/e46d86812aa2e2dc1bcdcf8aebeb19a42a49706f))
* implement terminal creation for pod terminal feature ([9633de5](https://github.com/alto9/kube9-vscode/commit/9633de52ccae1229ec4497c9c2f49869c8155abd))
* register open terminal command for Pod resources ([f2cefc6](https://github.com/alto9/kube9-vscode/commit/f2cefc654d7e1badb03cbd99d1dc7fde46798713)), closes [#001-register-open-terminal-command](https://github.com/alto9/kube9-vscode/issues/001-register-open-terminal-command)
* register open terminal command handler in extension ([ec04280](https://github.com/alto9/kube9-vscode/commit/ec042801e0f13faa35b0be683b58b3e8855461fc))

# [1.2.0](https://github.com/alto9/kube9-vscode/compare/v1.1.2...v1.2.0) (2025-12-09)


### Bug Fixes

* add comprehensive error handling for restart workload ([443c366](https://github.com/alto9/kube9-vscode/commit/443c3663c1bf920f1a6979ae20297800fb43e19e))
* remove accidental commit ([521fa2c](https://github.com/alto9/kube9-vscode/commit/521fa2ca6d443a8b350fb4316d1779bd2925b314))
* ui flicker issue ([3891fcf](https://github.com/alto9/kube9-vscode/commit/3891fcf17ad5b01455295f426313e7c3bbfd9940))
* unit tests ([1bb4686](https://github.com/alto9/kube9-vscode/commit/1bb46864293694ef3c6362cac433d4043101a0d5))
* use strategic merge patch for restart annotation ([49dfc9f](https://github.com/alto9/kube9-vscode/commit/49dfc9f648ee4335cd2b4688c5d85f7c80ffd5e9))


### Features

* add restart confirmation dialog with wait option ([13d0235](https://github.com/alto9/kube9-vscode/commit/13d02355f522f0ed708778721893069b73908e04))
* add tree view and webview refresh after workload restart ([8086144](https://github.com/alto9/kube9-vscode/commit/80861446759578a435d7186b45de614da6e99fe4))
* implement restart annotation logic for workloads ([5d644c6](https://github.com/alto9/kube9-vscode/commit/5d644c6e8e4c37adcc4c124fc8cdcfbf8118a233))
* implement rollout watch functionality for workload restarts ([e1208dc](https://github.com/alto9/kube9-vscode/commit/e1208dccb970cec0d6114243c236c5635b2ff515))
* register restart workload command ([c73fe4d](https://github.com/alto9/kube9-vscode/commit/c73fe4d9e4ba0c4d243bf00e23c2fd9d78734de3))

## [1.1.2](https://github.com/alto9/kube9-vscode/compare/v1.1.1...v1.1.2) (2025-12-05)


### Bug Fixes

* use correct VSIX filename pattern for package name ([f1839ae](https://github.com/alto9/kube9-vscode/commit/f1839aefd3b0869d7f2701c31b2e50ae7e28f2d2))

## [1.1.1](https://github.com/alto9/kube9-vscode/compare/v1.1.0...v1.1.1) (2025-12-05)


### Bug Fixes

* ensure VS Code Marketplace publishes correct version ([c3c914e](https://github.com/alto9/kube9-vscode/commit/c3c914ec1deb0064d5ad38dd677cb772e60207dc))

# [1.1.0](https://github.com/alto9/kube9-vscode/compare/v1.0.2...v1.1.0) (2025-12-05)


### Bug Fixes

* resolve lint errors and test failure ([478126d](https://github.com/alto9/kube9-vscode/commit/478126d2583162745f2ecfaf6780805344b9645b))


### Features

* implement describe webview and describe raw editor ([13cfba7](https://github.com/alto9/kube9-vscode/commit/13cfba724ab2ddf6012e0722857040340129ca33))

## [1.0.2](https://github.com/alto9/kube9-vscode/compare/v1.0.1...v1.0.2) (2025-12-05)

## [1.0.1](https://github.com/alto9/kube9-vscode/compare/v1.0.0...v1.0.1) (2025-12-05)

# 1.0.0 (2025-12-05)


### Features

* enhance operator presence awareness and dashboard functionality [skip ci] ([2b2bb1d](https://github.com/alto9/kube9-vscode/commit/2b2bb1dd8950c1d6038f3ff773c96f15b76685e9))
