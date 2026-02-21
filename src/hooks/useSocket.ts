import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'https://zta-backend-y10h.onrender.com'

let socketInstance: Socket | null = null

function getSocket(): Socket {
  if (!socketInstance) {
    const user = localStorage.getItem('user')
    let token: string | undefined
    if (user) {
      try {
        const userData = JSON.parse(user)
        token = userData.token
      } catch {}
    }

    socketInstance = io(API_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    })
  }

  return socketInstance
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    const socket = socketRef.current
    if (!socket.connected) {
      socket.connect()
    }

    return () => {
      // Don't disconnect - singleton shared across components
    }
  }, [])

  return socketRef.current
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
