import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'build', 'plus-closure.json')
const destination = resolve(process.env.DSH_PLUS_DESKTOP_CLOSURE_DIR ?? join(root, 'vendor', 'plus-rc22'))
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const baseURL = process.env.DSH_PLUS_DESKTOP_RELEASE_URL ?? 'https://github.com/SparkElf/deepseek-harness-plus/releases/download/' + manifest.release

async function prepare(entry) {
  const target = join(destination, entry.file)
  let current
  try { current = createHash('sha256').update(await readFile(target)).digest('hex') } catch { current = undefined }
  if (current === entry.sha256) return
  const response = await fetch(baseURL + '/' + encodeURIComponent(entry.file))
  if (!response.ok) throw new Error('Download failed for ' + entry.file + ': HTTP ' + String(response.status))
  const temporary = target + '.tmp'
  const bytes = Buffer.from(await response.arrayBuffer())
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== entry.sha256) throw new Error('Checksum mismatch for ' + entry.file)
  await writeFile(temporary, bytes)
  await rename(temporary, target)
  console.log('Downloaded ' + entry.file)
}

await mkdir(destination, { recursive: true })
await Promise.all(Array.from({ length: 4 }, async (_, worker) => {
  for (let index = worker; index < manifest.packages.length; index += 4) await prepare(manifest.packages[index])
}))
await writeFile(join(destination, 'plus-closure.json'), JSON.stringify(manifest, null, 2) + String.fromCharCode(10))
for (const entry of manifest.packages) {
  const actual = createHash('sha256').update(await readFile(join(destination, entry.file))).digest('hex')
  if (actual !== entry.sha256) throw new Error('Stored checksum mismatch for ' + entry.file)
}
console.log('Plus Desktop closure ready: ' + String(manifest.packages.length) + ' package(s)')
