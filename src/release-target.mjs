/** Immutable Plus profile release installed by this Desktop build. */
export const OFFICIAL_REPOSITORY = 'https://github.com/deepseek-ai/deepseek-harness.git'
export const OFFICIAL_SOURCE_REVISION = 'b2e3b2a0125854567a4a5fcba75782e42fe84901'
export const PLUS_DISTRIBUTION = '@sparkelf/dsh-plus@0.1.0-rc.24'

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
