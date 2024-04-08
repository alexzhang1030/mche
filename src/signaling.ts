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

interface Payload {
  [Topic.OfferSend]: PayloadOffer
  [Topic.AnswerSend]: PayloadAnswer
  [Topic.CandidateSend]: PayloadCandidate
  open: {
    ids: string[]
  } & RoomId
  close: {
    id: string
  } & RoomId
}

export type NonRoomId<T> = Omit<T, 'roomId'>

export class SignalingServerClient {
  #ws
  #roomId

  constructor(url: string, roomId: string) {
    this.#ws = createWSHE(url, {
      immediate: true,
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
    this.#ws.close()
  }
}