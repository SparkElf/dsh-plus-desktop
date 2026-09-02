export const state = {
  manifest: { port: 3080, supervisorPort: 3082, socketPath: '/tmp/dsh-plus-supervisor.sock' },
  available: true,
  status: { state: 'running' },
  commands: [],
}

export function resetSupervisorFixture() {
  state.available = true
  state.status = { state: 'running' }
  state.commands.length = 0
}
