import { useState } from 'react'
import { Radio } from 'lucide-react'
import { LiveScoreCard } from '@/components/live/LiveScoreCard'
import { useLiveScoreboard } from '@/hooks/useLiveScoreboard'

export function Scoreboard() {
  const [tournamentFilter, setTournamentFilter] = useState<string>('')
  const { matches, loading, error } = useLiveScoreboard(tournamentFilter || undefined)

  // Get unique tournaments from matches for filtering
  const tournaments = Array.from(
    new Map(matches.map(m => [m.tournamentId, m.tournamentName])).entries()
  )

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Radio className="h-6 w-6 text-red-500 animate-pulse" />
        <h1 className="text-2xl font-bold">Live Scores</h1>
      </div>

      {/* Tournament Filter */}
      {tournaments.length > 1 && (
        <div className="mb-6">
          <select
            className="border rounded-md p-2 bg-background text-sm"
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
          >
            <option value="">All Tournaments</option>
            {tournaments.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12 text-destructive">
          <p>Failed to load live scores. Please try again.</p>
        </div>
      )}

      {/* Matches Grid */}
      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map(match => (
            <LiveScoreCard key={match._id} match={match} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && matches.length === 0 && (
        <div className="text-center py-16">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Live Matches</h2>
          <p className="text-muted-foreground">
            There are no matches being scored live right now. Check back during tournament play.
          </p>
        </div>
      )}
    </div>
  )
}
