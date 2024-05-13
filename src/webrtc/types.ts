import type { PayloadBase, RoomId } from '@/types'

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

export interface Payload extends PayloadBase {
  [Topic.OfferSend]: PayloadOffer
  [Topic.AnswerSend]: PayloadAnswer
  [Topic.CandidateSend]: PayloadCandidate
}
