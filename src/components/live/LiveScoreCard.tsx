import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { ScoreDisplay } from './ScoreDisplay'
import type { LiveMatch } from '@/types/liveMatch'

interface LiveScoreCardProps {
  match: LiveMatch
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function useElapsedTime(startTime: string | undefined, isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(() => {
    if (!startTime) return 0
    return Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
  })

  useEffect(() => {
    if (!startTime || !isRunning) return
    // Sync on mount / when startTime changes
    setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)))
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime, isRunning])

  return elapsed
}

export function LiveScoreCard({ match }: LiveScoreCardProps) {
  const statusConfig = {
    warmup: { label: 'Warmup', variant: 'secondary' as const, pulse: false },
    live: { label: 'LIVE', variant: 'destructive' as const, pulse: true },
    suspended: { label: 'Suspended', variant: 'outline' as const, pulse: false },
    completed: { label: 'Final', variant: 'default' as const, pulse: false }
  }

  const config = statusConfig[match.status] || statusConfig.live
  const matchStart = match.startedAt || match.createdAt
  const isRunning = match.status === 'live' || match.status === 'warmup'
  const elapsed = useElapsedTime(matchStart, isRunning)

  // For completed matches, show final duration
  const finalDuration = match.completedAt && matchStart
    ? Math.max(0, Math.floor((new Date(match.completedAt).getTime() - new Date(matchStart).getTime()) / 1000))
    : null

  const displayTime = isRunning ? elapsed : (finalDuration ?? elapsed)

  const startTimeFormatted = matchStart
    ? new Date(matchStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Link to={`/live-scores/${match._id}`} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={config.variant} className={config.pulse ? 'animate-pulse' : ''}>
                {config.label}
              </Badge>
              {match.court && (
                <span className="text-xs text-muted-foreground">
                  Court {match.court}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {match.roundName}
            </span>
          </div>

          {/* Score */}
          <ScoreDisplay
            matchState={match.matchState}
            player1Name={match.player1.name}
            player2Name={match.player2.name}
            player1Seed={match.player1.seed}
            player2Seed={match.player2.seed}
            compact
          />

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <div className="text-xs text-muted-foreground truncate">
              {match.tournamentName} - {match.categoryName}
            </div>
            {matchStart && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-2">
                <Clock className="h-3 w-3" />
                <span>{startTimeFormatted}</span>
                <span className="text-foreground font-mono font-medium">{formatElapsed(displayTime)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
