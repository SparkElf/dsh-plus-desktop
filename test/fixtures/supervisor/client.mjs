import { state } from './state.mjs'

export async function supervisorAvailable() {
  return state.available
}

export async function sendSupervisorCommand(_socketPath, command) {
  state.commands.push(command)
  return state.status
}

export async function waitForSupervisor() {
  return state.status
}
