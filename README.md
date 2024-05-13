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
  signalingServer: 'ws://localhost:8080',
  id: '<uniqueSelfId>',
  roomId: '<uniqueRoomId>',
})

mch.broadcast('hello')

mch.onBroadcast((data) => {
  console.log(data)
})

// Call close if someone is leaving the room
mch.close()
```

### Signaling Server

You can use this [signaling server example](https://github.com/alexzhang1030/mche-signaler). Or write your own signaling server.

#### Receive Register

Once a new user joins the room, the signaling server will receive a message like this:

```jsonc
{
  "event": "register",
  "data": {
    "roomId": "<roomId>",
    "id": "<id>"
  }
}
```

You need to `broadcast join` to all users in the same room.

#### Broadcast Join

You need broadcast the room users to new user when they join the room. The data structure should be like this:

```jsonc
{
  "event": "open",
  // The peer users ids
  "data": {
    "roomId": "<roomId>",
    "data": [
      { "id": "<id1>", "userData": { } },
      { "id": "<id2>", "userData": { } }
    ]
  }
}
```

We actually connect other peers by using `WebRTC` after we get the `open` event. So `ids` should be required for connecting.

#### Broadcast Leave

You need broadcast the room users when someone leave the room. The data structure should be like this:

```jsonc
{
  "event": "close",
  // The leaved user id
  "data": {
    "roomId": "<roomId>",
    "data": { "id": "<id>" }
  }
}
```

## License

MIT
