import { useState, useEffect } from 'react'
import { useSocket } from './useSocket'
import type { LiveMatch } from '@/types/liveMatch'
import { apiFetch } from '@/services/api'

interface UseLiveScoreboardReturn {
  matches: LiveMatch[]
  loading: boolean
  error: string | null
}

export function useLiveScoreboard(tournamentId?: string): UseLiveScoreboardReturn {
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const socket = useSocket()

  // Fetch initial matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true)
        const endpoint = tournamentId
          ? `/live-matches/tournament/${tournamentId}`
          : '/live-matches'
        const data = await apiFetch(endpoint)
        setMatches(data.data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [tournamentId])

  // Subscribe to socket events
  useEffect(() => {
    if (!socket) return

    socket.emit('join:scoreboard')

    const handleStarted = (payload: any) => {
      const newMatch = payload.liveMatch as LiveMatch
      if (tournamentId && newMatch.tournamentId !== tournamentId) return
      setMatches(prev => [newMatch, ...prev])
    }

    const handleScoreUpdate = (payload: any) => {
      setMatches(prev => prev.map(m =>
        m._id === payload.liveMatchId
          ? { ...m, matchState: payload.matchState, status: payload.status }
          : m
      ))
    }

    const handleCompleted = (payload: any) => {
      // Keep completed match visible briefly then remove
      setMatches(prev => prev.map(m =>
        m._id === payload.liveMatchId
          ? { ...m, ...payload.liveMatch, status: 'completed' as const }
          : m
      ))

      // Remove after 30 seconds
      setTimeout(() => {
        setMatches(prev => prev.filter(m => m._id !== payload.liveMatchId))
      }, 30000)
    }

    socket.on('match:started', handleStarted)
    socket.on('match:scoreUpdate', handleScoreUpdate)
    socket.on('match:completed', handleCompleted)

    return () => {
      socket.off('match:started', handleStarted)
      socket.off('match:scoreUpdate', handleScoreUpdate)
      socket.off('match:completed', handleCompleted)
    }
  }, [socket, tournamentId])

  return { matches, loading, error }
}
