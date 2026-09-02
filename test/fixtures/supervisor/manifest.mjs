import { state } from './state.mjs'

export async function readSupervisorManifest() {
  return state.manifest
}
