import { createWSHE } from 'wshe'
import type { DataTypes } from './types'

export type NonRoomId<T> = Omit<T, 'roomId'>

export class WsClient<P extends Record<string, any> = Record<string, never>> {
  #ws
  #roomId

  #onConnectedCallbacks: ((ws: WebSocket, event: Event) => void)[] = []
  #onDisconnectedCallbacks: ((ws: WebSocket, event: Event) => void)[] = []
  #onErrorCallbacks: ((ws: WebSocket, event: Event) => void)[] = []

  constructor(urlOrWsInstance: string | WebSocket, roomId: string) {
    this.#ws = createWSHE(urlOrWsInstance, {
      immediate: true,
      onConnected: (ws, event) => {
        this.#onConnectedCallbacks.forEach(callback => callback(ws, event))
      },
      onDisconnected: (ws, event) => {
        this.#onDisconnectedCallbacks.forEach(callback => callback(ws, event))
      },
      onError: (ws, event) => {
        this.#onErrorCallbacks.forEach(callback => callback(ws, event))
      },
    })
    this.#roomId = roomId
  }

  send<K extends keyof P = keyof P>(topic: K, data: NonRoomId<P[K]>) {
    this.#ws.send(topic as string, {
      ...data,
      roomId: this.#roomId,
    })
  }

  sendRaw(data: DataTypes) {
    this.#ws.sendRaw(data)
  }

  onRaw<D extends DataTypes>(callback: (data: D) => void) {
    return this.#ws.subscribeRaw<D>(callback)
  }

  on<K extends keyof P = keyof P>(topic: K, callback: (data: P[K]) => void) {
    this.#ws.subscribe(topic as string, (data: P[K]) => {
      if (data.roomId !== this.#roomId)
        return
      callback(data)
    })
  }

  close() {
    this.#onConnectedCallbacks.length = 0
    this.#onDisconnectedCallbacks.length = 0
    this.#onErrorCallbacks.length = 0
    this.#ws.close()
  }

  get ws() {
    return {
      ws: this.#ws,
      registerCallbacks: (callbacks: Partial<{
        onConnected: (ws: WebSocket, event: Event) => void
        onDisconnected: (ws: WebSocket, event: Event) => void
        onError: (ws: WebSocket, event: Event) => void
      }>) => {
        if (callbacks.onConnected)
          this.#onConnectedCallbacks.push(callbacks.onConnected)
        if (callbacks.onDisconnected)
          this.#onDisconnectedCallbacks.push(callbacks.onDisconnected)
        if (callbacks.onError)
          this.#onErrorCallbacks.push(callbacks.onError)
      },
    }
  }
}
