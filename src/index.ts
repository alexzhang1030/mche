import { nanoid } from 'nanoid/non-secure'
import type { NonRoomId, Payload, PayloadAnswer, PayloadCandidate, PayloadOffer } from './signaling'
import { MCHEConnection } from './connection'
import { SignalingServerClient, Topic } from './signaling'
import { error, log } from './utils'
import type { RTCChannelData } from './types'

export type * from './types'

export interface MCHelperOptions {
  /**
   * The URL of the signaling server.
   * @example "wss://example.com:8080"
   */
  signalingServerUrl: string
  /**
   * The ID of the peer.
   * If not set, will be generated using `nanoid(6)`.
   * @default nanoid(6)
   */
  id?: string
  /**
   * Whether to print debug information.
   * - `'verbose'`: print all debug information
   * - `true`: print connection information
   *
   * @default false
   */
  debug?: boolean | 'verbose'

  /**
   * ICE servers.
   * @default
   * [
   *  { urls: 'stun:stun.l.google.com:19302', }
   * ]
   */
  iceServers?: RTCIceServer[]
  /**
   * Room id.
   *
   * Same room id will be able to communicate with each other.
   */
  roomId: string
}

const randomId = () => nanoid(6)

export type OnJoinCallback = (data: Payload['open']['data']) => void
export type OnLeaveCallback = (data: Payload['close']['data']) => void

export class MCHelper<B> {
  #options
  #id
  #connectionPool = new Map<
    /* sender id */
    string,
    /* rtcConnection, 1 to 1 allocate with sender id */
    MCHEConnection
  >()

  #signallingServer

  #dataBuffer: MessageEvent[] = []
  #dataBufferCallbacks: ((message: MessageEvent) => void)[] = []
  #onJoinCallbacks: OnJoinCallback[] = []
  #onLeaveCallbacks: OnLeaveCallback[] = []

  #onMessageChannelReadyCallbacks: ((channel: RTCDataChannel) => void)[] = []

  constructor(options: MCHelperOptions) {
    this.#options = options
    this.#id = options.id || randomId()
    this.#signallingServer = new SignalingServerClient(options.signalingServerUrl, options.roomId)
    this.#bindEvents().catch(error)
    this.#bindSignalingEvents()
    this.#registerOnSignalingServer()
  }

  #bindSignalingEvents() {
    this.#signallingServer.on('open', ({ data }) => {
      if (this.#options.debug)
        log('Open connection with', data)
      data.forEach(({ id }) => {
        this.#registerRemote(id)
      })
      this.#onJoinCallbacks.forEach((callback) => {
        callback(data)
      })
    })
    this.#signallingServer.on('close', ({ data }) => {
      const { id } = data
      const connection = this.#connectionPool.get(id)
      if (connection) {
        if (this.#options.debug)
          log('Close connection with', id)
        connection.close()
        this.#connectionPool.delete(id)
        this.#onLeaveCallbacks.forEach((callback) => {
          callback(data)
        })
      }
    })
  }

  #addMessageToBuffer(message: MessageEvent) {
    this.#dataBuffer.push(message)
    this.#dataBufferCallbacks.forEach((callback) => {
      callback(message)
      this.#dataBuffer.length = 0
    })
  }

  #getConnection() {
    return new MCHEConnection((message) => {
      this.#addMessageToBuffer(message)
    }, this.#options.debug!, this.#options.iceServers)
  }

  #addNewConnection(id: string, conn: MCHEConnection) {
    this.#connectionPool.set(id, conn)
    this.#onMessageChannelReadyCallbacks.forEach((callback) => {
      conn.addDataChannelReadyCallback(callback)
    })
  }

  #registerOnSignalingServer() {
    const ws = this.#signallingServer.ws
    ws.registerCallbacks({
      onConnected: () => {
        ws.ws.send('register', JSON.stringify({
          roomId: this.#options.roomId,
          userId: this.#options.id,
        }))
      },
    })
  }

  async #bindEvents() {
    // Receive offer, send answer, receive answer
    // Receive candidate
    this.#signallingServer.on(Topic.OfferSend, async ({ receiver, offer, sender }) => {
      if (receiver !== this.#id)
        return
      if (this.#options.debug)
        log('Received offer from', sender, 'payload is', offer)

      let connection = this.#connectionPool.get(sender)
      if (!connection) {
        connection = this.#getConnection()
        this.#addNewConnection(sender, connection)
      }

      await connection.receiveOffer(offer)
      const answer = await connection.createAnswer()

      const payload: NonRoomId<PayloadAnswer> = {
        answer,
        // swap sender and receiver
        receiver: sender,
        sender: receiver,
      }

      if (this.#options.debug)
        log('Sending answer to', sender, 'payload is', payload)

      this.#signallingServer.send(Topic.AnswerSend, payload)
    })

    this.#signallingServer.on(Topic.AnswerSend, async ({ receiver, answer, sender }) => {
      if (receiver !== this.#id)
        return

      if (this.#options.debug)
        log('Received answer from', sender, 'payload is', answer)

      const connection = this.#connectionPool.get(sender)
      if (!connection)
        return

      await connection.receiveAnswer(answer)
    })

    this.#signallingServer.on(Topic.CandidateSend, async ({ receiver, candidate, sender }) => {
      if (receiver !== this.#id)
        return

      if (this.#options.debug)
        log('Received candidate from', sender, 'payload is', candidate)

      const connection = this.#connectionPool.get(sender)
      if (!connection)
        return

      await connection.addIceCandidate(candidate)
    })
  }

  /**
   * Call this function to connection other peers.
   * @returns The ID of the peer. You need **hold** this ID to do next operations.
   */
  async #registerRemote(remoteId?: string) {
    const nonNullRemoteId = remoteId || randomId()

    // init peer connection
    const connection = this.#getConnection()
    connection.onCandidate((candidate) => {
      // send candidate
      const payload: NonRoomId<PayloadCandidate> = {
        receiver: nonNullRemoteId,
        sender: this.#id,
        candidate,
      }
      if (this.#options.debug)
        log('Sending candidate to', nonNullRemoteId, 'payload is', payload)
      this.#signallingServer.send(Topic.CandidateSend, payload)
    })
    this.#addNewConnection(nonNullRemoteId, connection)
    await this.#connect(nonNullRemoteId)

    return nonNullRemoteId
  }

  async #connect(peerId: string) {
    const connection = this.#connectionPool.get(peerId)
    if (!connection) {
      error(new Error(`Peer ${peerId} not found.`))
      return
    }
    const offer = await connection.createOffer()

    const payload: NonRoomId<PayloadOffer> = {
      offer,
      sender: this.#id,
      receiver: peerId,
    }
    if (this.#options.debug)
      log('Sending offer to', peerId, 'payload is', payload)

    this.#signallingServer.send(Topic.OfferSend, payload)
  }

  // ----------------- Public API -----------------
  get id() {
    return this.#id
  }

  serializeObjectPayload(payload: B) {
    return JSON.stringify(payload)
  }

  deserializeObjectPayload(payload: RTCChannelData) {
    return JSON.parse(payload as string) as B
  }

  /**
   *
   * @param message RTCChannelData, you can use `serializeObjectPayload` to serialize object to string.
   * https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/send#data
   */
  broadcast(message: RTCChannelData) {
    const payload = {
      sender: this.#id,
      receiver: 'broadcast',
      message,
    }

    if (this.#options.debug === 'verbose')
      log('Broadcasting message', message, 'payload is', payload)

    this.#connectionPool.forEach((connection) => {
      connection.addDataChannelReadyCallback((channel) => {
        channel.send(payload.message as /* dts 中类型错误 */any)
      })
    })
  }

  onMessageChannelReady(callback: (channel: RTCDataChannel) => void) {
    this.#onMessageChannelReadyCallbacks.push(callback)
  }

  onJoin(callback: OnJoinCallback) {
    this.#onJoinCallbacks.push(callback)
  }

  onLeave(callback: OnLeaveCallback) {
    this.#onLeaveCallbacks.push(callback)
  }

  /**
   * @returns cleanup fn
   */
  onBroadcast<D extends RTCChannelData>(callback: (message: MessageEvent<D>) => void) {
    const fn = (message: MessageEvent) => {
      if (this.#options.debug === 'verbose')
        log('Get broadcasted message', message)
      callback(message)
    }
    this.#dataBufferCallbacks.push(fn)
    return () => {
      const index = this.#dataBufferCallbacks.indexOf(fn)
      if (index !== -1)
        this.#dataBufferCallbacks.splice(index, 1)
    }
  }

  close() {
    this.#connectionPool.forEach((connection) => {
      connection.close()
    })
    this.#signallingServer.close()
    this.#onJoinCallbacks.length = 0
    this.#onLeaveCallbacks.length = 0
  }

  get signallingServerWS() {
    return this.#signallingServer.ws
  }
}
