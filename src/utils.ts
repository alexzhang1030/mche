export function error(error: Error) {
  console.error(`[MCHE Error] ${error.message}`)
  console.error(error.stack)
}

export function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log('[MCHE Log]', ...args)
}
