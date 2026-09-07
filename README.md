---
description: "Installable Windows and Linux desktop for a pinned DeepSeek Harness Plus profile."
kind: "product-reference"
---

# DeepSeek Harness Plus Desktop

English | [中文](README.zh.md)

## Install

Desktop 0.2.0-rc.2 is the installable companion for `@sparkelf/dsh-plus@0.1.0-rc.22`. Download the platform installer from the matching GitHub Release:

- Windows x64: `DeepSeek.Harness.Plus.Setup.0.2.0-rc.2.exe`
- Linux x64: `deepseek-harness-plus-0.2.0-rc.2.AppImage`
- Debian/Ubuntu x64: `deepseek-harness-plus-0.2.0-rc.2.deb`

The first-run wizard selects an installation directory, ports, proxy, model provider, and API credential. It fetches official DeepSeek Harness revision `d347e703908d0406b7a7ef80e3a0e594d86b2215`, installs the exact Plus distribution, applies its source patches, performs an official build, writes the isolated DSH home, and starts the external Supervisor. Existing user settings and data remain under the selected installation's `.dsh-plus/home`.

The installer bundles Electron, a licensed standalone Node runtime, pnpm, and the 27 reviewed tarballs in the Plus rc.22 closure. The machine needs Git and network access to GitHub and npm during first installation. The wizard checks both requirements before changing the selected directory and supports HTTP, HTTPS, and SOCKS5 proxy URLs.

## Release Binding

This Desktop build has one immutable runtime selection:

- Plus distribution: `@sparkelf/dsh-plus@0.1.0-rc.22`
- Official source: `d347e703908d0406b7a7ef80e3a0e594d86b2215`
- Supervisor: `@sparkelf/dsh-plugin-supervisor@0.1.3`

Desktop does not copy Supervisor source. Native and WSL lifecycle commands use the published Supervisor package installed in the Plus profile. The public npm export remains `runPlusDesktop(electron, options)` for hosts that only need the tray client.

## Desktop Workflow

After installation, the tray provides commands to open Harness and Supervisor progress, start or stop Harness, restart it, rebuild and restart, repair the pinned installation, manage the selected release, open local data, and export or restore user backups. Closing the installer window keeps the tray available; quitting Desktop leaves ownership of the accepted runtime transition to Supervisor.

## Verification

The required CI runs the tray API test, npm pack boundary check, Electron installer UI system test, isolated unpacked-import resolution, and Linux/Windows electron-builder packaging. The explicit `pnpm run test:install` acceptance performs the full pinned Plus source installation on a capable runner. Release tags publish the npm tray package and attach platform installers to a Desktop GitHub prerelease.

## Known Limitations

- 0.2.0-rc.2 installers are unsigned prerelease artifacts; Windows SmartScreen or Linux desktop security may require explicit confirmation.
- macOS packaging remains disabled until the release has a signing and notarization identity.
- First installation compiles the official Harness source on the target machine and therefore takes longer than an application-only installer.
- Git is not bundled in this release.
