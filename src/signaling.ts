import { createWSHE } from 'wshe'

export interface RoomId {
  roomId: string
}

export interface PayloadCommon extends RoomId {
  sender: string
  receiver: string
}

export interface PayloadOffer extends PayloadCommon {
  offer: RTCSessionDescriptionInit
}

export interface PayloadAnswer extends PayloadCommon {
  answer: RTCSessionDescriptionInit
}

export interface PayloadCandidate extends PayloadCommon {
  candidate: RTCIceCandidate
}

export enum Topic {
  OfferSend = 'mche:offer:send',
  AnswerSend = 'mche:answer:send',
  CandidateSend = 'mche:candidate:send',
}

export interface Payload {
  [Topic.OfferSend]: PayloadOffer
  [Topic.AnswerSend]: PayloadAnswer
  [Topic.CandidateSend]: PayloadCandidate
  open: {
    data: { id: string, userData?: Record<string, unknown> }[]
  } & RoomId
  close: {
    data: { id: string }
  } & RoomId
}

export type NonRoomId<T> = Omit<T, 'roomId'>

export class SignalingServerClient {
  #ws
  #roomId

  #onConnectedCallbacks: ((ws: WebSocket, event: Event) => void)[] = []
  #onDisconnectedCallbacks: ((ws: WebSocket, event: Event) => void)[] = []
  #onErrorCallbacks: ((ws: WebSocket, event: Event) => void)[] = []

  constructor(url: string, roomId: string) {
    this.#ws = createWSHE(url, {
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

  send<K extends keyof Payload = keyof Payload>(topic: K, data: NonRoomId<Payload[K]>) {
    this.#ws.send(topic, {
      ...data,
      roomId: this.#roomId,
    })
  }

  on<K extends keyof Payload = keyof Payload>(topic: K, callback: (data: Payload[K]) => void) {
    this.#ws.subscribe(topic, (data: Payload[K]) => {
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
      registerCallbacks: (callbacks: {
        onConnected: (ws: WebSocket, event: Event) => void
        onDisconnected: (ws: WebSocket, event: Event) => void
        onError: (ws: WebSocket, event: Event) => void
      }) => {
        this.#onConnectedCallbacks.push(callbacks.onConnected)
        this.#onDisconnectedCallbacks.push(callbacks.onDisconnected)
        this.#onErrorCallbacks.push(callbacks.onError)
      },
    }
  }
}
