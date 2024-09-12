// https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/error_event

import { error } from '@/utils'
import type { WebRtcConnection } from './connection'

const sctpCauseCodes = [
  'No SCTP error',
  'Invalid stream identifier',
  'Missing mandatory parameter',
  'Stale cookie error',
  'Sender is out of resource (i.e., memory)',
  'Unable to resolve address',
  'Unrecognized SCTP chunk type received',
  'Invalid mandatory parameter',
  'Unrecognized parameters',
  'No user data (SCTP DATA chunk has no data)',
  'Cookie received while shutting down',
  'Restart of an association with new addresses',
  'User-initiated abort',
  'Protocol violation',
]

export function handleDCError(ev: RTCErrorEvent, connection: WebRtcConnection) {
  const err = ev.error

  error('WebRTC error: ', err.message)

  // Handle specific error detail types

  switch (err.errorDetail) {
    case 'sdp-syntax-error':
      error('    SDP syntax error in line ', err.sdpLineNumber)
      break
    case 'sctp-failure': {
      if (err.sctpCauseCode && err.sctpCauseCode < sctpCauseCodes.length)
        error('    SCTP failure: ', err.sctpCauseCode)
      else
        error('    Unknown SCTP error')
      break
    }
    case 'dtls-failure':
      if (err.receivedAlert)
        error('    Received DLTS failure alert: ', err.receivedAlert)

      if (err.sentAlert)
        error('    Sent DLTS failure alert: ', err.receivedAlert)

      break
  }

  connection.close()
}
