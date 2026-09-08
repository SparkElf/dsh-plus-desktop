---
description: "固定DeepSeek Harness Plus profile的Windows与Linux可安装桌面端。"
kind: "product-reference"
---

# DeepSeek Harness Plus Desktop

[English](README.md) | 中文

## 安装

Desktop 0.2.0-rc.5是`@sparkelf/dsh-plus@0.1.0-rc.22`对应的可安装桌面端。请从配套GitHub Release下载对应平台安装包：

- Windows x64：`DeepSeek.Harness.Plus.Setup.0.2.0-rc.5.exe`
- Linux x64：`deepseek-harness-plus-0.2.0-rc.5.AppImage`
- Debian/Ubuntu x64：`deepseek-harness-plus-0.2.0-rc.5.deb`

首次启动向导会选择安装目录、端口、代理、模型提供方和API凭据。它从内嵌Git bundle克隆official DeepSeek Harness revision `d347e703908d0406b7a7ef80e3a0e594d86b2215`，安装精确Plus distribution，应用source patches，执行official build，写入隔离DSH home，并启动外部Supervisor。既有用户settings与data保留在所选安装目录的`.dsh-plus/home`中。

Windows安装器内含Electron、带许可证的Node.js/npm runtime、pnpm、MinGit 2.55.0.5、精确official source Git bundle，以及Plus rc.22闭包中的27个已审阅tarball。计算机无需预装Git或Node.js。中文安装优先使用`https://registry.npmmirror.com`，失败后切换npm官方源；英文安装顺序相反。命令失败时，`error (23)`等registry下载警告也会触发备用源。安装向导支持HTTP、HTTPS和SOCKS5代理地址。Windows native依赖由CI针对内嵌Node ABI预编译；用户不需要Python、node-gyp、Visual Studio Build Tools或Windows SDK。

## 版本绑定

本Desktop build只有一个不可变runtime selection：

- Plus distribution：`@sparkelf/dsh-plus@0.1.0-rc.22`
- Official source：`d347e703908d0406b7a7ef80e3a0e594d86b2215`
- Supervisor：`@sparkelf/dsh-plugin-supervisor@0.1.3`
- Portable Git：`MinGit 2.55.0.5 win32-x64`（`sha256:56d7b226b7693196cfc71fef26568f536c4a021ab6c37ff2db4287bed908e96e`）

Desktop不复制Supervisor源码。native与WSL lifecycle commands使用Plus profile中安装的published Supervisor package。public npm export仍为`runPlusDesktop(electron, options)`，供只需要tray client的host使用。

## 桌面工作流

安装完成后，tray提供打开Harness与Supervisor progress、启动或停止Harness、重启、构建并重启、修复固定版本安装、管理所选release、打开本地data以及导出或恢复用户backup等操作。关闭安装窗口后tray继续可用；退出Desktop时，已接受runtime transition的ownership仍属于Supervisor。

## 验证

required CI运行tray API测试、npm pack边界检查、Electron安装向导UI系统测试、隔离unpacked import解析以及Linux/Windows electron-builder打包。显式`pnpm run test:install`验收会在具备足够资源的runner上执行完整固定Plus source安装。release tag会发布npm tray package，并把平台安装包附到Desktop GitHub prerelease。

## 已知限制

- 0.2.0-rc.5安装包是未签名prerelease artifact；Windows SmartScreen或Linux桌面安全策略可能要求用户显式确认。
- 在配置release signing与notarization identity前不发布macOS安装包。
- 首次安装会在目标计算机编译official Harness source，因此耗时长于只包含应用文件的安装器。
- Windows native安装使用内嵌MinGit。高级WSL目标仍要求所选发行版内存在Git与Node.js。
