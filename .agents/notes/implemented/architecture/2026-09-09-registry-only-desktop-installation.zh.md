# Agent Note：仅从Registry安装Desktop

Status: implemented

[English](2026-09-09-registry-only-desktop-installation.md) | 中文

## Problem

Desktop installer之前携带大型Plus package closure、预编译fs-ext archive及bundled pnpm runtime。这重复了profile distribution ownership，也把普通JavaScript package变成了Desktop resources。

## Decision

Desktop安装exact official DSH 0.1.5-rc.1 source revision，并在profile materialization期间从npm解析@sparkelf/dsh-plus@0.1.0-rc.25。原生Windows target的Git、Node.js、npm与pnpm仍属于system toolchain requirement。Desktop package只保留Supervisor runtime与Electron assets，不携带普通Plus tarball、fs-ext prebuild、pnpm bundle或source closure resource。

Installer写入最小profile manifest，执行system pnpm commands，应用Plus profile并构建selected official source checkout。Retry path从已写入的manifest重新执行install，使中断的dependency download可恢复。

## Consequences

首次安装需要访问配置的npm registry与official source repository。缺少兼容system toolchain的用户继续使用现有toolchain preparation flow。真正需要编译环境的native dependency仍是唯一可以预编译分发的资源候选。

## Verification

pnpm test、pnpm run pack:check、pnpm run package:dir与pnpm run verify:unpacked-imports通过。unpacked verifier拒绝bundled closure、native resource与pnpm resource，并从packaged app导入Supervisor runtime。
