import { log } from './utils'
import { WebRtcContainer } from './webrtc'
import { WebSocketContainer } from './websocket'
import type { AbstractContainer } from './base'
import type { DataTypes, MCHelperOptions, OnJoinCallback, OnLeaveCallback } from './types'

export type * from './types'

export class MCHelper<B> implements AbstractContainer {
  #options
  #id

  #container: AbstractContainer

  constructor(options: MCHelperOptions) {
    this.#options = options
    this.#id = options.id

    if (options.mode === 'webrtc')
      this.#container = new WebRtcContainer(options)
    else
      this.#container = new WebSocketContainer(options)

    this.#container.ws.registerCallbacks({
      onDisconnected: () => {
        this.#container.close()
      },
    })
  }

  get id() {
    return this.#id
  }

  serializeObjectPayload(payload: B) {
    return JSON.stringify(payload)
  }

  deserializeObjectPayload(payload: DataTypes) {
    return JSON.parse(payload as string) as B
  }

  broadcast(message: DataTypes) {
    const payload = this.#container.broadcast(message)
    if (this.#options.debug === 'verbose')
      log('Broadcasting message', message, 'payload is', payload)
    return payload
  }

  send(targetIds: string[], message: DataTypes) {
    const payload = this.#container.send(targetIds, message)

    if (this.#options.debug === 'verbose')
      log('Sending message', message, 'payload is', payload)

    return payload
  }

  onMessageChannelReady(callback: () => void) {
    this.#container.onMessageChannelReady(callback)
  }

  onJoin(callback: OnJoinCallback) {
    return this.#container.onJoin(callback)
  }

  onLeave(callback: OnLeaveCallback) {
    return this.#container.onLeave(callback)
  }

  onBroadcast<D extends DataTypes>(callback: (message: D) => void) {
    return this.#container.onBroadcast(callback)
  }

  close() {
    this.#container.close()
  }

  get ws() {
    return this.#container.ws
  }
}
