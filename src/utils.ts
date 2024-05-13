import type { WsClient } from './ws'

export function error(error: Error | string, ...args: any[]) {
  if (typeof error === 'string') {
    console.error(`[MCHE Error] ${error}`, ...args)
    return
  }
  console.error(`[MCHE Error] ${error.message}`)
  console.error(error.stack)
}

export function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log('[MCHE Log]', ...args)
}

export function registerOnWsConnected(ws: InstanceType<typeof WsClient>['ws'], id: string, roomId: string) {
  ws.registerCallbacks({
    onConnected: () => {
      ws.ws.send('register', {
        roomId,
        userId: id,
      })
    },
  })
}
