import assert from 'node:assert/strict'
import test from 'node:test'
import { materializationCommands, OFFICIAL_REPOSITORY, OFFICIAL_SOURCE_REVISION, PLUS_DISTRIBUTION } from '../src/release-target.mjs'

test('pins the Desktop installer to registry Plus rc.26 and official DSH 0.1.5-rc.2', () => {
  assert.equal(OFFICIAL_REPOSITORY, 'https://github.com/deepseek-ai/deepseek-harness.git')
  assert.equal(OFFICIAL_SOURCE_REVISION, 'fb2c4b9e698e30edb738bca4cf0618587db7d203')
  assert.equal(PLUS_DISTRIBUTION, '@sparkelf/dsh-plus@0.1.0-rc.26')
  assert.deepEqual(materializationCommands({ profilePath: '/opt/dsh-home/profiles/plus', installPath: '/opt/dsh-plus' }), [
    { cwd: '/opt/dsh-home/profiles/plus', args: ['install'] },
    { cwd: '/opt/dsh-home/profiles/plus', args: ['exec', 'dsh-plus', 'apply', '--dsh-root', '/opt/dsh-plus'] },
  ])
})
