import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/hooks/useSocket'
import { liveMatchService } from '@/services/liveMatchService'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogOut, RefreshCw, Radio } from 'lucide-react'
import type { LiveMatch } from '@/types/liveMatch'

export function UmpireDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const socket = useSocket()
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = async () => {
    try {
      setLoading(true)
      const data = await liveMatchService.getMyMatches()
      setMatches(data.data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  // Listen for match events to auto-refresh
  useEffect(() => {
    if (!socket) return

    socket.emit('join:room', 'scoreboard')

    const handleMatchStarted = () => fetchMatches()
    const handleMatchCompleted = () => fetchMatches()

    socket.on('match:started', handleMatchStarted)
    socket.on('match:completed', handleMatchCompleted)

    return () => {
      socket.off('match:started', handleMatchStarted)
      socket.off('match:completed', handleMatchCompleted)
    }
  }, [socket])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge variant="destructive">LIVE</Badge>
      case 'warmup':
        return <Badge variant="secondary">WARMUP</Badge>
      case 'suspended':
        return <Badge variant="outline">SUSPENDED</Badge>
      default:
        return <Badge>{status.toUpperCase()}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Umpire Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Your Matches
          </h2>
          <Button variant="ghost" size="sm" onClick={fetchMatches} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading && matches.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {!loading && matches.length === 0 && !error && (
          <div className="text-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground">No matches assigned</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              When an admin assigns you to a match, it will appear here.
            </p>
          </div>
        )}

        {matches.map((match) => (
          <Card
            key={match._id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/umpire/score/${match._id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm text-muted-foreground">
                  {match.tournamentName}
                </div>
                {getStatusBadge(match.status)}
              </div>
              <div className="font-semibold">
                {match.player1.name} vs {match.player2.name}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{match.categoryName}</span>
                <span>{match.roundName}</span>
                {match.court && <span>Court {match.court}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
