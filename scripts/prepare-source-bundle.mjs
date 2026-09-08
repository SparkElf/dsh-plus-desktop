import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { OFFICIAL_REPOSITORY, OFFICIAL_SOURCE_REVISION } from '../src/release-target.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = join(root, 'vendor', 'official-source')
const bundlePath = join(destination, 'official-source.bundle')
const manifestPath = join(destination, 'runtime.json')
const repository = process.env.DSH_PLUS_DESKTOP_SOURCE_REPOSITORY ?? OFFICIAL_REPOSITORY
const revision = process.env.DSH_PLUS_DESKTOP_SOURCE_REVISION ?? OFFICIAL_SOURCE_REVISION

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error('git ' + args.join(' ') + ' failed: ' + result.stderr.trim())
  return result.stdout.trim()
}

await mkdir(destination, { recursive: true })
let current
try { current = JSON.parse(await readFile(manifestPath, 'utf8')) } catch { current = undefined }
if (current?.repository === repository && current?.revision === revision) {
  const bytes = await readFile(bundlePath)
  if (createHash('sha256').update(bytes).digest('hex') === current.sha256) {
    git(['bundle', 'verify', bundlePath], root)
    console.log('Official source bundle ready: ' + revision)
    process.exit(0)
  }
}
const working = await mkdtemp(join(tmpdir(), 'dsh-plus-official-source-'))
try {
  git(['init'], working)
  git(['remote', 'add', 'origin', repository], working)
  git(['fetch', '--depth', '1', 'origin', revision], working)
  git(['checkout', '--detach', 'FETCH_HEAD'], working)
  const head = git(['rev-parse', 'HEAD'], working)
  if (head !== revision) throw new Error('Official source resolved to ' + head + ', expected ' + revision)
  await rm(bundlePath, { force: true })
  git(['bundle', 'create', bundlePath, 'HEAD'], working)
  git(['bundle', 'verify', bundlePath], root)
  const sha256 = createHash('sha256').update(await readFile(bundlePath)).digest('hex')
  await writeFile(manifestPath, JSON.stringify({ repository, revision, sha256 }, null, 2) + String.fromCharCode(10))
  console.log('Official source bundle ready: ' + revision)
} finally {
  await rm(working, { recursive: true, force: true })
}
