import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const parsed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }))
// npm reports the dry run as an array with one entry, and npm 12 reports an object
// keyed by package name. Accept either rather than pinning one npm major.
const result = Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0]
assert.notEqual(result, undefined, 'npm pack --json reported no package')
const files = new Set(result.files.map(entry => entry.path))
for (const path of ['LICENSE', 'README.md', 'README.zh.md', 'package.json', 'runtime/main.mjs', 'build/icon.png']) {
  assert.equal(files.has(path), true, 'missing packed file: ' + path)
}
for (const entry of files) {
  assert.equal(entry.startsWith('test/'), false, 'test leaked into tarball: ' + entry)
  assert.equal(entry.startsWith('scripts/'), false, 'script leaked into tarball: ' + entry)
}
console.log('desktop pack OK (' + files.size + ' files)')
