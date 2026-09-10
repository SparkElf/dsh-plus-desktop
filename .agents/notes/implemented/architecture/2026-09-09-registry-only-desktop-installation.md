# Agent Note: Registry-only Desktop installation

Status: implemented

English | [中文](2026-09-09-registry-only-desktop-installation.zh.md)

## Problem

The Desktop installer previously carried a large Plus package closure, a prebuilt fs-ext archive, and a bundled pnpm runtime. That duplicated profile distribution ownership and made ordinary JavaScript packages Desktop resources.

## Decision

Desktop installs the exact official DSH 0.1.5-rc.2 source revision and resolves @sparkelf/dsh-plus@0.1.0-rc.26 from npm during profile materialization. Git, Node.js, npm, and pnpm remain system toolchain requirements on native Windows targets. The Desktop package keeps only its Supervisor runtime and Electron assets; it does not carry ordinary Plus tarballs, an fs-ext prebuild, a pnpm bundle, or source closure resources.

The installer writes a minimal profile manifest, runs the system pnpm commands, applies the Plus profile, and builds the selected official source checkout. Retry paths rerun installation from the written manifest so interrupted dependency downloads are recoverable.

## Consequences

The first install requires network access to the configured npm registry and the official source repository. Users without a compatible system toolchain receive the existing toolchain preparation flow. Native dependencies that genuinely need compilation remain the only candidates for prebuilt distribution resources.

## Verification

pnpm test, pnpm run pack:check, pnpm run package:dir, and pnpm run verify:unpacked-imports pass. The unpacked verifier rejects bundled closure, native-resource, and pnpm resources and imports the Supervisor runtime from the packaged app.
