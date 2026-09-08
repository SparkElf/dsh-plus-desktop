---
description: "Installable Windows and Linux desktop for a pinned DeepSeek Harness Plus profile."
kind: "product-reference"
---

# DeepSeek Harness Plus Desktop

English | [中文](README.zh.md)

## Install

Desktop 0.2.0-rc.5 is the installable companion for `@sparkelf/dsh-plus@0.1.0-rc.22`. Download the platform installer from the matching GitHub Release:

- Windows x64: `DeepSeek.Harness.Plus.Setup.0.2.0-rc.5.exe`
- Linux x64: `deepseek-harness-plus-0.2.0-rc.5.AppImage`
- Debian/Ubuntu x64: `deepseek-harness-plus-0.2.0-rc.5.deb`

The first-run wizard selects an installation directory, ports, proxy, model provider, and API credential. It clones the embedded official DeepSeek Harness revision `d347e703908d0406b7a7ef80e3a0e594d86b2215`, installs the exact Plus distribution, applies its source patches, performs an official build, writes the isolated DSH home, and starts the external Supervisor. Existing user settings and data remain under the selected installation's `.dsh-plus/home`.

The Windows installer bundles Electron, a licensed Node.js/npm runtime, pnpm, MinGit 2.55.0.5, the exact official source Git bundle, and the 27 reviewed tarballs in the Plus rc.22 closure. The machine does not need a preinstalled Git or Node.js. Chinese installations prefer `https://registry.npmmirror.com` and fall back to the official npm registry; English installations use the reverse order. A registry download warning such as `error (23)` also triggers the alternate source when the command fails. The wizard supports HTTP, HTTPS, and SOCKS5 proxy URLs. Windows native dependencies are precompiled in CI for the bundled Node ABI; users do not need Python, node-gyp, Visual Studio Build Tools, or the Windows SDK.

## Release Binding

This Desktop build has one immutable runtime selection:

- Plus distribution: `@sparkelf/dsh-plus@0.1.0-rc.22`
- Official source: `d347e703908d0406b7a7ef80e3a0e594d86b2215`
- Supervisor: `@sparkelf/dsh-plugin-supervisor@0.1.3`
- Portable Git: `MinGit 2.55.0.5 win32-x64` (`sha256:56d7b226b7693196cfc71fef26568f536c4a021ab6c37ff2db4287bed908e96e`)

Desktop does not copy Supervisor source. Native and WSL lifecycle commands use the published Supervisor package installed in the Plus profile. The public npm export remains `runPlusDesktop(electron, options)` for hosts that only need the tray client.

## Desktop Workflow

After installation, the tray provides commands to open Harness and Supervisor progress, start or stop Harness, restart it, rebuild and restart, repair the pinned installation, manage the selected release, open local data, and export or restore user backups. Closing the installer window keeps the tray available; quitting Desktop leaves ownership of the accepted runtime transition to Supervisor.

## Verification

The required CI runs the tray API test, npm pack boundary check, Electron installer UI system test, isolated unpacked-import resolution, and Linux/Windows electron-builder packaging. The explicit `pnpm run test:install` acceptance performs the full pinned Plus source installation on a capable runner. Release tags publish the npm tray package and attach platform installers to a Desktop GitHub prerelease.

## Known Limitations

- 0.2.0-rc.5 installers are unsigned prerelease artifacts; Windows SmartScreen or Linux desktop security may require explicit confirmation.
- macOS packaging remains disabled until the release has a signing and notarization identity.
- First installation compiles the official Harness source on the target machine and therefore takes longer than an application-only installer.
- Native Windows installation uses the bundled MinGit runtime. The advanced WSL target still requires Git and Node.js inside the selected distribution.
