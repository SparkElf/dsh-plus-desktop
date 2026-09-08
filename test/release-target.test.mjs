import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { materializationCommands, OFFICIAL_REPOSITORY, OFFICIAL_SOURCE_REVISION, PLUS_DISTRIBUTION } from '../src/release-target.mjs'

test('pins the Desktop installer to the Plus rc.22 official-source materialization', () => {
  assert.equal(OFFICIAL_REPOSITORY, 'https://github.com/deepseek-ai/deepseek-harness.git')
  assert.equal(OFFICIAL_SOURCE_REVISION, 'd347e703908d0406b7a7ef80e3a0e594d86b2215')
  assert.equal(PLUS_DISTRIBUTION, '@sparkelf/dsh-plus@0.1.0-rc.22')
  const closure = JSON.parse(readFileSync(new URL('../build/plus-closure.json', import.meta.url), 'utf8'))
  assert.equal(closure.profile, PLUS_DISTRIBUTION)
  assert.equal(closure.packages.filter(entry => entry.profileDependency).length, 18)
  assert.equal(closure.packages.filter(entry => !entry.profileDependency).length, 9)
  assert.ok(closure.packages.filter(entry => entry.profileDependency).every(entry => entry.url.startsWith('https://registry.npmjs.org/')))
  assert.ok(closure.packages.filter(entry => !entry.profileDependency).every(entry => entry.url.includes('/releases/download/plus-v0.6.0/')))
  assert.deepEqual(materializationCommands({ profilePath: '/opt/dsh-home/profiles/plus', installPath: '/opt/dsh-plus' }), [
    { cwd: '/opt/dsh-home/profiles/plus', args: ['install'] },
    { cwd: '/opt/dsh-home/profiles/plus', args: ['exec', 'dsh-plus', 'apply', '--dsh-root', '/opt/dsh-plus'] },
  ])
})
