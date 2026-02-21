import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, X, Save, Eye, CalendarClock } from 'lucide-react'
import { tournamentService, Tournament } from '@/services/tournamentService'

interface Props {
  tournament: Tournament
  onRefresh: () => Promise<void>
}

interface SchedulableMatch {
  categoryId: string
  categoryName: string
  matchId: string
  round: number
  roundName: string
  player1Name: string
  player2Name: string
  court: string
  scheduledTime: string | null // ISO string
}

type FilterMode = 'all' | 'unscheduled' | 'scheduled'

export function OrderOfPlayAdmin({ tournament, onRefresh }: Props) {
  const [newCourt, setNewCourt] = useState('')
  const [savingCourts, setSavingCourts] = useState(false)
  const [edits, setEdits] = useState<Record<string, { court: string; date: string; time: string }>>({})
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [previewMode, setPreviewMode] = useState(false)

  const courts = (tournament as any).courts || []

  // Aggregate all schedulable matches across categories
  const allMatches = useMemo(() => {
    const matches: SchedulableMatch[] = []

    for (const category of tournament.categories) {
      const draw = (category as any).draw
      if (!draw) continue

      const addMatch = (m: any) => {
        // Skip BYEs and matches without both players
        if (!m.player1 || !m.player2) return
        if (m.player1.isBye || m.player2.isBye) return
        // Skip if both players are TBD (no id)
        if (!m.player1.name && !m.player2.name) return

        matches.push({
          categoryId: category._id,
          categoryName: category.name,
          matchId: m._id,
          round: m.round,
          roundName: m.roundName || `Round ${m.round}`,
          player1Name: m.player1.name || 'TBD',
          player2Name: m.player2.name || 'TBD',
          court: m.court || '',
          scheduledTime: m.scheduledTime || null,
        })
      }

      if (draw.matches) {
        draw.matches.forEach(addMatch)
      }
      if (draw.roundRobinGroups) {
        for (const group of draw.roundRobinGroups) {
          if (group.matches) group.matches.forEach(addMatch)
        }
      }
    }

    return matches
  }, [tournament])

  const filteredMatches = useMemo(() => {
    switch (filter) {
      case 'scheduled':
        return allMatches.filter(m => {
          const edit = edits[m.matchId]
          if (edit) return edit.court || edit.date
          return m.court || m.scheduledTime
        })
      case 'unscheduled':
        return allMatches.filter(m => {
          const edit = edits[m.matchId]
          if (edit) return !edit.court && !edit.date
          return !m.court && !m.scheduledTime
        })
      default:
        return allMatches
    }
  }, [allMatches, filter, edits])

  // Helper: parse scheduledTime into date + time strings
  const parseScheduledTime = (iso: string | null): { date: string; time: string } => {
    if (!iso) return { date: '', time: '' }
    const d = new Date(iso)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` }
  }

  const getEditOrDefault = (match: SchedulableMatch) => {
    if (edits[match.matchId]) return edits[match.matchId]
    const parsed = parseScheduledTime(match.scheduledTime)
    return { court: match.court, date: parsed.date, time: parsed.time }
  }

  const updateEdit = (matchId: string, field: 'court' | 'date' | 'time', value: string) => {
    setEdits(prev => {
      const match = allMatches.find(m => m.matchId === matchId)!
      const existing = prev[matchId] || (() => {
        const parsed = parseScheduledTime(match.scheduledTime)
        return { court: match.court, date: parsed.date, time: parsed.time }
      })()
      return { ...prev, [matchId]: { ...existing, [field]: value } }
    })
  }

  // Court management
  const handleAddCourt = async () => {
    const trimmed = newCourt.trim()
    if (!trimmed || courts.includes(trimmed)) return
    setSavingCourts(true)
    try {
      await tournamentService.updateTournament(tournament._id, { courts: [...courts, trimmed] } as any)
      setNewCourt('')
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to add court')
    } finally {
      setSavingCourts(false)
    }
  }

  const handleRemoveCourt = async (court: string) => {
    setSavingCourts(true)
    try {
      await tournamentService.updateTournament(tournament._id, { courts: courts.filter((c: string) => c !== court) } as any)
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to remove court')
    } finally {
      setSavingCourts(false)
    }
  }

  // Save schedule
  const handleSaveSchedule = async () => {
    const schedules = Object.entries(edits).map(([matchId, edit]) => {
      const match = allMatches.find(m => m.matchId === matchId)!
      let scheduledTime: string | null = null
      if (edit.date) {
        const timePart = edit.time || '00:00'
        scheduledTime = new Date(`${edit.date}T${timePart}`).toISOString()
      }
      return {
        categoryId: match.categoryId,
        matchId,
        court: edit.court,
        scheduledTime,
      }
    })

    if (schedules.length === 0) return

    setSavingSchedule(true)
    try {
      await tournamentService.scheduleMatches(tournament._id, schedules)
      setEdits({})
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to save schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  // OOP preview data: group scheduled matches by date, then court
  const previewData = useMemo(() => {
    const scheduled = allMatches.filter(m => {
      const edit = edits[m.matchId]
      const time = edit ? (edit.date ? `${edit.date}T${edit.time || '00:00'}` : null) : m.scheduledTime
      return time !== null
    })

    const byDate: Record<string, Record<string, Array<{ time: string; label: string }>>> = {}

    for (const match of scheduled) {
      const edit = edits[match.matchId]
      let date: string, time: string, court: string
      if (edit) {
        date = edit.date
        time = edit.time || '00:00'
        court = edit.court || 'Unassigned'
      } else {
        const parsed = parseScheduledTime(match.scheduledTime)
        date = parsed.date
        time = parsed.time
        court = match.court || 'Unassigned'
      }
      if (!date) continue

      if (!byDate[date]) byDate[date] = {}
      if (!byDate[date][court]) byDate[date][court] = []

      byDate[date][court].push({
        time,
        label: `${match.categoryName} ${match.roundName}: ${match.player1Name} vs ${match.player2Name}`
      })
    }

    // Sort matches within each court by time
    for (const date of Object.keys(byDate)) {
      for (const court of Object.keys(byDate[date])) {
        byDate[date][court].sort((a, b) => a.time.localeCompare(b.time))
      }
    }

    return byDate
  }, [allMatches, edits])

  const hasEdits = Object.keys(edits).length > 0

  return (
    <div className="space-y-6">
      {/* Section A: Court Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Court Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {courts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courts added yet. Add courts to assign matches.</p>
            ) : (
              courts.map((court: string) => (
                <Badge key={court} variant="secondary" className="text-sm py-1 px-3 gap-1">
                  {court}
                  <button
                    onClick={() => handleRemoveCourt(court)}
                    className="ml-1 hover:text-destructive"
                    disabled={savingCourts}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Court 1"
              className="flex-1 p-2 border rounded-md text-sm"
              value={newCourt}
              onChange={(e) => setNewCourt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCourt()}
            />
            <Button size="sm" onClick={handleAddCourt} disabled={savingCourts || !newCourt.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Court
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Match Scheduling Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Match Scheduling</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden text-sm">
                {(['all', 'unscheduled', 'scheduled'] as FilterMode[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 capitalize ${filter === f ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {previewMode ? 'Table' : 'Preview'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allMatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No schedulable matches found. Generate draws first, then assign courts and times here.
            </p>
          ) : previewMode ? (
            /* Section C: OOP Preview */
            <div className="space-y-6">
              {Object.keys(previewData).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No matches have been scheduled yet. Assign courts and times in the table view.
                </p>
              ) : (
                Object.entries(previewData)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, courts]) => (
                    <div key={date}>
                      <h3 className="font-semibold text-lg mb-3 border-b pb-2">
                        {new Date(date + 'T00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(courts)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([court, matches]) => (
                            <div key={court} className="border rounded-lg p-3">
                              <h4 className="font-medium mb-2 text-sm text-muted-foreground">{court}</h4>
                              <div className="space-y-1">
                                {matches.map((m, i) => (
                                  <div key={i} className="text-sm">
                                    <span className="font-mono text-muted-foreground">{m.time}</span>
                                    {' — '}
                                    {m.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead className="w-[140px]">Court</TableHead>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead className="w-[110px]">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.map((match) => {
                      const current = getEditOrDefault(match)
                      return (
                        <TableRow key={match.matchId}>
                          <TableCell className="text-sm">{match.categoryName}</TableCell>
                          <TableCell className="text-sm">{match.roundName}</TableCell>
                          <TableCell className="text-sm">
                            {match.player1Name} vs {match.player2Name}
                          </TableCell>
                          <TableCell>
                            {courts.length > 0 ? (
                              <select
                                className="w-full p-1 border rounded text-sm"
                                value={current.court}
                                onChange={(e) => updateEdit(match.matchId, 'court', e.target.value)}
                              >
                                <option value="">--</option>
                                {courts.map((c: string) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="w-full p-1 border rounded text-sm"
                                placeholder="Court"
                                value={current.court}
                                onChange={(e) => updateEdit(match.matchId, 'court', e.target.value)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <input
                              type="date"
                              className="w-full p-1 border rounded text-sm"
                              value={current.date}
                              onChange={(e) => updateEdit(match.matchId, 'date', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              className="w-full p-1 border rounded text-sm"
                              value={current.time}
                              onChange={(e) => updateEdit(match.matchId, 'time', e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {hasEdits && (
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSaveSchedule} disabled={savingSchedule}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingSchedule ? 'Saving...' : `Save Schedule (${Object.keys(edits).length} changes)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
