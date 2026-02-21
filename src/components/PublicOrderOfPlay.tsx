import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarClock } from 'lucide-react'
import { Tournament } from '@/services/tournamentService'

interface Props {
  tournament: Tournament
}

interface ScheduledMatch {
  categoryName: string
  roundName: string
  player1Name: string
  player2Name: string
  court: string
  scheduledTime: Date
  status: string
  score?: string
}

export function PublicOrderOfPlay({ tournament }: Props) {
  // Collect all scheduled matches
  const scheduledMatches = useMemo(() => {
    const matches: ScheduledMatch[] = []

    for (const category of tournament.categories) {
      const draw = (category as any).draw
      if (!draw) continue

      const addMatch = (m: any) => {
        if (!m.scheduledTime) return
        if (m.player1?.isBye || m.player2?.isBye) return

        matches.push({
          categoryName: category.name,
          roundName: m.roundName || `Round ${m.round}`,
          player1Name: m.player1?.name || 'TBD',
          player2Name: m.player2?.name || 'TBD',
          court: m.court || 'TBA',
          scheduledTime: new Date(m.scheduledTime),
          status: m.status,
          score: m.score,
        })
      }

      if (draw.matches) draw.matches.forEach(addMatch)
      if (draw.roundRobinGroups) {
        for (const group of draw.roundRobinGroups) {
          if (group.matches) group.matches.forEach(addMatch)
        }
      }
    }

    return matches
  }, [tournament])

  // Get unique dates
  const dates = useMemo(() => {
    const dateSet = new Set<string>()
    for (const m of scheduledMatches) {
      const d = m.scheduledTime
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dateSet.add(key)
    }
    return Array.from(dateSet).sort()
  }, [scheduledMatches])

  // Default to today if within tournament dates, otherwise first date
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    if (dates.includes(todayStr)) return todayStr
    return dates[0] || ''
  })

  // Matches for selected date, grouped by court
  const matchesByCourt = useMemo(() => {
    if (!selectedDate) return {}

    const filtered = scheduledMatches.filter(m => {
      const d = m.scheduledTime
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return key === selectedDate
    })

    const grouped: Record<string, ScheduledMatch[]> = {}
    for (const m of filtered) {
      if (!grouped[m.court]) grouped[m.court] = []
      grouped[m.court].push(m)
    }

    // Sort by time within each court
    for (const court of Object.keys(grouped)) {
      grouped[court].sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
    }

    return grouped
  }, [scheduledMatches, selectedDate])

  const formatTime = (d: Date) => {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const getStatusBadge = (status: string, score?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="text-xs">{score || 'Completed'}</Badge>
      case 'in_progress':
      case 'live':
        return <Badge variant="default" className="text-xs bg-green-600">Live</Badge>
      default:
        return null
    }
  }

  if (scheduledMatches.length === 0) {
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

  return (
    <div className="space-y-6">
      {/* Day Selector */}
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

      {/* Date Header */}
      {selectedDate && (
        <h2 className="text-xl font-semibold">
          {new Date(selectedDate + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
      )}

      {/* Courts */}
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
                        <div className="font-mono text-muted-foreground whitespace-nowrap">
                          {formatTime(m.scheduledTime)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">
                            {m.categoryName} — {m.roundName}
                          </div>
                          <div className="font-medium truncate">
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
