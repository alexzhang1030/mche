import type { PayloadBase, RoomId } from '@/types'

export interface PayloadWebSocket extends PayloadBase {
  register_accept: RoomId & {
    id: string
  }
}
