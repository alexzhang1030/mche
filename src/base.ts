import type { DataTypes, OnJoinCallback, OnLeaveCallback } from './types'
import type { WsClient } from './ws'

export abstract class AbstractContainer {
  abstract ws: InstanceType<typeof WsClient>['ws']

  /**
   * If you want to broadcast messages to some peers, you can use `send` function
   * @param message DataTypes, include binary | string, you can use `serializeObjectPayload` to serialize object to string.
   */
  abstract broadcast(message: DataTypes): {
    sender: string
    receiver: string
    message: DataTypes
  }

  /**
   * If you want to broadcast messages to all peers, you can use `broadcast` function
   * @param targetIds The ID of the peers.
   * @param message DataTypes, include binary | string, you can use `serializeObjectPayload` to serialize object to string.
   */
  abstract send(targetIds: string[], message: DataTypes): {
    sender: string
    receiver: string
    message: DataTypes
  }

  /**
   * If you want to listen to the broadcast message, you can use `onBroadcast` function
   * @returns subscribe function
   */
  abstract onBroadcast<D extends DataTypes>(callback: (message: D) => void): () => void

  abstract onMessageChannelReady(callback: () => void): void

  /**
   * Trigger when some peer is connected to the room.
   * @returns unsubscribe function
   */
  abstract onJoin(callback: OnJoinCallback): () => void
  /**
   * Trigger when some peer is disconnected to the room.
   * @returns unsubscribe function
   */
  abstract onLeave(callback: OnLeaveCallback): () => void

  /**
   * You can use this function to remove all the effects when you don't need it.
   */
  abstract close(): void
}
