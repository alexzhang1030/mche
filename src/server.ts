import { jsonStringify, withSign } from 'wshe/server'

export function buildMetaPayload<T extends Record<string, any>>(event: keyof T, data: T[keyof T]) {
  return withSign(jsonStringify({
    event,
    data,
  }))
}

export * from 'wshe/server'
