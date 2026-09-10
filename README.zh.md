---
description: "固定DeepSeek Harness Plus profile的Windows与Linux可安装桌面端。"
kind: "product-reference"
---

# DeepSeek Harness Plus Desktop

[English](README.md) | 中文

## 安装

Desktop 0.2.0-rc.8是`@sparkelf/dsh-plus@0.1.0-rc.25`对应的可安装桌面端。请从配套GitHub Release下载对应平台安装包：

- Windows x64：`DeepSeek.Harness.Plus.Setup.0.2.0-rc.5.exe`
- Linux x64：`deepseek-harness-plus-0.2.0-rc.5.AppImage`
- Debian/Ubuntu x64：`deepseek-harness-plus-0.2.0-rc.5.deb`

首次启动向导会选择安装目录、端口、代理、模型提供方和API凭据。它克隆official DeepSeek Harness revision `183f08e9c6dde7e36cd2318eaee70b0da08fb35e`，从registry安装Plus distribution，应用source patches，执行official build，写入隔离DSH home，并启动外部Supervisor。既有用户settings与data保留在所选安装目录的`.dsh-plus/home`中。

Windows向导检测系统Git、Node.js/npm与pnpm。兼容版本直接复用；缺失或版本冲突时，用户选择更新系统安装，或保留现有版本并并行安装推荐版本。向导下载官方Git for Windows 2.55.0.5和Node.js 24.20.0安装包；中文模式优先大陆镜像；SHA-256通过后请求一次UAC权限、更新系统PATH，并记录Harness构建使用的绝对路径。

## 版本绑定

本Desktop build只有一个不可变runtime selection：

- Plus distribution：`@sparkelf/dsh-plus@0.1.0-rc.25`
- Official source：`183f08e9c6dde7e36cd2318eaee70b0da08fb35e`
- Supervisor：`@sparkelf/dsh-plugin-supervisor@0.1.3`
- 推荐Git：`Git for Windows 2.55.0.5 x64`
- 推荐Node.js/npm：`Node.js 24.20.0 x64`
- 推荐pnpm：`11.7.0`

Desktop不复制Supervisor源码。native与WSL lifecycle commands使用Plus profile中安装的published Supervisor package。public npm export仍为`runPlusDesktop(electron, options)`，供只需要tray client的host使用。

## 桌面工作流

安装完成后，tray提供打开Harness与Supervisor progress、启动或停止Harness、重启、构建并重启、修复固定版本安装、管理所选release、打开本地data以及导出或恢复用户backup等操作。关闭安装窗口后tray继续可用；退出Desktop时，已接受runtime transition的ownership仍属于Supervisor。

## 验证

required CI运行tray API测试、npm pack边界检查、Electron安装向导UI系统测试、隔离unpacked import解析以及Linux/Windows electron-builder打包。显式`pnpm run test:install`验收会在具备足够资源的runner上执行完整固定Plus source安装。release tag会发布npm tray package，并把平台安装包附到Desktop GitHub prerelease。

## 已知限制

- 0.2.0-rc.5安装包是未签名prerelease artifact；Windows SmartScreen或Linux桌面安全策略可能要求用户显式确认。
- 在配置release signing与notarization identity前不发布macOS安装包。
- 首次安装会在目标计算机编译official Harness source，因此耗时长于只包含应用文件的安装器。
- Windows native安装写入或复用系统工具链。高级WSL目标仍要求所选发行版内存在Git与Node.js。
