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
