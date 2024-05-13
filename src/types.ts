import type { BinaryDataTypes } from 'wshe'

export type DataTypes = string | BinaryDataTypes

export interface MCHelperOptionsBase {
  /**
   * The ID of the peer.
   */
  id: string

  /**
   * Whether to print debug information.
   * - `'verbose'`: print all debug information
   * - `true`: print connection information
   *
   * @default false
   */
  debug?: boolean | 'verbose'

  /**
   * Room id.
   *
   * Same room id will be able to communicate with each other.
   */
  roomId: string
}

export interface MCHelperOptionsWebRTC extends MCHelperOptionsBase {
  mode: 'webrtc'

  /**
   * The URL of the signaling server or ws instance.
   * @example "wss://example.com:8080"
   */
  signalingServerUrlOrWsInstance: string | WebSocket

  /**
   * ICE servers.
   * @default
   * [
   *  { urls: 'stun:stun.l.google.com:19302', }
   * ]
   */
  iceServers?: RTCIceServer[]
}

export interface MCHelperOptionsWebSocket extends MCHelperOptionsBase {
  mode: 'websocket'

  /**
   * The URL or ws instance.
   * @example "wss://example.com:8080"
   */
  urlOrWsInstance: string | WebSocket
}

export type MCHelperOptions = MCHelperOptionsWebRTC | MCHelperOptionsWebSocket

export interface RoomId {
  roomId: string
}

export interface PayloadBase {
  open: {
    data: { id: string, userData?: Record<string, unknown> }[]
  } & RoomId
  close: {
    data: { id: string }
  } & RoomId
}

export type OnJoinCallback = (data: PayloadBase['open']['data']) => void
export type OnLeaveCallback = (data: PayloadBase['close']['data']) => void
