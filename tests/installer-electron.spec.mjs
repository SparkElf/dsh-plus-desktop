import { expect, test, _electron as electron } from 'playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendSupervisorCommand } from '@sparkelf/dsh-plugin-supervisor/client'

const desktopDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 等待备份窗口显示成功状态；期间出现错误文本则立即携带错误内容失败。 */
async function expectResult(backup, successText, timeoutMs) {
  const status = backup.locator('#status')
  const error = backup.locator('#error')
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const statusText = await status.textContent() ?? ''
    if (statusText.includes(successText)) return statusText
    const errorText = (await error.textContent() ?? '').trim()
    if (errorText !== '') throw new Error('Backup operation failed: ' + errorText)
    if (Date.now() > deadline) throw new Error('Timed out waiting for "' + successText + '"; status="' + statusText + '"')
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

test('installer validates directory provider proxy and retry controls', async ({}, testInfo) => {
  test.setTimeout(180_000)
  const application = await electron.launch({
    args: ['src/main.mjs', '--user-data-dir=' + testInfo.outputPath('user-data')],
    cwd: desktopDirectory,
    env: {
      ...process.env,
      DSH_PLUS_INSTALL_REPOSITORY: testInfo.outputPath('missing-repository'),
      DSH_PLUS_INSTALL_SOURCE_REF: 'HEAD',
    },
  })
  try {
    const page = await application.firstWindow()
    const layout = await page.evaluate(() => {
      const stepper = document.querySelector('#stepper').getBoundingClientRect()
      const panel = document.querySelector('.panel.active').getBoundingClientRect()
      const heading = document.querySelector('.panel.active h1').getBoundingClientRect()
      return {
        aligned: Math.abs(stepper.left - panel.left),
        gap: heading.top - stepper.bottom,
        headerBorder: getComputedStyle(document.querySelector('.brand-bar')).borderBottomWidth,
        footerBorder: getComputedStyle(document.querySelector('.action-bar')).borderTopWidth,
      }
    })
    expect(layout.aligned).toBeLessThan(2)
    expect(layout.gap).toBeGreaterThan(20)
    expect(layout.headerBorder).toBe('0px')
    expect(layout.footerBorder).toBe('0px')
    await page.getByRole('button', { name: '继续' }).click()
    await page.getByRole('button', { name: '选择文件夹' }).click()

    const browser = page.getByRole('dialog', { name: '选择安装目录' })
    await expect(browser).toBeVisible()
    await expect(browser.locator('.directory-column')).toHaveCount(1)
    await expect(browser.locator('#directoryPath')).not.toHaveValue('C:\\Users\\you')
    await browser.locator('.directory-row').first().click()
    await expect(browser.locator('.directory-column')).toHaveCount(2)
    await expect(browser.locator('.directory-row[aria-current="true"]')).toHaveCount(1)
    await browser.getByRole('button', { name: '新建文件夹' }).click()
    const createFolder = page.getByRole('dialog', { name: '新建文件夹' })
    await createFolder.locator('#directoryNewName').fill(`dsh-installer-retry-${process.pid}-${Date.now()}`)
    await createFolder.getByRole('button', { name: '创建' }).click()
    await expect(createFolder).toBeHidden()
    await browser.getByRole('button', { name: '打开' }).click()
    await expect(page.locator('#installPath')).not.toHaveValue('')
    await page.getByText('高级选项', { exact: true }).click()
    await page.locator('#port').fill('3180')
    await page.locator('#candidatePort').fill('3181')
    await page.locator('#supervisorPort').fill('3182')
    await page.locator('#candidateSupervisorPort').fill('3183')
    await page.locator('#proxy').fill('ftp://127.0.0.1:7890')
    await page.getByRole('button', { name: '继续' }).click()
    await expect(page.locator('#proxyError')).toHaveText('代理地址必须是 HTTP、HTTPS 或 SOCKS5 URL。')
    await expect(page.locator('#proxy')).toHaveAttribute('aria-invalid', 'true')
    await page.locator('#proxy').fill('http://127.0.0.1:1')
    await page.locator('#overwriteInstall').check()

    await page.getByRole('button', { name: '继续' }).click()
    const provider = page.locator('#provider').locator('..')
    await provider.locator('.select-trigger').click()
    await expect(provider.locator('.select-check:not([hidden])')).toHaveCount(1)
    await provider.getByRole('option', { name: '自定义提供方', exact: true }).click()
    await expect(page.locator('#customProvider')).toBeVisible()

    await page.locator('#apiKey').fill('sk-test-key')
    await page.locator('#model').fill('gpt-5.6')
    await page.locator('#customName').fill('Gateway')
    await page.getByRole('button', { name: '继续' }).click()
    await expect(page.locator('#customProviderError')).toHaveText('请填写服务地址。')
    await expect(page.locator('#baseURL')).toHaveAttribute('aria-invalid', 'true')

    await page.locator('#baseURL').fill('https://gateway.example.com/v1')
    await page.getByRole('button', { name: '继续' }).click()
    await expect(page.getByRole('heading', { name: '确认安装' })).toBeVisible()
    await expect(page.locator('#summary')).toContainText('http://127.0.0.1:1/')
    await expect(page.locator('#summary')).toContainText('3181')
    await expect(page.locator('#summary')).toContainText('3182')
    await expect(page.locator('#summary')).toContainText('3183')
    await expect(page.locator('#summary')).toContainText('覆盖安装，保留用户数据')
    await expect(page.locator('#summary')).toContainText(process.platform === 'win32' ? '安装或复用系统 Git、Node.js、npm 和 pnpm' : '使用系统 Node.js、npm 和 pnpm')
    await expect(page.locator('#summary')).toContainText('自动选择可用源（含国内镜像）')

    await page.getByRole('button', { name: '安装', exact: true }).click()
    await expect(page.locator('#progressText')).toHaveText('下载暂时失败，正在自动重试…', { timeout: 30_000 })
    await expect(page.locator('#progressDetail')).toContainText('Will retry in')
    await expect(page.locator('#retryInstall')).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('#error')).toContainText('请检查网络或下载代理后重试。')
    await page.locator('#retryInstall').click()
    await expect(page.locator('#progress')).toBeVisible()
    await expect(page.locator('#retryInstall')).toBeVisible({ timeout: 60_000 })

  } finally {
    await application.close()
  }
})

test('installer completes a native Harness installation and starts Supervisor', async ({}, testInfo) => {
  const installTimeout = (process.platform === 'win32' ? 73 : 43) * 60_000
  test.setTimeout((process.platform === 'win32' ? 75 : 45) * 60_000)
  const installPath = testInfo.outputPath('installed-harness')
  const userData = testInfo.outputPath('user-data')
  const port = 47_000 + (process.pid % 1_000) * 4
  const supervisorPort = port + 2
  const runtimeURL = 'http://127.0.0.1:' + String(port) + '/'
  const manifestPath = join(userData, 'runtime-supervisor.json')
  let manifest
  const application = await electron.launch({
    args: ['src/main.mjs', '--user-data-dir=' + userData],
    cwd: desktopDirectory,
    env: {
      ...process.env,
      DSH_PLUS_INSTALL_PRIMARY_REGISTRY: 'http://127.0.0.1:1',
    },
  })
  try {
    const page = await application.firstWindow()
    await page.getByRole('button', { name: '继续' }).click()
    await page.locator('#installPath').fill(installPath)
    await page.getByText('高级选项', { exact: true }).click()
    await page.locator('#port').fill(String(port))
    await page.locator('#candidatePort').fill(String(port + 1))
    await page.locator('#supervisorPort').fill(String(supervisorPort))
    await page.locator('#candidateSupervisorPort').fill(String(port + 3))
    await page.getByRole('button', { name: '继续' }).click()

    await page.locator('#apiKey').fill('sk-electron-install-test')
    await page.getByRole('button', { name: '继续' }).click()
    await expect(page.getByRole('heading', { name: '确认安装' })).toBeVisible()
    await expect(page.locator('#summary')).toContainText(String(supervisorPort))
    await expect(page.locator('#summary')).toContainText(process.platform === 'win32' ? '安装或复用系统 Git、Node.js、npm 和 pnpm' : '使用系统 Node.js、npm 和 pnpm')
    await expect(page.locator('#summary')).toContainText('自动选择可用源（含国内镜像）')

    const installerFinished = Promise.race([
      page.waitForEvent('close', { timeout: installTimeout }).then(() => ({ closed: true })).catch(() => undefined),
      page.locator('#error').waitFor({ state: 'visible', timeout: installTimeout }).then(async () => ({ closed: false, error: await page.locator('#error').textContent() })).catch(() => undefined),
    ])
    await page.getByRole('button', { name: '安装', exact: true }).click()
    await expect(page.locator('#progressDetail')).toHaveText('https://registry.npmmirror.com', { timeout: 120_000 })
    const result = await installerFinished
    if (result?.closed !== true) {
      const progress = await page.locator('#progressText').textContent().catch(() => '')
      const detail = await page.locator('#progressDetail').textContent().catch(() => '')
      throw new Error('Native installation failed: ' + String(result?.error ?? 'installer did not complete') + '; progress=' + progress + '; detail=' + detail)
    }
    expect(application.process().exitCode).toBeNull()
    expect(existsSync(join(installPath, 'apps', 'cli', 'lib', 'bin.js'))).toBe(true)
    const profile = JSON.parse(readFileSync(join(installPath, '.dsh-plus', 'home', 'profiles', 'plus', 'package.json'), 'utf8'))
    expect(profile.dependencies['@sparkelf/dsh-plus']).toContain('0.1.0-rc.24')
    await expect.poll(async () => {
      try { return (await fetch(runtimeURL)).ok } catch { return false }
    }, { timeout: 30_000 }).toBe(true)
    const response = await fetch(runtimeURL)
    const pageText = await response.text()
    expect(pageText).not.toContain('dirty')
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } finally {
    if (manifest === undefined && existsSync(manifestPath)) manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (manifest !== undefined) {
      try { await sendSupervisorCommand(manifest.socketPath, 'stop') } catch {}
      try { await sendSupervisorCommand(manifest.socketPath, 'shutdown') } catch {}
    }
    await application.close()
  }
})

