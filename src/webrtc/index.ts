import type { Payload, PayloadAnswer, PayloadCandidate, PayloadOffer } from './types'
import { Topic } from './types'
import { WebRtcConnection } from './connection'
import type { DataTypes, MCHelperOptionsWebRTC, OnJoinCallback, OnLeaveCallback } from '@/types'
import { error, log, registerOnWsConnected } from '@/utils'
import type { NonRoomId } from '@/ws'
import { WsClient } from '@/ws'
import { AbstractContainer } from '@/base'

export class WebRtcContainer extends AbstractContainer {
  #id
  #options
  #signalingServer

  #connectionPool = new Map<
    /* sender id */
    string,
    /* rtcConnection, 1 to 1 allocate with sender id */
    WebRtcConnection
  >()

  #dataBuffer: MessageEvent[] = []
  #dataBufferCallbacks: ((message: any) => void)[] = []

  #onMessageChannelReadyCallbacks: ((channel: RTCDataChannel) => void)[] = []

  #onJoinCallbacks: OnJoinCallback[] = []
  #onLeaveCallbacks: OnLeaveCallback[] = []

  constructor(options: MCHelperOptionsWebRTC) {
    super()

    this.#id = options.id
    this.#signalingServer = new WsClient<Payload>(options.signalingServerUrlOrWsInstance, options.roomId)
    this.#options = options

    this.#bindEvents().catch(error)
    this.#bindSignalingEvents()

    registerOnWsConnected(this.#signalingServer.ws, this.#id, this.#options.roomId)
  }

  get ws() {
    return this.#signalingServer.ws
  }

  #addMessageToBuffer(message: MessageEvent) {
    this.#dataBuffer.push(message)
    this.#dataBufferCallbacks.forEach((callback) => {
      callback(message.data)
      this.#dataBuffer.length = 0
    })
  }

  #getConnection() {
    return new WebRtcConnection((message) => {
      this.#addMessageToBuffer(message)
    }, this.#options.debug!, this.#options.iceServers)
  }

  #addNewConnection(id: string, conn: WebRtcConnection) {
    this.#connectionPool.set(id, conn)
    this.#onMessageChannelReadyCallbacks.forEach((callback) => {
      conn.addDataChannelReadyCallback(callback)
    })
  }

  async #bindEvents() {
    // Receive offer, send answer, receive answer
    // Receive candidate
    this.#signalingServer.on(Topic.OfferSend, async ({ receiver, offer, sender }) => {
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

      this.#signalingServer.send(Topic.AnswerSend, payload)
    })

    this.#signalingServer.on(Topic.AnswerSend, async ({ receiver, answer, sender }) => {
      if (receiver !== this.#id)
        return

      if (this.#options.debug)
        log('Received answer from', sender, 'payload is', answer)

      const connection = this.#connectionPool.get(sender)
      if (!connection)
        return

      await connection.receiveAnswer(answer)
    })

    this.#signalingServer.on(Topic.CandidateSend, async ({ receiver, candidate, sender }) => {
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
  async #registerRemote(remoteId: string) {
    // init peer connection
    const connection = this.#getConnection()
    connection.onCandidate((candidate) => {
      // send candidate
      const payload: NonRoomId<PayloadCandidate> = {
        receiver: remoteId,
        sender: this.#id,
        candidate,
      }
      if (this.#options.debug)
        log('Sending candidate to', remoteId, 'payload is', payload)
      this.#signalingServer.send(Topic.CandidateSend, payload)
    })
    this.#addNewConnection(remoteId, connection)
    await this.#connect(remoteId)

    return remoteId
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

    this.#signalingServer.send(Topic.OfferSend, payload)
  }

  #bindSignalingEvents() {
    this.#signalingServer.on('open', ({ data }) => {
      if (this.#options.debug)
        log('Open connection with', data)
      data.forEach(({ id }) => {
        this.#registerRemote(id)
      })
      this.#onJoinCallbacks.forEach((callback) => {
        callback(data)
      })
    })
    this.#signalingServer.on('close', ({ data }) => {
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

  broadcast(message: DataTypes) {
    const payload = {
      sender: this.#id,
      receiver: 'broadcast',
      message,
    }

    this.#connectionPool.forEach((connection) => {
      connection.addDataChannelReadyCallback((channel) => {
        channel.send(payload.message as /* dts 中类型错误 */any)
      })
    })

    return payload
  }

  send(targetIds: string[], message: DataTypes) {
    const payload = {
      sender: this.#id,
      receiver: targetIds.toString(),
      message,
    }
    const targetIdsSet = new Set(targetIds)

    this.#connectionPool.forEach((connection, id) => {
      if (targetIdsSet.has(id)) {
        connection.addDataChannelReadyCallback((channel) => {
          channel.send(payload.message as /* dts 中类型错误 */any)
        })
      }
    })
    return payload
  }

  onMessageChannelReady(callback: () => void) {
    this.#onMessageChannelReadyCallbacks.push(callback)
  }

  onJoin(callback: OnJoinCallback) {
    this.#onJoinCallbacks.push(callback)
    return () => {
      const index = this.#onJoinCallbacks.indexOf(callback)
      if (index !== -1)
        this.#onJoinCallbacks.splice(index, 1)
    }
  }

  onLeave(callback: OnLeaveCallback) {
    this.#onLeaveCallbacks.push(callback)
    return () => {
      const index = this.#onLeaveCallbacks.indexOf(callback)
      if (index !== -1)
        this.#onLeaveCallbacks.splice(index, 1)
    }
  }

  onBroadcast<D extends DataTypes>(callback: (message: D) => void) {
    const fn = (message: MessageEvent) => {
      if (this.#options.debug === 'verbose')
        log('Get broadcasted message', message)
      callback(message as any)
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
    this.#signalingServer.close()
    this.#onJoinCallbacks.length = 0
    this.#onLeaveCallbacks.length = 0
  }
}
