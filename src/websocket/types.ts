import type { PayloadBase, RoomId } from '@/types'

export interface PayloadWebSocket extends PayloadBase {
  'register-accept': RoomId & {
    id: string
  }
}
