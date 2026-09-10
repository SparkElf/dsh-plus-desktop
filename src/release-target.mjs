/** Immutable Plus profile release installed by this Desktop build. */
export const OFFICIAL_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'
export const OFFICIAL_SOURCE_REVISION = 'fb2c4b9e698e30edb738bca4cf0618587db7d203'
export const PLUS_DISTRIBUTION = '@sparkelf/dsh-plus@0.1.0-rc.26'

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
