import { cp, mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

async function main() {
  const distDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const unpacked = await findUnpacked(distDirectory)
  if (unpacked === undefined) throw new Error('no app.asar.unpacked found under ' + distDirectory)
  const resources = dirname(unpacked)
  for (const removed of ['node-runtime', 'git-runtime', 'official-source', 'plus-closure', 'windows-native']) {
    if (await exists(join(resources, removed))) throw new Error('packaged installer contains removed heavy resource ' + removed)
  }
  if (await exists(join(unpacked, 'node_modules', 'pnpm'))) throw new Error('packaged installer embeds pnpm; use the system toolchain')
  const isolated = await mkdtemp(join(tmpdir(), 'dsh-unpacked-verify-'))
  const target = join(isolated, 'app.asar.unpacked')
  try {
    await cp(unpacked, target, { recursive: true })
    for (const [name, ...segments] of [
      ['Supervisor client', 'node_modules', '@sparkelf', 'dsh-plugin-supervisor', 'runtime', 'client.mjs'],
      ['Supervisor manifest', 'node_modules', '@sparkelf', 'dsh-plugin-supervisor', 'runtime', 'manifest.mjs'],
      ['Supervisor runtime', 'node_modules', '@sparkelf', 'dsh-plugin-supervisor', 'runtime', 'supervisor.mjs'],
    ]) {
      await import(pathToFileURL(join(target, ...segments)).href)
      console.log('[verify-unpacked-imports] resolved ' + name)
    }
  } finally { await rm(isolated, { recursive: true, force: true }) }
}
async function exists(path) { try { await stat(path); return true } catch { return false } }
async function findUnpacked(directory) { let entries; try { entries = await (await import('node:fs/promises')).readdir(directory) } catch { return undefined }; for (const entry of entries) { const path = join(directory, entry); if (entry === 'app.asar.unpacked' && (await stat(path)).isDirectory()) return path; if ((await stat(path).catch(() => null))?.isDirectory()) { const found = await findUnpacked(path); if (found) return found } } return undefined }
await main()
