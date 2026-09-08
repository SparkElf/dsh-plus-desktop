import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { stringify } from 'yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = join(root, 'vendor', 'windows-native')
await mkdir(destination, { recursive: true })
if (process.platform !== 'win32') {
  await writeFile(join(destination, 'runtime.json'), JSON.stringify({ bundled: false, platform: process.platform }, null, 2) + String.fromCharCode(10))
  console.log('Windows native dependencies are built only on Windows')
} else {
  let cached
  try { cached = JSON.parse(await readFile(join(destination, 'runtime.json'), 'utf8')) } catch { cached = undefined }
  if (cached?.node === process.version && cached?.modules === process.versions.modules) {
    const archive = await readFile(join(destination, cached.file))
    if (createHash('sha256').update(archive).digest('hex') === cached.sha256) {
      console.log('Prebuilt fs-ext ready: Node ' + process.version + ' ABI ' + process.versions.modules)
      process.exit(0)
    }
  }
  await rm(destination, { recursive: true, force: true })
  await mkdir(destination, { recursive: true })
  const working = await mkdtemp(join(tmpdir(), 'dsh-plus-fs-ext-'))
  try {
    await writeFile(join(working, 'package.json'), JSON.stringify({ private: true, dependencies: { 'fs-ext': '2.1.1' } }, null, 2) + String.fromCharCode(10))
    await writeFile(join(working, 'pnpm-workspace.yaml'), stringify({ packages: ['.'], allowBuilds: { 'fs-ext': true } }))
    const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') ?? 'Path'
    const environment = { ...process.env, [pathKey]: join(root, 'node_modules', '.bin') + delimiter + (process.env[pathKey] ?? '') }
    run(process.execPath, [process.env.npm_execpath, 'install', '--no-frozen-lockfile'], working, environment)
    const installed = await realpath(join(working, 'node_modules', 'fs-ext'))
    const staged = join(working, 'staged')
    await cp(installed, staged, { recursive: true })
    const manifestPath = join(staged, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    manifest.scripts.install = 'node -e ""'
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + String.fromCharCode(10))
    run(process.execPath, ['-e', 'require(process.argv[1])', staged], working, environment)
    run(process.execPath, [process.env.npm_execpath, 'pack', '--pack-destination', destination], staged, environment)
    const source = join(destination, 'fs-ext-2.1.1.tgz')
    const file = 'fs-ext-2.1.1-win32-x64-node' + process.versions.modules + '.tgz'
    await rename(source, join(destination, file))
    const sha256 = createHash('sha256').update(await readFile(join(destination, file))).digest('hex')
    await writeFile(join(destination, 'runtime.json'), JSON.stringify({ bundled: true, package: 'fs-ext', version: '2.1.1', node: process.version, modules: process.versions.modules, file, sha256 }, null, 2) + String.fromCharCode(10))
    console.log('Prebuilt fs-ext ready: Node ' + process.version + ' ABI ' + process.versions.modules)
  } finally {
    await rm(working, { recursive: true, force: true })
  }
}

function run(command, args, cwd, env) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', windowsHide: true })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(command + ' ' + args.join(' ') + ' failed: ' + [result.stdout, result.stderr].filter(Boolean).join('\n').trim())
  return result.stdout.trim()
}
