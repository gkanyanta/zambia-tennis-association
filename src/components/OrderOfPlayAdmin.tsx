import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Save, CalendarClock, ChevronUp, ChevronDown, FileDown, Trash2 } from 'lucide-react'
import { tournamentService, Tournament, OrderOfPlayEntry, OrderOfPlaySlot } from '@/services/tournamentService'

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
  status: string
}

export function OrderOfPlayAdmin({ tournament, onRefresh }: Props) {
  const [newCourt, setNewCourt] = useState('')
  const [savingCourts, setSavingCourts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(0)

  // Local OOP state — initialised from tournament.orderOfPlay
  const [slots, setSlots] = useState<OrderOfPlaySlot[]>([])

  const courts = tournament.courts || []

  // Generate array of tournament days
  const tournamentDays = useMemo(() => {
    const days: string[] = []
    const start = new Date(tournament.startDate)
    const end = new Date(tournament.endDate)
    const d = new Date(start)
    while (d <= end) {
      days.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    if (days.length === 0) days.push(start.toISOString().split('T')[0])
    return days
  }, [tournament.startDate, tournament.endDate])

  // Initialise slots from tournament data
  useEffect(() => {
    setSlots(tournament.orderOfPlay || [])
  }, [tournament.orderOfPlay])

  // Aggregate all schedulable matches across categories
  const allMatches = useMemo(() => {
    const matches: SchedulableMatch[] = []

    for (const category of tournament.categories) {
      const draw = (category as any).draw
      if (!draw) continue

      const addMatch = (m: any) => {
        if (!m.player1 || !m.player2) return
        if (m.player1.isBye || m.player2.isBye) return
        if (!m.player1.name && !m.player2.name) return

        matches.push({
          categoryId: category._id,
          categoryName: category.name,
          matchId: m._id,
          round: m.round,
          roundName: m.roundName || `Round ${m.round}`,
          player1Name: m.player1.name || 'TBD',
          player2Name: m.player2.name || 'TBD',
          status: m.status || 'scheduled',
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

  // IDs of matches already assigned to any slot
  const assignedMatchIds = useMemo(() => {
    const ids = new Set<string>()
    for (const slot of slots) {
      for (const entry of slot.matches) {
        ids.add(entry.matchId)
      }
    }
    return ids
  }, [slots])

  // Unassigned matches available for the picker
  const unassignedMatches = useMemo(() => {
    return allMatches.filter(m => !assignedMatchIds.has(m.matchId))
  }, [allMatches, assignedMatchIds])

  const currentDayKey = tournamentDays[selectedDay] || tournamentDays[0]

  // Get slots for the current day, one per court
  const currentDaySlots = useMemo(() => {
    return courts.map((court: string) => {
      const existing = slots.find(
        s => s.court === court && s.day.split('T')[0] === currentDayKey
      )
      return existing || { day: currentDayKey, court, matches: [] as OrderOfPlayEntry[] }
    })
  }, [slots, courts, currentDayKey])

  // Helper: update a slot in the slots array
  const updateSlot = (court: string, updater: (matches: OrderOfPlayEntry[]) => OrderOfPlayEntry[]) => {
    setSlots(prev => {
      const existing = prev.find(s => s.court === court && s.day.split('T')[0] === currentDayKey)
      if (existing) {
        return prev.map(s =>
          s.court === court && s.day.split('T')[0] === currentDayKey
            ? { ...s, matches: updater([...s.matches]) }
            : s
        )
      }
      // Create new slot
      return [...prev, { day: currentDayKey, court, matches: updater([]) }]
    })
  }

  // Add a match to a court
  const handleAddMatch = (court: string, matchId: string) => {
    const match = allMatches.find(m => m.matchId === matchId)
    if (!match) return
    updateSlot(court, (matches) => [
      ...matches,
      { categoryId: match.categoryId, matchId: match.matchId, notBefore: '' }
    ])
  }

  // Remove a match from a court
  const handleRemoveMatch = (court: string, index: number) => {
    updateSlot(court, (matches) => {
      matches.splice(index, 1)
      return matches
    })
  }

  // Move match up/down within a court
  const handleMoveMatch = (court: string, index: number, direction: 'up' | 'down') => {
    updateSlot(court, (matches) => {
      const newIdx = direction === 'up' ? index - 1 : index + 1
      if (newIdx < 0 || newIdx >= matches.length) return matches
      const temp = matches[index]
      matches[index] = matches[newIdx]
      matches[newIdx] = temp
      return matches
    })
  }

  // Update notBefore annotation
  const handleNotBeforeChange = (court: string, index: number, value: string) => {
    updateSlot(court, (matches) => {
      matches[index] = { ...matches[index], notBefore: value }
      return matches
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

  // Save order of play
  const handleSave = async () => {
    // Filter out empty slots
    const toSave = slots.filter(s => s.matches.length > 0)
    setSaving(true)
    try {
      await tournamentService.saveOrderOfPlay(tournament._id, toSave)
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to save order of play')
    } finally {
      setSaving(false)
    }
  }

  // Export PDF
  const handleExportPDF = () => {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    window.open(`${apiUrl}/api/tournaments/${tournament._id}/order-of-play/pdf`, '_blank')
  }

  // Get match display label
  const getMatchLabel = (entry: OrderOfPlayEntry) => {
    const match = allMatches.find(m => m.matchId === entry.matchId)
    if (!match) return 'Unknown match'
    return `${match.categoryName} ${match.roundName}: ${match.player1Name} vs ${match.player2Name}`
  }

  // Check if local state differs from saved state
  const hasChanges = useMemo(() => {
    const savedStr = JSON.stringify(tournament.orderOfPlay || [])
    const currentStr = JSON.stringify(slots.filter(s => s.matches.length > 0))
    return savedStr !== currentStr
  }, [tournament.orderOfPlay, slots])

  const hasSavedData = (tournament.orderOfPlay || []).some(s => s.matches.length > 0)

  return (
    <div className="space-y-6">
      {/* Court Management */}
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
              <p className="text-sm text-muted-foreground">No courts added yet. Add courts to start building the order of play.</p>
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

      {/* Order of Play Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Order of Play</CardTitle>
            <div className="flex items-center gap-2">
              {hasSavedData && (
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {courts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Add courts above to start building the order of play.
            </p>
          ) : allMatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No schedulable matches found. Generate draws first.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Day Tabs */}
              <div className="flex gap-1 border-b overflow-x-auto pb-px">
                {tournamentDays.map((day, idx) => {
                  const dayDate = new Date(day + 'T00:00')
                  const label = dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                  const daySlotCount = slots
                    .filter(s => s.day.split('T')[0] === day)
                    .reduce((sum, s) => sum + s.matches.length, 0)

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(idx)}
                      className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        selectedDay === idx
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                      }`}
                    >
                      {label}
                      {daySlotCount > 0 && (
                        <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {daySlotCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Per-Court Sections */}
              <div className="space-y-4">
                {currentDaySlots.map((slot) => (
                  <div key={slot.court} className="border rounded-lg">
                    {/* Court Header */}
                    <div className="bg-blue-50 px-4 py-2 rounded-t-lg border-b">
                      <h4 className="font-semibold text-blue-800 text-sm">{slot.court}</h4>
                    </div>

                    <div className="p-3 space-y-1">
                      {slot.matches.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 text-center">No matches assigned</p>
                      ) : (
                        slot.matches.map((entry, idx) => (
                          <div key={`${entry.matchId}-${idx}`}>
                            {/* "followed by" separator */}
                            {idx > 0 && (
                              <div className="text-xs text-muted-foreground italic text-center py-0.5">
                                followed by
                              </div>
                            )}

                            <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
                              {/* Match number */}
                              <span className="text-sm font-medium text-muted-foreground w-5 shrink-0 pt-0.5">
                                {idx + 1}.
                              </span>

                              {/* Match info + not-before */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm">{getMatchLabel(entry)}</div>
                                <input
                                  type="text"
                                  placeholder="Not before (e.g. Not before 2:00 PM)"
                                  className="mt-1 w-full text-xs p-1 border rounded text-amber-700 placeholder:text-muted-foreground/50"
                                  value={entry.notBefore}
                                  onChange={(e) => handleNotBeforeChange(slot.court, idx, e.target.value)}
                                />
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleMoveMatch(slot.court, idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                  title="Move up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveMatch(slot.court, idx, 'down')}
                                  disabled={idx === slot.matches.length - 1}
                                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                                  title="Move down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMatch(slot.court, idx)}
                                  className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Add match picker */}
                      {unassignedMatches.length > 0 && (
                        <div className="pt-2 border-t mt-2">
                          <select
                            className="w-full p-1.5 border rounded text-sm"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleAddMatch(slot.court, e.target.value)
                            }}
                          >
                            <option value="">+ Add match...</option>
                            {unassignedMatches.map(m => (
                              <option key={m.matchId} value={m.matchId}>
                                {m.categoryName} {m.roundName}: {m.player1Name} vs {m.player2Name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>
                  {assignedMatchIds.size} of {allMatches.length} matches assigned
                  {unassignedMatches.length > 0 && ` (${unassignedMatches.length} remaining)`}
                </span>
                {hasChanges && (
                  <span className="text-amber-600 font-medium">Unsaved changes</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
