import { getHeartbeatResponse, isHeartbeatRequestParsed, jsonStringify, tryToParseRawMessage, withSign } from 'wshe/server'

export function buildMetaPayload<T extends Record<string, any>>(event: keyof T, data: T[keyof T]) {
  return withSign(jsonStringify({
    event,
    data,
  }))
}

enum MetaEventType {
  Open = 'open',
  Close = 'close',

  Register = 'register',
  RegisterAccept = 'register-accept',
}

export type MetaEventTypePayload = {
  [K in MetaEventType]: any
}

export function withHandleMetaEvent() {
  return {
    tryParseMetaEvent(event: any) {
      return tryToParseRawMessage(event)
    },
    // heartbeat...
    isHeartbeatRequestParsed,
    getHeartbeatResponse,
    // register....
    isMetaRegisterEvent(event: any) {
      return event.event === MetaEventType.Register
    },
    getMetaRegisterEventPayload(event: any) {
      return event.data as {
        roomId: string
        userId: string
      }
    },
    getMetaRegisterResponse(roomId: string, userId: string) {
      return buildMetaPayload<MetaEventTypePayload>(MetaEventType.Open, {
        roomId,
        data: [{ id: userId }],
      })
    },
    getMetaRegisterAcceptResponse(roomId: string, userId: string) {
      return buildMetaPayload<MetaEventTypePayload>(MetaEventType.RegisterAccept, {
        roomId,
        id: userId,
      })
    },
    // close...
    getMetaCloseResponse(roomId: string, userId: string) {
      return buildMetaPayload<MetaEventTypePayload>(MetaEventType.Close, {
        roomId,
        data: {
          id: userId,
        },
      })
    },
  }
}
