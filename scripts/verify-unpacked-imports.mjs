import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * 校验打包产物中 unpacked Supervisor 模块在没有 workspace node_modules 的环境里完成解析。
 * 从 dist 内定位 app.asar.unpacked，把它复制到临时隔离目录再动态导入 Supervisor 模块图，
 * 阻断向仓库 node_modules 的回退解析，还原安装目录的解析环境。
 * @returns {Promise<void>} 结构缺失或任一外部依赖解析失败时以非零退出结束进程。
 */
async function main() {
  const distDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const unpacked = await findUnpacked(distDirectory)
  if (unpacked === undefined) {
    console.error('[verify-unpacked-imports] no app.asar.unpacked found under ' + distDirectory)
    process.exitCode = 1
    return
  }
  const resources = dirname(unpacked)
  const closure = (await readdir(join(resources, 'plus-closure'))).filter(name => name.endsWith('.tgz'))
  if (closure.length !== 27) throw new Error('packaged Plus closure contains ' + String(closure.length) + ' tarballs, expected 27')
  const sourceManifest = JSON.parse(await readFile(join(resources, 'official-source', 'runtime.json'), 'utf8'))
  const bundle = join(resources, 'official-source', 'official-source.bundle')
  const gitCommand = process.platform === 'win32' ? join(resources, 'git-runtime', 'cmd', 'git.exe') : 'git'
  const bundleResult = spawnSync(gitCommand, ['bundle', 'verify', bundle], { encoding: 'utf8', windowsHide: true })
  if (bundleResult.status !== 0) throw new Error('packaged official source bundle is invalid: ' + bundleResult.stderr.trim())
  if (sourceManifest.revision !== 'd347e703908d0406b7a7ef80e3a0e594d86b2215') throw new Error('packaged official source revision is ' + sourceManifest.revision)
  const sourceProbe = await mkdtemp(join(tmpdir(), 'dsh-source-bundle-verify-'))
  try {
    const clone = spawnSync(gitCommand, ['clone', '--no-tags', bundle, join(sourceProbe, 'source')], { encoding: 'utf8', windowsHide: true })
    if (clone.status !== 0) throw new Error('packaged official source clone failed: ' + clone.stderr.trim())
    const head = spawnSync(gitCommand, ['rev-parse', 'HEAD'], { cwd: join(sourceProbe, 'source'), encoding: 'utf8', windowsHide: true })
    if (head.status !== 0 || head.stdout.trim() !== sourceManifest.revision) throw new Error('packaged official source clone has the wrong revision')
  } finally {
    await rm(sourceProbe, { recursive: true, force: true })
  }
  const nodeName = process.platform === 'win32' ? 'node.exe' : 'node'
  const nodeResult = spawnSync(join(resources, 'node-runtime', nodeName), ['-p', 'process.version'], { encoding: 'utf8', windowsHide: true })
  if (nodeResult.status !== 0) throw new Error('packaged Node runtime failed: ' + nodeResult.stderr.trim())
  if (process.platform === 'win32') {
    const gitResult = spawnSync(join(resources, 'git-runtime', 'cmd', 'git.exe'), ['--version'], { encoding: 'utf8', windowsHide: true })
    if (gitResult.status !== 0) throw new Error('packaged MinGit runtime failed: ' + gitResult.stderr.trim())
    const native = JSON.parse(await readFile(join(resources, 'windows-native', 'runtime.json'), 'utf8'))
    const node = JSON.parse(await readFile(join(resources, 'node-runtime', 'runtime.json'), 'utf8'))
    if (native.modules !== node.modules) throw new Error('packaged fs-ext ABI does not match packaged Node')
    const archive = join(resources, 'windows-native', native.file)
    const digest = createHash('sha256').update(await readFile(archive)).digest('hex')
    if (digest !== native.sha256) throw new Error('packaged fs-ext tarball checksum mismatch')
    const nativeProbe = await mkdtemp(join(tmpdir(), 'dsh-fs-ext-verify-'))
    try {
      const unpack = spawnSync('tar', ['-xzf', archive, '-C', nativeProbe], { encoding: 'utf8', windowsHide: true })
      if (unpack.status !== 0) throw new Error('packaged fs-ext tarball failed to extract: ' + unpack.stderr.trim())
      const packagedManifest = JSON.parse(await readFile(join(nativeProbe, 'package', 'package.json'), 'utf8'))
      if (packagedManifest.scripts?.install !== 'node -e ""') throw new Error('packaged fs-ext does not suppress source compilation')
      const nativeResult = spawnSync(join(resources, 'node-runtime', nodeName), ['-e', 'require(process.argv[1])', join(nativeProbe, 'package')], { encoding: 'utf8', windowsHide: true })
      if (nativeResult.status !== 0) throw new Error('packaged fs-ext failed to load: ' + nativeResult.stderr.trim())
    } finally {
      await rm(nativeProbe, { recursive: true, force: true })
    }
    console.log('[verify-unpacked-imports] ' + gitResult.stdout.trim() + '; fs-ext ABI ' + native.modules)
  }
  console.log('[verify-unpacked-imports] official source ' + sourceManifest.revision + '; closure 27; Node ' + nodeResult.stdout.trim())
  const yamlManifest = join(unpacked, 'node_modules', 'yaml', 'package.json')
  const pnpmManifest = join(unpacked, 'node_modules', 'pnpm', 'package.json')
  if (!await exists(yamlManifest) || !await exists(pnpmManifest)) {
    console.error('[verify-unpacked-imports] packaged tree is missing yaml or pnpm beside the unpacked sources')
    process.exitCode = 1
    return
  }
  const isolated = await mkdtemp(join(tmpdir(), 'dsh-unpacked-verify-'))
  const target = join(isolated, 'app.asar.unpacked')
  try {
    await cp(unpacked, target, { recursive: true })
    const modules = [
      ['Supervisor client', 'node_modules', '@sparkelf', 'dsh-plugin-supervisor', 'runtime', 'client.mjs'],
      ['Supervisor manifest', 'node_modules', '@sparkelf', 'dsh-plugin-supervisor', 'runtime', 'manifest.mjs'],
      ['Supervisor runtime', 'node_modules', '@sparkelf', 'dsh-plugin-supervisor', 'runtime', 'supervisor.mjs'],
    ]
    for (const [name, ...segments] of modules) {
      try {
        await import(pathToFileURL(join(target, ...segments)).href)
        console.log('[verify-unpacked-imports] resolved ' + name)
      } catch (error) {
        console.error('[verify-unpacked-imports] failed to resolve ' + name, error)
        process.exitCode = 1
        return
      }
    }
  } finally {
    await rm(isolated, { recursive: true, force: true })
  }
}

async function exists(path) {
  try { await stat(path); return true } catch { return false }
}

/** 在打包输出目录内递归查找 app.asar.unpacked 目录。 */
async function findUnpacked(directory) {
  let entries
  try { entries = await readdir(directory) } catch { return undefined }
  for (const entry of entries) {
    const path = join(directory, entry)
    if (entry === 'app.asar.unpacked' && (await stat(path)).isDirectory()) return path
  }
  for (const entry of entries) {
    const path = join(directory, entry)
    if ((await stat(path)).isDirectory()) {
      const found = await findUnpacked(path)
      if (found !== undefined) return found
    }
  }
  return undefined
}

await main()
