import { useState, useRef, useCallback } from 'react'
import type { Channel } from '@/types/chat'
import { getSocket } from '@/lib/socket'

type PeerConnection = {
  socketId: string
  pc: RTCPeerConnection
  audioEl?: HTMLAudioElement
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function useVoiceChannel() {
  const [isConnectedToVC, setIsConnectedToVC] = useState(false)
  const [connectedVCChannel, setConnectedVCChannel] = useState<Channel | null>(null)
  const [showVCModal, setShowVCModal] = useState(false)
  const [pendingVCChannel, setPendingVCChannel] = useState<Channel | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)

  const localStreamRef = useRef<MediaStream | null>(null)
  const localScreenStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<PeerConnection[]>([])
  const listenersAttachedRef = useRef(false)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})

  const createPeerConnection = useCallback((remoteSocketId: string, initiator: boolean) => {
    const socket = getSocket()
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Add local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc_ice_candidate', { targetSocketId: remoteSocketId, candidate: e.candidate })
      }
    }

    // Handle remote tracks (audio and video)
    pc.ontrack = (e) => {
      const stream = e.streams[0]
      if (!stream) return

      // Create audio element for playing audio automatically
      const audio = new Audio()
      audio.srcObject = stream
      audio.autoplay = true
      
      const peer = peersRef.current.find(p => p.socketId === remoteSocketId)
      if (peer) {
        peer.audioEl = audio
      }

      // Update state for UI to render video
      setRemoteStreams(prev => ({ ...prev, [remoteSocketId]: stream }))
    }

    const peerEntry: PeerConnection = { socketId: remoteSocketId, pc }
    peersRef.current.push(peerEntry)

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer)
        socket.emit('webrtc_offer', { targetSocketId: remoteSocketId, offer })
      })
    }

    return pc
  }, [])

  const setupSignalingListeners = useCallback(() => {
    if (listenersAttachedRef.current) return
    listenersAttachedRef.current = true
    const socket = getSocket()

    socket.on('user_joined_voice', (data: { socketId: string }) => {
      // New user joined, create a connection as initiator
      createPeerConnection(data.socketId, true)
    })

    socket.on('webrtc_offer', async (data: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(data.fromSocketId, false)
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('webrtc_answer', { targetSocketId: data.fromSocketId, answer })
    })

    socket.on('webrtc_answer', async (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current.find(p => p.socketId === data.fromSocketId)
      if (peer) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      }
    })

    socket.on('webrtc_ice_candidate', async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.find(p => p.socketId === data.fromSocketId)
      if (peer) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    })

    socket.on('user_left_voice', (data: { socketId: string }) => {
      const idx = peersRef.current.findIndex(p => p.socketId === data.socketId)
      if (idx !== -1) {
        const peer = peersRef.current[idx]
        peer.pc.close()
        if (peer.audioEl) {
          peer.audioEl.pause()
          peer.audioEl.srcObject = null
        }
        peersRef.current.splice(idx, 1)
      }
    })

    socket.on('voice_room_members', (members: { socketId: string }[]) => {
      // Connect to each existing member
      for (const m of members) {
        createPeerConnection(m.socketId, true)
      }
    })
  }, [createPeerConnection])

  const cleanupPeers = useCallback(() => {
    for (const peer of peersRef.current) {
      peer.pc.close()
      if (peer.audioEl) {
        peer.audioEl.pause()
        peer.audioEl.srcObject = null
      }
    }
    peersRef.current = []
  }, [])

  const cleanupSignalingListeners = useCallback(() => {
    const socket = getSocket()
    socket.off('user_joined_voice')
    socket.off('webrtc_offer')
    socket.off('webrtc_answer')
    socket.off('webrtc_ice_candidate')
    socket.off('user_left_voice')
    socket.off('voice_room_members')
    listenersAttachedRef.current = false
  }, [])

  // VC参加のリクエスト（モーダルを表示）
  const requestJoinVC = (channel: Channel) => {
    setPendingVCChannel(channel)
    setShowVCModal(true)
  }

  // VC参加を確定
  const joinVC = async () => {
    if (!pendingVCChannel) return

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      // Mute track if mic is off
      stream.getAudioTracks().forEach(t => { t.enabled = isMicOn })

      setupSignalingListeners()

      const socket = getSocket()
      socket.emit('join_voice', { roomId: pendingVCChannel.internalId })

      setIsConnectedToVC(true)
      setConnectedVCChannel(pendingVCChannel)
      setShowVCModal(false)
      setPendingVCChannel(null)
    } catch (err) {
      console.error('Failed to get microphone:', err)
      // Join without mic
      setupSignalingListeners()
      const socket = getSocket()
      socket.emit('join_voice', { roomId: pendingVCChannel.internalId })
      setIsConnectedToVC(true)
      setConnectedVCChannel(pendingVCChannel)
      setShowVCModal(false)
      setPendingVCChannel(null)
    }
  }

  // VCチャンネルを切り替え（接続は継続）
  const switchVCChannel = async (channel: Channel) => {
    cleanupPeers()

    const socket = getSocket()
    socket.emit('join_voice', { roomId: channel.internalId })

    setConnectedVCChannel(channel)
    setShowVCModal(false)
    setPendingVCChannel(null)
  }

  // VC接続を切断
  const disconnectVC = () => {
    const socket = getSocket()
    socket.emit('leave_voice')

    // Stop local mic
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }

    cleanupPeers()
    cleanupSignalingListeners()

    setIsConnectedToVC(false)
    setConnectedVCChannel(null)
  }

  const closeVCModal = () => {
    setShowVCModal(false)
    setPendingVCChannel(null)
  }

  const toggleMic = () => {
    setIsMicOn(prev => {
      const next = !prev
      // Toggle audio track
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = next })
      }
      // Notify server
      getSocket().emit('update_voice_state', { isMuted: !next })
      return next
    })
  }

  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => {
      const next = !prev
      // Mute/unmute all remote audio
      for (const peer of peersRef.current) {
        if (peer.audioEl) {
          peer.audioEl.muted = !next
        }
      }
      return next
    })
  }

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      localScreenStreamRef.current = stream

      const videoTrack = stream.getVideoTracks()[0]

      // Add to all existing peer connections and renegotiate
      for (const peer of peersRef.current) {
        const senders = peer.pc.getSenders()
        const videoSender = senders.find(s => s.track?.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(videoTrack)
        } else {
          peer.pc.addTrack(videoTrack, stream)
          peer.pc.createOffer().then(offer => {
            peer.pc.setLocalDescription(offer)
            getSocket().emit('webrtc_offer', { targetSocketId: peer.socketId, offer })
          })
        }
      }

      videoTrack.onended = () => stopScreenShare()
      return stream
    } catch (e) {
      console.error(e)
      return null
    }
  }

  const stopScreenShare = () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach(t => t.stop())
      localScreenStreamRef.current = null
    }
    for (const peer of peersRef.current) {
      const senders = peer.pc.getSenders()
      const videoSender = senders.find(s => s.track?.kind === 'video')
      if (videoSender) {
        peer.pc.removeTrack(videoSender)
        peer.pc.createOffer().then(offer => {
            peer.pc.setLocalDescription(offer)
            getSocket().emit('webrtc_offer', { targetSocketId: peer.socketId, offer })
        }).catch(err => console.error(err))
      }
    }
  }

  return {
    isConnectedToVC,
    connectedVCChannel,
    showVCModal,
    pendingVCChannel,
    isMicOn,
    isSpeakerOn,
    remoteStreams,
    localScreenStream: localScreenStreamRef.current,
    requestJoinVC,
    joinVC,
    switchVCChannel,
    disconnectVC,
    closeVCModal,
    toggleMic,
    toggleSpeaker,
    startScreenShare,
    stopScreenShare,
  }
}
