import assert from 'node:assert/strict'
import test from 'node:test'
import { materializationCommands, OFFICIAL_REPOSITORY, OFFICIAL_SOURCE_REVISION, PLUS_DISTRIBUTION } from '../src/release-target.mjs'

test('pins the Desktop installer to registry Plus rc.23 and official DSH 0.1.5', () => {
  assert.equal(OFFICIAL_REPOSITORY, 'https://github.com/deepseek-ai/deepseek-harness.git')
  assert.equal(OFFICIAL_SOURCE_REVISION, '5dda764ed3aa172535a7967b06ff95d9cbfe536a')
  assert.equal(PLUS_DISTRIBUTION, '@sparkelf/dsh-plus@0.1.0-rc.23')
  assert.deepEqual(materializationCommands({ profilePath: '/opt/dsh-home/profiles/plus', installPath: '/opt/dsh-plus' }), [
    { cwd: '/opt/dsh-home/profiles/plus', args: ['install'] },
    { cwd: '/opt/dsh-home/profiles/plus', args: ['exec', 'dsh-plus', 'apply', '--dsh-root', '/opt/dsh-plus'] },
  ])
})
