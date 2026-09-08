import { chmod, copyFile, cp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
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
if (process.platform === 'win32') {
  const distribution = dirname(process.execPath)
  await copyFile(join(distribution, 'npm.cmd'), join(destination, 'npm.cmd'))
  await copyFile(join(distribution, 'npx.cmd'), join(destination, 'npx.cmd'))
  await cp(join(distribution, 'node_modules', 'npm'), join(destination, 'node_modules', 'npm'), { recursive: true })
  await cp(await realpath(join(root, 'node_modules', 'pnpm')), join(destination, 'node_modules', 'pnpm'), { recursive: true })
  const crlf = String.fromCharCode(13, 10)
  await writeFile(join(destination, 'pnpm.cmd'), ['@echo off', '"%~dp0node.exe" "%~dp0node_modules\\pnpm\\bin\\pnpm.mjs" %*'].join(crlf) + crlf)
}
await writeFile(join(destination, 'runtime.json'), JSON.stringify({ version: process.version, modules: process.versions.modules, platform: process.platform, arch: process.arch, binary: binaryName, npm: process.platform === 'win32' ? 'npm.cmd' : undefined, pnpm: process.platform === 'win32' ? 'node_modules/pnpm/bin/pnpm.mjs' : undefined }, null, 2) + String.fromCharCode(10))
console.log('Embedded Node toolchain ready: ' + process.version + ' ' + process.platform + '-' + process.arch)
