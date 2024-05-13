import { getHeartbeatResponse, isHeartbeatRequestParsed, jsonStringify, withSign } from 'wshe/server'

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
    // heartbeat...
    isHeartbeatRequestParsed,
    getHeartbeatResponse,
    // register....
    isMetaRegisterEvent(event: any) {
      return event.event === MetaEventType.Register
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
