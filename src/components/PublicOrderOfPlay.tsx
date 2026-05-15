import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarClock } from 'lucide-react'
import { Tournament, OrderOfPlaySlot } from '@/services/tournamentService'

interface Props {
  tournament: Tournament
}

interface ResolvedMatch {
  categoryName: string
  roundName: string
  player1Name: string
  player2Name: string
  court: string
  notBefore: string
  notBeforeMinutes: number
  status: string
  score?: string
  winner?: 'player1' | 'player2' | null
}

function parseNotBefore(raw: string): number {
  if (!raw) return 9999
  const cleaned = raw.replace(/hrs?/i, '').trim()
  const parts = cleaned.split(':')
  if (parts.length < 2) return 9999
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return 9999
  return h * 60 + m
}

function formatNotBefore(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.replace(/hrs?/i, '').trim()
  const parts = cleaned.split(':')
  if (parts.length < 2) return raw
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return raw
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round + 1
  if (remaining === 1) return 'Final'
  if (remaining === 2) return 'Semi-Final'
  if (remaining === 3) return 'Quarter-Final'
  if (remaining === 4) return 'Round of 16'
  return `Round ${round}`
}

function surname(fullName: string): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

export function PublicOrderOfPlay({ tournament }: Props) {
  const matchLookup = useMemo(() => {
    const map: Record<string, {
      player1: string; player2: string; player1Id: string; player2Id: string;
      roundName: string; categoryName: string; status: string; score?: string; winnerId?: string;
    }> = {}

    for (const cat of tournament.categories) {
      const draw = (cat as any).draw
      if (!draw) continue

      const isDoubles = (cat as any).format === 'doubles' || (cat as any).format === 'mixed_doubles'

      // Build partner map for doubles categories
      const partnerMap: Record<string, string> = {}
      if (isDoubles) {
        for (const entry of (cat as any).entries || []) {
          if (entry.partnerName && entry.playerId) partnerMap[entry.playerId] = entry.partnerName
          if (entry.partnerName && entry.playerZpin) partnerMap[entry.playerZpin] = entry.partnerName
        }
      }

      const enrichName = (p: any): string => {
        if (!p) return 'TBD'
        if (isDoubles && p.id && partnerMap[p.id]) {
          return `${surname(p.name)} / ${surname(partnerMap[p.id])}`
        }
        return p.name || 'TBD'
      }

      const allMatches = [
        ...(draw.matches || []),
        ...(draw.roundRobinGroups || []).flatMap((g: any) => g.matches || []),
        ...((draw.knockoutStage?.matches) || []),
      ]
      const totalRounds = draw.numberOfRounds || draw.totalRounds || 1

      for (const m of allMatches) {
        if (!m._id) continue
        map[m._id.toString()] = {
          player1: enrichName(m.player1),
          player2: enrichName(m.player2),
          player1Id: m.player1?.id || '',
          player2Id: m.player2?.id || '',
          roundName: m.roundName || getRoundName(m.round, totalRounds),
          categoryName: cat.name,
          status: m.status || 'scheduled',
          score: m.score,
          winnerId: m.winner || undefined,
        }
      }
    }
    return map
  }, [tournament])

  const oop = tournament.orderOfPlay as OrderOfPlaySlot[] | undefined

  const dayMap = useMemo(() => {
    const map: Record<string, Record<string, ResolvedMatch[]>> = {}
    if (!oop) return map

    for (const slot of oop) {
      const d = new Date(slot.day)
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      if (!map[dayKey]) map[dayKey] = {}
      if (!map[dayKey][slot.court]) map[dayKey][slot.court] = []

      for (const m of slot.matches) {
        const info = matchLookup[m.matchId]
        if (!info) continue

        let winner: 'player1' | 'player2' | null = null
        if (info.winnerId) {
          if (info.winnerId === info.player1Id) winner = 'player1'
          else if (info.winnerId === info.player2Id) winner = 'player2'
        }

        map[dayKey][slot.court].push({
          categoryName: info.categoryName,
          roundName: info.roundName,
          player1Name: info.player1,
          player2Name: info.player2,
          court: slot.court,
          notBefore: m.notBefore,
          notBeforeMinutes: parseNotBefore(m.notBefore),
          status: info.status,
          score: info.score,
          winner,
        })
      }
    }

    for (const day of Object.values(map)) {
      for (const court of Object.values(day)) {
        court.sort((a, b) => a.notBeforeMinutes - b.notBeforeMinutes)
      }
    }

    return map
  }, [oop, matchLookup])

  const dates = useMemo(() => Object.keys(dayMap).sort(), [dayMap])

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return dates.includes(todayStr) ? todayStr : (dates[0] || '')
  })

  const hasAnyMatches = dates.some(d => Object.values(dayMap[d]).some(m => m.length > 0))

  if (!hasAnyMatches) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Order of play has not been published yet.</p>
          <p className="text-sm">The schedule will appear here once the tournament organizers publish the order of play.</p>
        </CardContent>
      </Card>
    )
  }

  const matchesByCourt = selectedDate ? dayMap[selectedDate] || {} : {}

  return (
    <div className="space-y-6">
      {dates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {dates.map(date => {
            const d = new Date(date + 'T00:00')
            const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  selectedDate === date
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {selectedDate && (
        <h2 className="text-xl font-semibold">
          {new Date(selectedDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
      )}

      {Object.keys(matchesByCourt).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No matches scheduled for this day.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(matchesByCourt)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([court, matches]) => (
              <Card key={court}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{court}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {matches.map((m, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="font-mono text-muted-foreground whitespace-nowrap w-12 pt-0.5">
                          {formatNotBefore(m.notBefore) || '—'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">
                            {m.categoryName} — {m.roundName}
                          </div>
                          {/* Player 1 */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={m.winner === 'player1' ? 'font-bold' : 'font-medium'}>
                              {m.player1Name}
                            </span>
                            {m.winner === 'player1' && m.score && (
                              <span className="text-xs font-semibold text-green-700 dark:text-green-400 whitespace-nowrap shrink-0">
                                {m.score}
                              </span>
                            )}
                          </div>
                          {/* VS divider */}
                          <div className="text-xs text-muted-foreground my-0.5">vs</div>
                          {/* Player 2 */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={m.winner === 'player2' ? 'font-bold' : 'font-medium'}>
                              {m.player2Name}
                            </span>
                            {m.winner === 'player2' && m.score && (
                              <span className="text-xs font-semibold text-green-700 dark:text-green-400 whitespace-nowrap shrink-0">
                                {m.score}
                              </span>
                            )}
                          </div>
                          {/* Status badge for live/pending */}
                          {(m.status === 'in_progress' || m.status === 'live') && (
                            <Badge variant="default" className="text-xs bg-green-600 mt-1">Live</Badge>
                          )}
                          {m.status === 'walkover' && (
                            <Badge variant="secondary" className="text-xs mt-1">Walkover</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
