import { log } from './utils'

const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: 'stun:stun.l.google.com:19302',
  },
]

export class MCHEConnection {
  #peerConnection = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  })

  #datachannel: RTCDataChannel | null = null
  #datachannelCallbacks: ((channel: RTCDataChannel) => void)[] = []

  #debug

  constructor(onDataChannelMessage: (message: MessageEvent) => void, debug: boolean) {
    this.#peerConnection.ondatachannel = (event) => {
      const channel = this.#datachannel = event.channel
      if (this.#debug)
        log('RemoteDataChannel created.', channel)
      this.#datachannelCallbacks.forEach((callback) => {
        callback(channel)
      })
    }
    this.#datachannelCallbacks.push((channel) => {
      channel.onmessage = (event) => {
        onDataChannelMessage(event)
      }
    })
    this.#debug = debug
  }

  async createOffer() {
    this.#datachannel = this.#peerConnection.createDataChannel('datachannel')
    if (this.#debug)
      log('LocalDataChannel created.', this.#datachannel)
    const offer = await this.#peerConnection.createOffer()
    await this.#peerConnection.setLocalDescription(offer)
    return offer
  }

  async receiveOffer(offer: RTCSessionDescriptionInit) {
    await this.#peerConnection.setRemoteDescription(offer)
  }

  async createAnswer() {
    const answer = await this.#peerConnection.createAnswer()
    await this.#peerConnection.setLocalDescription(answer)
    return answer
  }

  async receiveAnswer(answer: RTCSessionDescriptionInit) {
    await this.#peerConnection.setRemoteDescription(answer)
  }

  async addIceCandidate(candidate: RTCIceCandidate) {
    await this.#peerConnection.addIceCandidate(candidate)
  }

  async createDataChannel(label: string) {
    const channel = this.#peerConnection.createDataChannel(label)
    return channel
  }

  onCandidate(callback: (candidate: RTCIceCandidate) => void) {
    this.#peerConnection.onicecandidate = (event) => {
      if (event.candidate)
        callback(event.candidate)
    }
  }

  addDataChannelCallback(callback: (channel: RTCDataChannel) => void) {
    if (this.#datachannel) {
      callback(this.#datachannel)
      return
    }
    this.#datachannelCallbacks.push(callback)
  }

  close() {
    this.#peerConnection.close()
    this.#datachannel?.close()
    this.#datachannelCallbacks.length = 0
  }
}
