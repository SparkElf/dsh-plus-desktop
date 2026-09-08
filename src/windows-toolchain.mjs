import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { app, dialog, net, session } from 'electron'

const gitRelease = {
  version: '2.55.0.5',
  file: 'Git-2.55.0.5-64-bit.exe',
  sha256: 'd065a4e23c3d9a6b5073d609b5be0830227ec3ca053c083ba385061ddfaf94c6',
  official: 'https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/Git-2.55.0.5-64-bit.exe',
  mainland: 'https://registry.npmmirror.com/-/binary/git-for-windows/v2.55.0.windows.5/Git-2.55.0.5-64-bit.exe',
}
const nodeRelease = {
  version: '24.20.0',
  file: 'node-v24.20.0-x64.msi',
  sha256: '28b69132c35ccc033bf8f2a67cd10c9d75ef5822593363309da448f2afff2d8a',
  official: 'https://nodejs.org/dist/v24.20.0/node-v24.20.0-x64.msi',
  mainland: 'https://npmmirror.com/mirrors/node/v24.20.0/node-v24.20.0-x64.msi',
}
const pnpmVersion = '11.7.0'

export async function ensureWindowsToolchain(form, report) {
  const existing = inspectExistingToolchain()
  if (existing.compatible) return existing.toolchain
  const zh = form.locale === 'zh'
  const details = existing.issues.map(issue => '- ' + issue).join(String.fromCharCode(10))
  const choice = await dialog.showMessageBox({
    type: 'warning',
    title: 'DeepSeek Harness Plus',
    message: zh ? '需要准备兼容的系统开发环境' : 'A compatible system toolchain is required',
    detail: (zh ? '检测到以下缺失或版本冲突：' : 'Missing or incompatible tools:') + String.fromCharCode(10) + details,
    buttons: zh
      ? ['安装或更新推荐版本', '保留现有版本并并行安装', '取消']
      : ['Install or update recommended versions', 'Keep existing versions and install side-by-side', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
  })
  if (choice.response === 2) throw new Error(zh ? '已取消系统开发环境安装。' : 'System toolchain installation was cancelled.')
  const sideBySide = choice.response === 1
  const root = sideBySide ? join(process.env.ProgramFiles, 'DeepSeek Harness Plus Toolchain') : process.env.ProgramFiles
  const nodeDirectory = sideBySide ? join(root, 'Node-' + nodeRelease.version) : join(root, 'nodejs')
  const gitDirectory = sideBySide ? join(root, 'Git-' + gitRelease.version) : join(root, 'Git')
  const downloadDirectory = join(app.getPath('temp'), 'deepseek-harness-plus-toolchain')
  await mkdir(downloadDirectory, { recursive: true })
  await session.defaultSession.setProxy(form.proxy ? { proxyRules: form.proxy } : { mode: 'system' })
  const sources = zh ? ['mainland', 'official'] : ['official', 'mainland']
  const gitInstaller = await downloadVerified(gitRelease, sources, downloadDirectory, report, zh)
  const nodeInstaller = await downloadVerified(nodeRelease, sources, downloadDirectory, report, zh)
  const script = installationScript({ gitInstaller, nodeInstaller, gitDirectory, nodeDirectory, registry: zh ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.org', fallbackRegistry: zh ? 'https://registry.npmjs.org' : 'https://registry.npmmirror.com' })
  report(9, zh ? '正在请求管理员权限安装系统开发环境…' : 'Requesting administrator permission to install the system toolchain…')
  runElevated(script)
  const toolchain = inspectKnownToolchain(gitDirectory, nodeDirectory)
  if (!toolchain.compatible) throw new Error('Installed toolchain verification failed: ' + toolchain.issues.join('; '))
  return toolchain.toolchain
}

async function downloadVerified(release, sources, directory, report, zh) {
  const target = join(directory, release.file)
  try {
    const bytes = await readFile(target)
    if (createHash('sha256').update(bytes).digest('hex') === release.sha256) return target
  } catch {}
  let failure
  for (const source of sources) {
    const url = release[source]
    const controller = new AbortController()
    let timer = setTimeout(() => controller.abort(), 60_000)
    try {
      report(6, zh ? '正在下载系统开发工具…' : 'Downloading system development tools…', new URL(url).host)
      const response = await net.fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!response.ok) throw new Error('HTTP ' + String(response.status))
      timer = setTimeout(() => controller.abort(), 15 * 60_000)
      const bytes = Buffer.from(await response.arrayBuffer())
      clearTimeout(timer)
      const digest = createHash('sha256').update(bytes).digest('hex')
      if (digest !== release.sha256) throw new Error(release.file + ' checksum mismatch: ' + digest)
      await writeFile(target, bytes)
      return target
    } catch (error) {
      clearTimeout(timer)
      console.error('[plus-desktop] system tool download failed', error)
      failure = error
    }
  }
  throw new Error('Every download source failed for ' + release.file, { cause: failure })
}

function inspectExistingToolchain() {
  const git = where('git.exe')
  const node = where('node.exe')
  const npm = node === undefined ? undefined : join(node.slice(0, node.lastIndexOf('\\')), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  const npmRoot = node === undefined || npm === undefined || !exists(npm) ? undefined : run(node, [npm, 'root', '--global'])
  const pnpm = npmRoot === undefined ? undefined : join(npmRoot, 'pnpm', 'bin', 'pnpm.mjs')
  return inspectPaths(git, node, npm, pnpm)
}

function inspectKnownToolchain(gitDirectory, nodeDirectory) {
  return inspectPaths(join(gitDirectory, 'cmd', 'git.exe'), join(nodeDirectory, 'node.exe'), join(nodeDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js'), join(nodeDirectory, 'node_modules', 'pnpm', 'bin', 'pnpm.mjs'))
}

function inspectPaths(git, node, npm, pnpm) {
  const issues = []
  const gitVersion = git === undefined || !exists(git) ? undefined : run(git, ['--version'])
  const nodeVersion = node === undefined || !exists(node) ? undefined : run(node, ['--version'])
  const npmVersion = node === undefined || npm === undefined || !exists(npm) ? undefined : run(node, [npm, '--version'])
  const pnpmVersionFound = node === undefined || pnpm === undefined || !exists(pnpm) ? undefined : run(node, [pnpm, '--version'])
  if (gitVersion === undefined) issues.push('Git ' + gitRelease.version)
  if (nodeVersion === undefined || !nodeVersion.startsWith('v24.')) issues.push('Node.js ' + nodeRelease.version)
  if (npmVersion === undefined) issues.push('npm')
  if (pnpmVersionFound === undefined || !pnpmVersionFound.startsWith('11.')) issues.push('pnpm ' + pnpmVersion)
  if (issues.length > 0) return { compatible: false, issues }
  return {
    compatible: true,
    issues,
    toolchain: { mode: 'system', git, gitVersion, node, nodeVersion, modules: run(node, ['-p', 'process.versions.modules']), npm, npmVersion, pnpm, pnpmBin: dirname(dirname(dirname(pnpm))), pnpmVersion: pnpmVersionFound },
  }
}

function where(command) {
  const result = spawnSync('where.exe', [command], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) return undefined
  return result.stdout.split(/\r?\n/u).map(value => value.trim()).find(Boolean)
}

function exists(path) {
  return existsSync(path)
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true })
  if (result.error !== undefined || result.status !== 0) return undefined
  return result.stdout.trim()
}

function runElevated(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const command = "$p=Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @('-NoProfile','-EncodedCommand','" + encoded + "'); exit $p.ExitCode"
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8', windowsHide: true })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error('System toolchain installer failed: ' + [result.stdout, result.stderr].filter(Boolean).join(String.fromCharCode(10)).trim())
}

function installationScript(config) {
  const q = value => "'" + value.replaceAll("'", "''") + "'"
  return [
    "$ErrorActionPreference = 'Stop'",
    "$git = Start-Process " + q(config.gitInstaller) + " -Wait -PassThru -ArgumentList @('/VERYSILENT','/NORESTART','/SUPPRESSMSGBOXES','/SP-','/ALLUSERS','/DIR=" + config.gitDirectory.replaceAll("'", "''") + "')",
    "if ($git.ExitCode -ne 0) { throw 'Git installer failed with exit code ' + $git.ExitCode }",
    "$node = Start-Process msiexec.exe -Wait -PassThru -ArgumentList @('/i'," + q(config.nodeInstaller) + ",'/qn','/norestart','ALLUSERS=1','INSTALLDIR=" + config.nodeDirectory.replaceAll("'", "''") + "')",
    "if ($node.ExitCode -ne 0) { throw 'Node installer failed with exit code ' + $node.ExitCode }",
    "$npm = " + q(join(config.nodeDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js')),
    "$nodeExe = " + q(join(config.nodeDirectory, 'node.exe')),
    "& $nodeExe $npm install --global --prefix " + q(config.nodeDirectory) + " pnpm@" + pnpmVersion + " --registry=" + q(config.registry),
    "if ($LASTEXITCODE -ne 0) { & $nodeExe $npm install --global --prefix " + q(config.nodeDirectory) + " pnpm@" + pnpmVersion + " --registry=" + q(config.fallbackRegistry) + " }",
    "if ($LASTEXITCODE -ne 0) { throw 'pnpm installation failed' }",
    "$gitCmd = " + q(join(config.gitDirectory, 'cmd')),
    "$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')",
    "foreach ($entry in @(" + q(config.nodeDirectory) + ",$gitCmd)) { if (($machinePath -split ';') -notcontains $entry) { $machinePath = $machinePath.TrimEnd(';') + ';' + $entry } }",
    "[Environment]::SetEnvironmentVariable('Path', $machinePath, 'Machine')",
  ].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10)
}
