import { createWSHE } from 'wshe'

export interface PayloadCommon {
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
  join: string
  open: string[]
}

export class SignallingServerClient {
  #ws: ReturnType<typeof createWSHE>

  constructor(url: string) {
    this.#ws = createWSHE(url, {
      immediate: true,
    })
  }

  send<K extends keyof Payload = keyof Payload>(topic: K, data: Payload[K]) {
    this.#ws.send(topic, data)
  }

  on<K extends keyof Payload = keyof Payload>(topic: K, callback: (data: Payload[K]) => void) {
    this.#ws.subscribe(topic, callback)
  }

  close() {
    this.#ws.close()
  }
}
