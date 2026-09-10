---
description: "Installable Windows and Linux desktop for a pinned DeepSeek Harness Plus profile."
kind: "product-reference"
---

# DeepSeek Harness Plus Desktop

English | [中文](README.zh.md)

## Install

Desktop 0.2.0-rc.8 is the installable companion for `@sparkelf/dsh-plus@0.1.0-rc.25`. Download the platform installer from the matching GitHub Release:

- Windows x64: `DeepSeek.Harness.Plus.Setup.0.2.0-rc.5.exe`
- Linux x64: `deepseek-harness-plus-0.2.0-rc.5.AppImage`
- Debian/Ubuntu x64: `deepseek-harness-plus-0.2.0-rc.5.deb`

The first-run wizard selects an installation directory, ports, proxy, model provider, and API credential. It clones the official DeepSeek Harness revision `183f08e9c6dde7e36cd2318eaee70b0da08fb35e`, installs the Plus distribution from the registry, applies its source patches, performs an official build, writes the isolated DSH home, and starts the external Supervisor. Existing user settings and data remain under the selected installation's `.dsh-plus/home`.

On Windows, the wizard detects Git, Node.js/npm, and pnpm in the system environment. Compatible versions are reused. Missing or incompatible versions open a choice to update the system installation or keep the existing tools and install recommended versions side-by-side. The wizard downloads the official Git for Windows 2.55.0.5 and Node.js 24.20.0 installers, prefers mainland mirrors in Chinese mode, verifies their SHA-256, requests one UAC elevation, updates the system PATH, and records the selected executable paths for Harness builds.

## Release Binding

This Desktop build has one immutable runtime selection:

- Plus distribution: `@sparkelf/dsh-plus@0.1.0-rc.25`
- Official source: `183f08e9c6dde7e36cd2318eaee70b0da08fb35e`
- Supervisor: `@sparkelf/dsh-plugin-supervisor@0.1.3`
- Recommended Git: `Git for Windows 2.55.0.5 x64`
- Recommended Node.js/npm: `Node.js 24.20.0 x64`
- Recommended pnpm: `11.7.0`

Desktop does not copy Supervisor source. Native and WSL lifecycle commands use the published Supervisor package installed in the Plus profile. The public npm export remains `runPlusDesktop(electron, options)` for hosts that only need the tray client.

## Desktop Workflow

After installation, the tray provides commands to open Harness and Supervisor progress, start or stop Harness, restart it, rebuild and restart, repair the pinned installation, manage the selected release, open local data, and export or restore user backups. Closing the installer window keeps the tray available; quitting Desktop leaves ownership of the accepted runtime transition to Supervisor.

## Verification

The required CI runs the tray API test, npm pack boundary check, Electron installer UI system test, isolated unpacked-import resolution, and Linux/Windows electron-builder packaging. The explicit `pnpm run test:install` acceptance performs the full pinned Plus source installation on a capable runner. Release tags publish the npm tray package and attach platform installers to a Desktop GitHub prerelease.

## Known Limitations

- 0.2.0-rc.5 installers are unsigned prerelease artifacts; Windows SmartScreen or Linux desktop security may require explicit confirmation.
- macOS packaging remains disabled until the release has a signing and notarization identity.
- First installation compiles the official Harness source on the target machine and therefore takes longer than an application-only installer.
- Native Windows installation writes or reuses a system toolchain. The advanced WSL target still requires Git and Node.js inside the selected distribution.
