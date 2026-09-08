import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'build', 'plus-closure.json')
const destination = resolve(process.env.DSH_PLUS_DESKTOP_CLOSURE_DIR ?? join(root, 'vendor', 'plus-rc22'))
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

async function prepare(entry) {
  const target = join(destination, entry.file)
  let current
  try { current = createHash('sha256').update(await readFile(target)).digest('hex') } catch { current = undefined }
  if (current === entry.sha256) return
  const npmPackage = entry.url.startsWith('https://registry.npmjs.org/')
  const urls = npmPackage
    ? [entry.url, entry.url.replace('https://registry.npmjs.org/', 'https://registry.npmmirror.com/')]
    : [entry.url, entry.url, entry.url]
  let failure
  for (const [attempt, url] of urls.entries()) {
    if (!npmPackage && attempt > 0) {
      const delay = attempt === 1 ? 5_000 : 20_000
      console.log('Retrying ' + entry.file + ' in ' + String(delay / 1_000) + ' seconds')
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    const controller = new AbortController()
    let timer = setTimeout(() => controller.abort(), 60_000)
    let bytes
    try {
      console.log('Downloading ' + entry.file + ' from ' + new URL(url).host)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!response.ok) throw new Error('HTTP ' + String(response.status))
      timer = setTimeout(() => controller.abort(), 15 * 60_000)
      bytes = Buffer.from(await response.arrayBuffer())
      clearTimeout(timer)
    } catch (error) {
      clearTimeout(timer)
      console.error('[prepare-closure] download failed for ' + entry.file + ' from ' + url, error)
      failure = error
      continue
    }
    const actual = createHash('sha256').update(bytes).digest('hex')
    if (actual !== entry.sha256) throw new Error('Checksum mismatch for ' + entry.file + ': ' + actual)
    const temporary = target + '.tmp'
    await writeFile(temporary, bytes)
    await rename(temporary, target)
    console.log('Downloaded ' + entry.file)
    return
  }
  throw new Error('Every package source failed for ' + entry.file, { cause: failure })
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
