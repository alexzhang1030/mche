import { nanoid } from 'nanoid/non-secure'
import type { NonRoomId, PayloadAnswer, PayloadCandidate, PayloadOffer } from './signaling'
import { MCHEConnection } from './connection'
import { SignalingServerClient, Topic } from './signaling'
import { error, log } from './utils'

export interface MCHelperOptions {
  /**
   * The URL of the signalling server.
   * @example "wss://example.com:8080"
   */
  signallingServerUrl: string
  /**
   * The ID of the peer.
   * If not set, will be generated using `nanoid(6)`.
   * @default nanoid(6)
   */
  id?: string
  /**
   * Whether to print debug information.
   * @default false
   */
  debug?: boolean

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

// TODO: fix broadcast issue

export class MCHelper {
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

  constructor(options: MCHelperOptions) {
    this.#options = options
    this.#id = options.id || randomId()
    this.#signallingServer = new SignalingServerClient(options.signallingServerUrl, options.roomId)
    this.#bindEvents().catch(error)
    this.#signallingServer.on('open', ({ ids }) => {
      ids.forEach((id) => {
        this.registerRemote(id)
      })
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
    }, this.#options.debug!)
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
        this.#connectionPool.set(sender, connection)
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
   * You should call this function to connection other peers.
   * @returns The ID of the peer. You need **hold** this ID to do next operations.
   */
  async registerRemote(remoteId?: string) {
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
    this.#connectionPool.set(nonNullRemoteId, connection)
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

  broadcast<T>(message: T) {
    const payload = {
      sender: this.#id,
      receiver: 'broadcast',
      message,
    }

    if (this.#options.debug)
      log('Broadcasting message', message, 'payload is', payload)

    this.#connectionPool.forEach((connection) => {
      connection.addDataChannelCallback((channel) => {
        channel.send(JSON.stringify(payload.message))
      })
    })
  }

  /**
   * @returns cleanup fn
   */
  onBroadcast<T>(callback: (message: MessageEvent<T>) => void) {
    const fn = (message: MessageEvent) => {
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
  }
}
