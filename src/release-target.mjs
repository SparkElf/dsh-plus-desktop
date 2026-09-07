/** Immutable Plus profile release installed by this Desktop build. */
export const OFFICIAL_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'
export const OFFICIAL_SOURCE_REVISION = 'd347e703908d0406b7a7ef80e3a0e594d86b2215'
export const PLUS_DISTRIBUTION = '@sparkelf/dsh-plus@0.1.0-rc.22'

/**
 * Build the profile-local commands that apply one prepared Plus closure.
 * @param {{ profilePath: string, installPath: string }} configured - profile and official source roots.
 * @returns {readonly { cwd: string, args: string[] }[]} ordered pnpm commands.
 */
export function materializationCommands(configured) {
  return [
    { cwd: configured.profilePath, args: ['install'] },
    { cwd: configured.profilePath, args: ['exec', 'dsh-plus', 'apply', '--dsh-root', configured.installPath] },
  ]
}
