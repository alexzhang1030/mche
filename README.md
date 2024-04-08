# mche

**M**essage **C**hannel **He**lpers

<a href="https://www.npmjs.com/package/mche" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/mche" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/mche" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/dt/mche" alt="NPM Downloads" /></a>
<a href="https://github.com/alexzhang1030/mche/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/alexzhang1030/mche" alt="License" /></a>

This is a library that provides some utilities that helps you to communicate data between different devices(in browser).

It's simple if you want to build a collaboration application by using `mche`.

We provide first-class support to `WebRTC`.

## Installation

```bash
pnpm i mche
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

Note: You need to implement a signaling server by yourself.

#### Broadcast Join

You need broadcast the room users to new user when they join the room. The data structure should be like this:

```jsonc
{
  "event": "open",
  // The peer users ids
  "data": {
    "roomId": "<roomId>",
    "ids": ["<id1>", "<id2>"]
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
    "id": "<id>"
  }
}
```

## License

MIT
