import { useState, useEffect, useCallback } from 'react'
import { useSocket } from './useSocket'
import type { LiveMatch } from '@/types/liveMatch'
import { apiFetch } from '@/services/api'

interface UseLiveMatchReturn {
  match: LiveMatch | null
  loading: boolean
  error: string | null
  setFirstServer: (playerIndex: 0 | 1) => Promise<void>
  awardPoint: (playerIndex: 0 | 1) => Promise<void>
  undoPoint: () => Promise<void>
  suspendMatch: () => Promise<void>
  resumeMatch: () => Promise<void>
  endMatch: (winnerId: string, reason?: string) => Promise<void>
}

export function useLiveMatch(liveMatchId: string | undefined): UseLiveMatchReturn {
  const [match, setMatch] = useState<LiveMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const socket = useSocket()

  // Fetch match data
  useEffect(() => {
    if (!liveMatchId) {
      setLoading(false)
      return
    }

    const fetchMatch = async () => {
      try {
        setLoading(true)
        const data = await apiFetch(`/live-matches/${liveMatchId}`)
        setMatch(data.data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
  }, [liveMatchId])

  // Subscribe to socket events
  useEffect(() => {
    if (!liveMatchId || !socket) return

    socket.emit('join:match', liveMatchId)

    const handleScoreUpdate = (payload: any) => {
      if (payload.liveMatchId === liveMatchId) {
        setMatch(prev => prev ? {
          ...prev,
          matchState: payload.matchState,
          status: payload.status
        } : prev)
      }
    }

    const handleCompleted = (payload: any) => {
      if (payload.liveMatchId === liveMatchId) {
        setMatch(prev => prev ? {
          ...prev,
          ...payload.liveMatch,
          status: 'completed'
        } : prev)
      }
    }

    socket.on('match:scoreUpdate', handleScoreUpdate)
    socket.on('match:completed', handleCompleted)

    return () => {
      socket.emit('leave:match', liveMatchId)
      socket.off('match:scoreUpdate', handleScoreUpdate)
      socket.off('match:completed', handleCompleted)
    }
  }, [liveMatchId, socket])

  const setFirstServer = useCallback(async (playerIndex: 0 | 1) => {
    if (!liveMatchId) return
    try {
      const data = await apiFetch(`/live-matches/${liveMatchId}/first-server`, {
        method: 'PUT',
        body: JSON.stringify({ firstServer: playerIndex })
      })
      setMatch(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [liveMatchId])

  const awardPoint = useCallback(async (playerIndex: 0 | 1) => {
    if (!liveMatchId) return
    try {
      const data = await apiFetch(`/live-matches/${liveMatchId}/point`, {
        method: 'POST',
        body: JSON.stringify({ playerIndex })
      })
      setMatch(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [liveMatchId])

  const undoPoint = useCallback(async () => {
    if (!liveMatchId) return
    try {
      const data = await apiFetch(`/live-matches/${liveMatchId}/undo`, {
        method: 'POST'
      })
      setMatch(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [liveMatchId])

  const suspendMatch = useCallback(async () => {
    if (!liveMatchId) return
    try {
      const data = await apiFetch(`/live-matches/${liveMatchId}/suspend`, {
        method: 'PUT'
      })
      setMatch(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [liveMatchId])

  const resumeMatch = useCallback(async () => {
    if (!liveMatchId) return
    try {
      const data = await apiFetch(`/live-matches/${liveMatchId}/resume`, {
        method: 'PUT'
      })
      setMatch(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [liveMatchId])

  const endMatch = useCallback(async (winnerId: string, reason?: string) => {
    if (!liveMatchId) return
    try {
      const data = await apiFetch(`/live-matches/${liveMatchId}/end`, {
        method: 'PUT',
        body: JSON.stringify({ winnerId, reason })
      })
      setMatch(data.data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [liveMatchId])

  return { match, loading, error, setFirstServer, awardPoint, undoPoint, suspendMatch, resumeMatch, endMatch }
}
