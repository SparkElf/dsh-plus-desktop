import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** 校验打包产物只携带运行所需小型资源，并在隔离目录解析Supervisor模块。 */
async function main() {
  const distDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const unpacked = await findUnpacked(distDirectory)
  if (unpacked === undefined) throw new Error('no app.asar.unpacked found under ' + distDirectory)
  const resources = dirname(unpacked)
  for (const removed of ['node-runtime', 'git-runtime', 'official-source']) {
    if (await exists(join(resources, removed))) throw new Error('packaged installer contains removed heavy resource ' + removed)
  }
  const closure = (await readdir(join(resources, 'plus-closure'))).filter(name => name.endsWith('.tgz'))
  if (closure.length !== 27) throw new Error('packaged Plus closure contains ' + String(closure.length) + ' tarballs, expected 27')
  if (process.platform === 'win32') await verifyWindowsNative(resources)
  console.log('[verify-unpacked-imports] closure 27; external system toolchain')

  const yamlManifest = join(unpacked, 'node_modules', 'yaml', 'package.json')
  const pnpmManifest = join(unpacked, 'node_modules', 'pnpm', 'package.json')
  if (!await exists(yamlManifest) || !await exists(pnpmManifest)) throw new Error('packaged tree is missing yaml or pnpm beside the unpacked sources')
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
        throw error
      }
    }
  } finally {
    await rm(isolated, { recursive: true, force: true })
  }
}

async function verifyWindowsNative(resources) {
  const native = JSON.parse(await readFile(join(resources, 'windows-native', 'runtime.json'), 'utf8'))
  if (native.modules !== process.versions.modules) throw new Error('packaged fs-ext ABI does not match the CI Node ABI')
  const archive = join(resources, 'windows-native', native.file)
  const digest = createHash('sha256').update(await readFile(archive)).digest('hex')
  if (digest !== native.sha256) throw new Error('packaged fs-ext tarball checksum mismatch')
  const probe = await mkdtemp(join(tmpdir(), 'dsh-fs-ext-verify-'))
  try {
    const unpack = spawnSync('tar', ['-xzf', archive, '-C', probe], { encoding: 'utf8', windowsHide: true })
    if (unpack.status !== 0) throw new Error('packaged fs-ext tarball failed to extract: ' + unpack.stderr.trim())
    const manifest = JSON.parse(await readFile(join(probe, 'package', 'package.json'), 'utf8'))
    if (manifest.scripts?.install !== 'node -e ""') throw new Error('packaged fs-ext does not suppress source compilation')
    const loaded = spawnSync(process.execPath, ['-e', 'require(process.argv[1])', join(probe, 'package')], { encoding: 'utf8', windowsHide: true })
    if (loaded.status !== 0) throw new Error('packaged fs-ext failed to load: ' + loaded.stderr.trim())
  } finally {
    await rm(probe, { recursive: true, force: true })
  }
  console.log('[verify-unpacked-imports] fs-ext ABI ' + native.modules)
}

async function exists(path) {
  try { await stat(path); return true } catch { return false }
}

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
