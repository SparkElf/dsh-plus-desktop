---
description: "固定DeepSeek Harness Plus profile的Windows与Linux可安装桌面端。"
kind: "product-reference"
---

# DeepSeek Harness Plus Desktop

[English](README.md) | 中文

## 安装

Desktop 0.2.0-rc.1是`@sparkelf/dsh-plus@0.1.0-rc.22`对应的可安装桌面端。请从配套GitHub Release下载对应平台安装包：

- Windows x64：`DeepSeek.Harness.Plus.Setup.0.2.0-rc.1.exe`
- Linux x64：`deepseek-harness-plus-0.2.0-rc.1.AppImage`
- Debian/Ubuntu x64：`deepseek-harness-plus-0.2.0-rc.1.deb`

首次启动向导会选择安装目录、端口、代理、模型提供方和API凭据。它获取official DeepSeek Harness revision `d347e703908d0406b7a7ef80e3a0e594d86b2215`，安装精确Plus distribution，应用source patches，执行official build，写入隔离DSH home，并启动外部Supervisor。既有用户settings与data保留在所选安装目录的`.dsh-plus/home`中。

安装器内含Electron、带许可证的独立Node runtime、pnpm以及Plus rc.22闭包中的27个已审阅tarball。首次安装时，计算机需要Git，并需能访问GitHub与npm。向导会在修改所选目录前检查这两个条件，并支持HTTP、HTTPS和SOCKS5代理地址。

## 版本绑定

本Desktop build只有一个不可变runtime selection：

- Plus distribution：`@sparkelf/dsh-plus@0.1.0-rc.22`
- Official source：`d347e703908d0406b7a7ef80e3a0e594d86b2215`
- Supervisor：`@sparkelf/dsh-plugin-supervisor@0.1.3`

Desktop不复制Supervisor源码。native与WSL lifecycle commands使用Plus profile中安装的published Supervisor package。public npm export仍为`runPlusDesktop(electron, options)`，供只需要tray client的host使用。

## 桌面工作流

安装完成后，tray提供打开Harness与Supervisor progress、启动或停止Harness、重启、构建并重启、修复固定版本安装、管理所选release、打开本地data以及导出或恢复用户backup等操作。关闭安装窗口后tray继续可用；退出Desktop时，已接受runtime transition的ownership仍属于Supervisor。

## 验证

仓库运行tray API测试、npm pack边界检查、Electron安装向导UI系统测试、真实固定Plus安装测试、隔离unpacked import解析以及Linux/Windows electron-builder打包。release tag会发布npm tray package，并把平台安装包附到Desktop GitHub prerelease。

## 已知限制

- 0.2.0-rc.1安装包是未签名prerelease artifact；Windows SmartScreen或Linux桌面安全策略可能要求用户显式确认。
- 在配置release signing与notarization identity前不发布macOS安装包。
- 首次安装会在目标计算机编译official Harness source，因此耗时长于只包含应用文件的安装器。
- 本版本未内置Git。
