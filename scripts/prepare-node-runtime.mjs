import { chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = join(root, 'vendor', 'node')
const binaryName = process.platform === 'win32' ? 'node.exe' : 'node'
await mkdir(destination, { recursive: true })
await copyFile(process.execPath, join(destination, binaryName))
if (process.platform !== 'win32') await chmod(join(destination, binaryName), 0o755)
let license
for (const candidate of [join(dirname(process.execPath), 'LICENSE'), join(dirname(process.execPath), '..', 'LICENSE')]) {
  try { license = await readFile(candidate); break } catch {}
}
if (license === undefined) throw new Error('The selected Node distribution does not include LICENSE')
await writeFile(join(destination, 'LICENSE'), license)
await writeFile(join(destination, 'runtime.json'), JSON.stringify({ version: process.version, platform: process.platform, arch: process.arch, binary: binaryName }, null, 2) + String.fromCharCode(10))
console.log('Embedded Node runtime ready: ' + process.version + ' ' + process.platform + '-' + process.arch)
