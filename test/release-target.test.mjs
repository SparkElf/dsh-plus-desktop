import assert from 'node:assert/strict'
import test from 'node:test'
import { materializationCommands, OFFICIAL_REPOSITORY, OFFICIAL_SOURCE_REVISION, PLUS_DISTRIBUTION } from '../src/release-target.mjs'

test('pins the Desktop installer to registry Plus rc.24 and official DSH 0.1.5-alpha.2', () => {
  assert.equal(OFFICIAL_REPOSITORY, 'https://github.com/deepseek-ai/deepseek-harness.git')
  assert.equal(OFFICIAL_SOURCE_REVISION, 'b2e3b2a0125854567a4a5fcba75782e42fe84901')
  assert.equal(PLUS_DISTRIBUTION, '@sparkelf/dsh-plus@0.1.0-rc.24')
  assert.deepEqual(materializationCommands({ profilePath: '/opt/dsh-home/profiles/plus', installPath: '/opt/dsh-plus' }), [
    { cwd: '/opt/dsh-home/profiles/plus', args: ['install'] },
    { cwd: '/opt/dsh-home/profiles/plus', args: ['exec', 'dsh-plus', 'apply', '--dsh-root', '/opt/dsh-plus'] },
  ])
})
