import assert from 'node:assert/strict'
import { setImmediate as waitForImmediate } from 'node:timers/promises'
import test from 'node:test'

import { state, resetSupervisorFixture } from '@sparkelf/dsh-plugin-supervisor/state'
import { runPlusDesktop } from '../runtime/main.mjs'

test('mounts a tray and delegates commands to the configured Supervisor', async () => {
  resetSupervisorFixture()
  let template
  let icon
  const opened = []
  let quit = false
  class Tray {
    setTitle(value) { this.title = value }
    setToolTip(value) { this.toolTip = value }
    setContextMenu(value) { this.menu = value }
  }
  const electron = {
    app: {
      async whenReady() {},
      getLocale() { return 'en-US' },
      quit() { quit = true },
    },
    dialog: { showErrorBox() { assert.fail('unexpected Supervisor error') } },
    Menu: { buildFromTemplate(value) { template = value; return value } },
    nativeImage: { createFromPath(value) { icon = value; return { value } } },
    shell: { async openExternal(value) { opened.push(value) } },
    Tray,
  }

  const mounted = await runPlusDesktop(electron, { manifestPath: '/tmp/runtime.json' })
  assert.equal(mounted.supervisorProcess, undefined)
  assert.equal(mounted.tray.title, 'DeepSeek Harness Plus')
  assert.match(mounted.tray.toolTip, /Harness running/)
  assert.match(icon, /build[/\\]icon[.]png$/)
  assert.equal(state.commands[0], 'status')

  template.find(item => item.label === 'Open Harness').click()
  template.find(item => item.label === 'Open Supervisor').click()
  await waitForImmediate()
  assert.deepEqual(opened, ['http://127.0.0.1:3080', 'http://127.0.0.1:3082'])

  template.find(item => item.label === 'Stop').click()
  await waitForImmediate()
  assert.equal(state.commands.at(-1), 'stop')
  template.find(item => item.label === 'Quit Desktop').click()
  assert.equal(quit, true)
})
