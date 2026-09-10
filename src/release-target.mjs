/** Immutable Plus profile release installed by this Desktop build. */
export const OFFICIAL_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'
export const OFFICIAL_SOURCE_REVISION = '183f08e9c6dde7e36cd2318eaee70b0da08fb35e'
export const PLUS_DISTRIBUTION = '@sparkelf/dsh-plus@0.1.0-rc.25'

/**
 * Build the profile-local commands that install and apply the Plus distribution from the registry.
 * @param {{ profilePath: string, installPath: string }} configured - profile and official source roots.
 * @returns {readonly { cwd: string, args: string[] }[]} ordered pnpm commands.
 */
export function materializationCommands(configured) {
  return [
    { cwd: configured.profilePath, args: ['install'] },
    { cwd: configured.profilePath, args: ['exec', 'dsh-plus', 'apply', '--dsh-root', configured.installPath] },
  ]
}
