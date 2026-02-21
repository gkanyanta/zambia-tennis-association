import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreDisplay } from './ScoreDisplay'
import type { LiveMatch } from '@/types/liveMatch'

interface LiveScoreCardProps {
  match: LiveMatch
}

export function LiveScoreCard({ match }: LiveScoreCardProps) {
  const statusConfig = {
    warmup: { label: 'Warmup', variant: 'secondary' as const, pulse: false },
    live: { label: 'LIVE', variant: 'destructive' as const, pulse: true },
    suspended: { label: 'Suspended', variant: 'outline' as const, pulse: false },
    completed: { label: 'Final', variant: 'default' as const, pulse: false }
  }

  const config = statusConfig[match.status] || statusConfig.live

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
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground truncate">
              {match.tournamentName} - {match.categoryName}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
