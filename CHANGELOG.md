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
