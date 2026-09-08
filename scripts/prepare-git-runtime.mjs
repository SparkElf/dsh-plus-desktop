import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = join(root, 'vendor', 'git')
const archivePath = join(destination, '.mingit.zip')
const release = {
  version: '2.55.0.5',
  url: 'https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/MinGit-2.55.0.5-64-bit.zip',
  sha256: '56d7b226b7693196cfc71fef26568f536c4a021ab6c37ff2db4287bed908e96e',
}

await mkdir(destination, { recursive: true })
if (process.platform !== 'win32') {
  await writeFile(join(destination, 'runtime.json'), JSON.stringify({ bundled: false, platform: process.platform }, null, 2) + String.fromCharCode(10))
  console.log('Portable Git is bundled only in the Windows installer')
} else {
  let archive
  try { archive = await readFile(archivePath) } catch { archive = undefined }
  if (archive === undefined || createHash('sha256').update(archive).digest('hex') !== release.sha256) {
    const response = await fetch(release.url)
    if (!response.ok) throw new Error('MinGit download failed: HTTP ' + String(response.status))
    archive = Buffer.from(await response.arrayBuffer())
    const actual = createHash('sha256').update(archive).digest('hex')
    if (actual !== release.sha256) throw new Error('MinGit checksum mismatch: ' + actual)
    await writeFile(archivePath, archive)
  }
  await rm(join(destination, 'cmd'), { recursive: true, force: true })
  await rm(join(destination, 'mingw64'), { recursive: true, force: true })
  await rm(join(destination, 'etc'), { recursive: true, force: true })
  new AdmZip(archive).extractAllTo(destination, true)
  await readFile(join(destination, 'cmd', 'git.exe'))
  await writeFile(join(destination, 'runtime.json'), JSON.stringify({ bundled: true, ...release }, null, 2) + String.fromCharCode(10))
  console.log('Portable Git ready: ' + release.version + ' win32-x64')
}
