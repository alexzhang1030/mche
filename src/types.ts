export type TypedArray =
  | Int8Array | Uint8Array
  | Int16Array | Uint16Array
  | Int32Array | Uint32Array | Float32Array | Float64Array
  | BigInt64Array | BigUint64Array

export type RTCChannelData = string | Blob | ArrayBuffer | DataView | TypedArray
