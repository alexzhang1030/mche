# mche

**M**essage **C**hannel **He**lpers

<a href="https://www.npmjs.com/package/mche" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/mche" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/mche" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/dt/mche" alt="NPM Downloads" /></a>
<a href="https://github.com/alexzhang1030/mche/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/alexzhang1030/mche" alt="License" /></a>

This is a library that provides some utilities that helps you to communicate data between different devices(in browser).

It's simple if you want to build a collaboration application by using `mche`.

We provide first-class support to `WebRTC` and `WebSocket`.

> ⚠️ WARNING: this project is not stable yet, please use it carefully. Expect breaking changes.

## Installation

```bash
pnpm i mche
```

## Options

You can choose `WebRTC` or `WebSocket` to communicate with other peers.

```ts
interface MCHelperOptionsBase {
  /**
   * The ID of the peer.
   */
  id: string

  /**
   * Whether to print debug information.
   * - `'verbose'`: print all debug information
   * - `true`: print connection information
   *
   * @default false
   */
  debug?: boolean | 'verbose'

  /**
   * Room id.
   *
   * Same room id will be able to communicate with each other.
   */
  roomId: string
}

interface MCHelperOptionsWebRTC extends MCHelperOptionsBase {
  mode: 'webrtc'

  /**
   * The URL of the signaling server or ws instance.
   * @example "wss://example.com:8080"
   */
  signalingServerUrlOrWsInstance: string | WebSocket

  /**
   * ICE servers.
   * @default
   * [
   *  { urls: 'stun:stun.l.google.com:19302', }
   * ]
   */
  iceServers?: RTCIceServer[]
}

interface MCHelperOptionsWebSocket extends MCHelperOptionsBase {
  mode: 'websocket'

  /**
   * The URL or ws instance.
   * @example "wss://example.com:8080"
   */
  urlOrWsInstance: string | WebSocket
}

type MCHelperOptions = MCHelperOptionsWebRTC | MCHelperOptionsWebSocket
```

## Usage

```ts
import { MCHelper } from 'mche'

const mch = new MCHelper({
  // ...options
})

mche.onMessageChannelReady(() => {
  // MessageChannel is ready...
})

mch.broadcast('hello')

mch.onBroadcast((data) => {
  console.log(data)
})

// Call close if you want to close the connection.
mch.close()
```

### Signaling Server

You can use this [signaling server example](https://github.com/alexzhang1030/mche-signaler). Or write your own signaling server.

#### Utilities

```ts
import { withHandleMetaEvent } from 'mche/server'

const {
  getHeartbeatResponse,
  isHeartbeatRequestParsed,
  getMetaCloseResponse,
  getMetaRegisterAcceptResponse,
  getMetaRegisterResponse,
  getMetaRegisterEventPayload,
  isMetaRegisterEvent,
  tryParseMetaEvent,
} = withHandleMetaEvent()
```

You can use these functions to implement your own signaling server.

But recommended to checkout the [signaling server example](https://github.com/alexzhang1030/mche-signaler)

## License

MIT
