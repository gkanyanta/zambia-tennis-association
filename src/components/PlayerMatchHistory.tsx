import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Trophy, Swords, Lock } from 'lucide-react'
import {
  playerStatsService,
  type PlayerMatchesResponse,
  type HeadToHeadSummary,
  type MatchHistoryItem,
} from '@/services/playerStatsService'

interface PlayerMatchHistoryProps {
  playerId: string
  playerName: string
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

const stageLabel = (stage: string) => {
  if (stage.startsWith('group:')) return `Group ${stage.slice('group:'.length) || ''}`.trim()
  if (stage === 'knockout') return 'Knockout'
  if (stage === 'main') return 'Main draw'
  return stage
}

const isDoublesFormat = (fmt?: string) => fmt === 'doubles' || fmt === 'mixed_doubles'

// For doubles matches, render "Player / Partner". Falls back to the single
// name if the partner couldn't be resolved (e.g. older matches without
// entries metadata).
const formatSide = (name: string, partnerName: string | null, fmt?: string) =>
  isDoublesFormat(fmt) && partnerName ? `${name} / ${partnerName}` : name

export function PlayerMatchHistory({ playerId, playerName }: PlayerMatchHistoryProps) {
  const [data, setData] = useState<PlayerMatchesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [focusedOpponent, setFocusedOpponent] = useState<HeadToHeadSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    playerStatsService
      .getPlayerMatches(playerId)
      .then(res => {
        if (!cancelled) setData(res)
      })
      .catch(e => {
        if (!cancelled) setError(e?.message || 'Failed to load match history')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [playerId])

  const focusedMatches = useMemo<MatchHistoryItem[]>(() => {
    if (!data || !focusedOpponent) return []
    const key = focusedOpponent.opponentId || `walkin::${focusedOpponent.opponentName}`
    return data.matches.filter(m => {
      const mKey = m.opponent.id || `walkin::${m.opponent.name}`
      return mKey === key
    })
  }, [data, focusedOpponent])

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">Loading match history…</div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (data && !data.hasActiveSubscription) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Match history is locked</p>
          <p className="text-sm text-muted-foreground">
            {playerName}'s ZPIN is not active. Pay ZPIN to unlock match history, head-to-head, and win rate.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/register-zpin">Pay ZPIN</Link>
        </Button>
      </div>
    )
  }

  if (!data || data.totalMatches === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No completed matches on record yet for {playerName}.
      </div>
    )
  }

  if (focusedOpponent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => setFocusedOpponent(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to overview
          </Button>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="h-5 w-5 text-muted-foreground" />
            <div className="font-semibold">
              {playerName} vs {focusedOpponent.isDoubles && focusedOpponent.opponentPartnerName
                ? `${focusedOpponent.opponentName} / ${focusedOpponent.opponentPartnerName}`
                : focusedOpponent.opponentName}
              {focusedOpponent.isWalkin && <Badge variant="outline" className="ml-2">Walk-in</Badge>}
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Matches: </span>
              <span className="font-semibold">{focusedOpponent.played}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Wins: </span>
              <span className="font-semibold text-green-700">{focusedOpponent.wins}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Losses: </span>
              <span className="font-semibold text-red-700">{focusedOpponent.losses}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last played: </span>
              <span className="font-semibold">{formatDate(focusedOpponent.lastPlayed)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {focusedMatches.map(m => (
            <div key={m.matchId} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.tournamentName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.categoryName} • {m.roundName || `Round ${m.round}`} • {stageLabel(m.stage)}
                  </div>
                  {isDoublesFormat(m.categoryFormat) && (m.partnerName || m.opponent.partnerName) && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {formatSide(m.playerName, m.partnerName, m.categoryFormat)}
                      {' vs '}
                      {formatSide(m.opponent.name, m.opponent.partnerName, m.categoryFormat)}
                    </div>
                  )}
                </div>
                <Badge variant={m.won ? 'default' : 'outline'} className={m.won ? 'bg-green-600 hover:bg-green-600' : ''}>
                  {m.won ? 'Won' : 'Lost'}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="font-mono text-xs">{m.score || '—'}</div>
                <div className="text-xs text-muted-foreground">{formatDate(m.completedTime || m.tournamentEnd)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const recentMatches = data.matches.slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold">{data.totalMatches}</div>
          <div className="text-xs text-muted-foreground">Matches</div>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{data.wins}</div>
          <div className="text-xs text-muted-foreground">Wins</div>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{data.losses}</div>
          <div className="text-xs text-muted-foreground">Losses</div>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold">{data.winPercentage}%</div>
          <div className="text-xs text-muted-foreground">Win rate</div>
        </div>
      </div>

      <div>
        <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Swords className="h-4 w-4" />
          Head-to-head by opponent
        </h5>
        <div className="rounded-lg border divide-y">
          {data.headToHead.slice(0, 8).map(h => {
            const key = h.opponentId || `walkin::${h.opponentName}`
            return (
              <button
                key={key}
                className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setFocusedOpponent(h)}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {h.isDoubles && h.opponentPartnerName
                      ? `${h.opponentName} / ${h.opponentPartnerName}`
                      : h.opponentName}
                    {h.isWalkin && <Badge variant="outline" className="text-[10px] py-0 h-4">Walk-in</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">Last played {formatDate(h.lastPlayed)}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-sm">
                  <span className="text-green-700 font-semibold">{h.wins}W</span>
                  <span className="text-red-700 font-semibold">{h.losses}L</span>
                  <span className="text-muted-foreground text-xs">({h.played})</span>
                </div>
              </button>
            )
          })}
        </div>
        {data.headToHead.length > 8 && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Showing 8 most-played opponents out of {data.headToHead.length}.
          </div>
        )}
      </div>

      <div>
        <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Recent matches
        </h5>
        <div className="space-y-2">
          {recentMatches.map(m => (
            <div key={m.matchId} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {isDoublesFormat(m.categoryFormat) && m.partnerName && (
                    <div className="text-xs text-muted-foreground truncate">
                      Paired with {m.partnerName}
                    </div>
                  )}
                  <div className="font-medium truncate">
                    vs {formatSide(m.opponent.name, m.opponent.partnerName, m.categoryFormat)}
                    {m.opponent.isWalkin && <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4">Walk-in</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.tournamentName} • {m.categoryName} • {m.roundName || `Round ${m.round}`}
                  </div>
                </div>
                <Badge variant={m.won ? 'default' : 'outline'} className={m.won ? 'bg-green-600 hover:bg-green-600' : ''}>
                  {m.won ? 'Won' : 'Lost'}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="font-mono text-xs">{m.score || '—'}</div>
                <div className="text-xs text-muted-foreground">{formatDate(m.completedTime || m.tournamentEnd)}</div>
              </div>
            </div>
          ))}
        </div>
        {data.matches.length > recentMatches.length && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Showing 10 most recent of {data.matches.length} completed matches.
          </div>
        )}
      </div>
    </div>
  )
}
