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
  notBeforeMinutes: number // for sorting
  status: string
  score?: string
}

// Parse "8:00 HRS", "10:30", "09:00 hrs" → total minutes for sorting
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

// Format "8:00 HRS" → "08:00" for display
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

export function PublicOrderOfPlay({ tournament }: Props) {
  // Build a flat lookup: matchId → { player1Name, player2Name, roundName, status, score }
  const matchLookup = useMemo(() => {
    const map: Record<string, { player1: string; player2: string; roundName: string; categoryName: string; status: string; score?: string }> = {}
    for (const cat of tournament.categories) {
      const draw = (cat as any).draw
      if (!draw) continue

      const allMatches = [
        ...(draw.matches || []),
        ...(draw.roundRobinGroups || []).flatMap((g: any) => g.matches || [])
      ]
      const totalRounds = draw.totalRounds || draw.rounds || 1

      for (const m of allMatches) {
        if (!m._id) continue
        map[m._id.toString()] = {
          player1: m.player1?.name || 'TBD',
          player2: m.player2?.name || 'TBD',
          roundName: m.roundName || getRoundName(m.round, totalRounds),
          categoryName: cat.name,
          status: m.status || 'scheduled',
          score: m.score,
        }
      }
    }
    return map
  }, [tournament])

  const oop = tournament.orderOfPlay as OrderOfPlaySlot[] | undefined

  // Group slots by day string (YYYY-MM-DD)
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
        })
      }
    }

    // Sort matches within each court by notBefore time
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

  const getStatusBadge = (status: string, score?: string) => {
    if (status === 'completed') return <Badge variant="secondary" className="text-xs">{score || 'Completed'}</Badge>
    if (status === 'in_progress' || status === 'live') return <Badge variant="default" className="text-xs bg-green-600">Live</Badge>
    return null
  }

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
      {/* Day selector */}
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
                  <div className="space-y-3">
                    {matches.map((m, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="font-mono text-muted-foreground whitespace-nowrap w-12">
                          {formatNotBefore(m.notBefore) || '—'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">
                            {m.categoryName} — {m.roundName}
                          </div>
                          <div className="font-medium">
                            {m.player1Name} vs {m.player2Name}
                          </div>
                          {getStatusBadge(m.status, m.score)}
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
