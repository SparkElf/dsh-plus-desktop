import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const result = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }))[0]
const files = new Set(result.files.map(entry => entry.path))
for (const path of ['LICENSE', 'README.md', 'README.zh.md', 'package.json', 'runtime/main.mjs', 'build/icon.png']) {
  assert.equal(files.has(path), true, 'missing packed file: ' + path)
}
for (const entry of files) {
  assert.equal(entry.startsWith('test/'), false, 'test leaked into tarball: ' + entry)
  assert.equal(entry.startsWith('scripts/'), false, 'script leaked into tarball: ' + entry)
}
console.log('desktop pack OK (' + files.size + ' files)')
