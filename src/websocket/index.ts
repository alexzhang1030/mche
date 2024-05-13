import type { DataTypes, MCHelperOptionsWebSocket, OnJoinCallback, OnLeaveCallback, PayloadBase } from '@/types'
import { AbstractContainer } from '@/base'
import { WsClient } from '@/ws'
import { registerOnWsConnected } from '@/utils'

export class WebSocketContainer extends AbstractContainer {
  #ws: WsClient<PayloadBase>

  #onDataChannelReadyCallbacks: (() => void)[] = []
  #onJoinCallbacks: OnJoinCallback[] = []
  #onLeaveCallbacks: OnLeaveCallback[] = []

  #id

  constructor(options: MCHelperOptionsWebSocket) {
    super()

    this.#id = options.id
    this.#ws = new WsClient(options.urlOrWsInstance, options.roomId)

    const { registerCallbacks } = this.#ws.ws
    registerCallbacks({
      onConnected: () => {
        this.#onDataChannelReadyCallbacks.forEach(callback => callback())
        this.#onDataChannelReadyCallbacks.length = 0
      },
    })

    registerOnWsConnected(this.#ws.ws, options.id, options.roomId)

    this.#ws.on('open', ({ data, roomId }) => {
      if (roomId !== options.roomId)
        return
      this.#onJoinCallbacks.forEach(callback => callback(data))
    })

    this.#ws.on('close', ({ data, roomId }) => {
      if (roomId !== options.roomId)
        return
      this.#onLeaveCallbacks.forEach(callback => callback(data))
    })
  }

  onMessageChannelReady(callback: () => void): void {
    if (this.#ws.ws.ws.ws?.readyState === WebSocket.OPEN)
      callback()
    else
      this.#onDataChannelReadyCallbacks.push(callback)
  }

  broadcast(message: DataTypes) {
    const payload = {
      sender: this.#id,
      receiver: 'broadcast',
      message,
    }

    if (this.#ws.ws.ws.ws?.readyState === WebSocket.OPEN) {
      this.#ws.sendRaw(message)
    }
    else {
      this.onMessageChannelReady(() => {
        this.#ws.sendRaw(message)
      })
    }

    return payload
  }

  onBroadcast<D extends DataTypes>(callback: (message: D) => void) {
    return this.#ws.onRaw<D>(callback)
  }

  send(targetIds: string[], message: DataTypes) {
    const payload = {
      sender: this.#id,
      receiver: targetIds.toString(),
      message,
    }

    // NOT_IMPLEMENTED
    this.broadcast(message)

    return payload
  }

  onJoin(callback: OnJoinCallback): () => void {
    this.#onJoinCallbacks.push(callback)
    return () => {
      const index = this.#onJoinCallbacks.indexOf(callback)
      if (index !== -1)
        this.#onJoinCallbacks.splice(index, 1)
    }
  }

  onLeave(callback: OnLeaveCallback): () => void {
    this.#onLeaveCallbacks.push(callback)
    return () => {
      const index = this.#onLeaveCallbacks.indexOf(callback)
      if (index !== -1)
        this.#onLeaveCallbacks.splice(index, 1)
    }
  }

  close() {
    this.#ws.close()
  }
}
