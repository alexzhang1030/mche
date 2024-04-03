# mche

**M**essage **C**hannel **He**lpers

<a href="https://www.npmjs.com/package/mche" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/mche" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/mche" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/dt/mche" alt="NPM Downloads" /></a>
<a href="https://github.com/alexzhang1030/mche/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/alexzhang1030/mche" alt="License" /></a>

This is a library that provides some utilities helpers you to connection between different devices.

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
  id: 'alice',
})

mch.broadcast('hello')

mch.onBroadcast((data) => {
  console.log(data)
})
```

Note: You need to implement a signaling server by yourself, you need broadcast the room users to new user when they join the room. The data structure should be like this:

```jsonc
{
  "event": "open",
  // The room users ids
  "data": ["foo", "bar"]
}
```

## License

MIT
