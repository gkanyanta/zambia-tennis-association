import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ClipboardEdit, Eye, Trash2 } from 'lucide-react'
import { DrawBracket } from '@/components/DrawBracket'
import { tournamentService } from '@/services/tournamentService'
import type { Draw, Match, MatchPlayer, TournamentCategory, TournamentEntry } from '@/types/tournament'
import { getRoundName } from '@/types/tournament'

type SlotSource = 'empty' | 'entry' | 'walkin' | 'bye'

interface Slot {
  source: SlotSource
  entryId?: string
  walkinName?: string
  seed?: number
}

interface ManualDrawBuilderProps {
  category: TournamentCategory
  tournamentId: string
  categoryId: string
  /** When true, the builder edits the existing draw's round-1 slots and
   *  calls updateManualDrawSlots (preserves match _ids and scores).
   *  When false, it creates a new draw via saveManualDraw. */
  editMode?: boolean
  onSaved: () => Promise<void> | void
  onCancel: () => void
}

const BRACKET_SIZES = [4, 8, 16, 32, 64] as const
type BracketSize = (typeof BRACKET_SIZES)[number]

const emptySlot = (): Slot => ({ source: 'empty' })

const generateWalkinId = () => {
  // crypto.randomUUID() is widely available in modern browsers and Node 19+;
  // fall back to a Date/Math.random composite if unavailable.
  const g: any = typeof globalThis !== 'undefined' ? globalThis : {}
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return `walkin-${g.crypto.randomUUID()}`
  }
  return `walkin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const slotToPlayer = (slot: Slot, entries: TournamentEntry[]): MatchPlayer => {
  if (slot.source === 'bye' || slot.source === 'empty') {
    return { id: 'bye', name: 'BYE', isBye: true }
  }
  if (slot.source === 'entry' && slot.entryId) {
    const entry = entries.find(e => e.id === slot.entryId)
    if (entry) {
      return {
        id: entry.playerId,
        name: entry.playerName,
        seed: slot.seed ?? entry.seed,
      }
    }
    return { id: 'bye', name: 'BYE', isBye: true }
  }
  if (slot.source === 'walkin' && slot.walkinName && slot.walkinName.trim()) {
    return {
      id: generateWalkinId(),
      name: slot.walkinName.trim(),
      seed: slot.seed,
    }
  }
  return { id: 'bye', name: 'BYE', isBye: true }
}

const buildSingleEliminationDraw = (slots: Slot[], entries: TournamentEntry[]): Draw => {
  const bracketSize = slots.length
  const numberOfRounds = Math.log2(bracketSize)
  const players = slots.map(s => slotToPlayer(s, entries))

  const matches: Match[] = []
  let matchNumber = 1

  // Round 1: pair slot[0] vs slot[1], slot[2] vs slot[3], ...
  for (let i = 0; i < bracketSize; i += 2) {
    const p1 = players[i]
    const p2 = players[i + 1]
    const hasBye = p1.isBye || p2.isBye
    const realPlayer = p1.isBye ? (p2.isBye ? undefined : p2) : p1
    const bothByes = p1.isBye && p2.isBye

    matches.push({
      id: `match-${matchNumber}`,
      matchNumber,
      round: 1,
      roundName: getRoundName(1, numberOfRounds),
      player1: p1,
      player2: p2,
      status: bothByes ? 'completed' : hasBye && realPlayer ? 'completed' : 'scheduled',
      winner: hasBye && realPlayer ? realPlayer.id : undefined,
    })
    matchNumber++
  }

  // Subsequent rounds — empty placeholders, winners will advance as results are recorded.
  let prevRoundMatches = bracketSize / 2
  for (let round = 2; round <= numberOfRounds; round++) {
    const inRound = prevRoundMatches / 2
    for (let i = 0; i < inRound; i++) {
      matches.push({
        id: `match-${matchNumber}`,
        matchNumber,
        round,
        roundName: getRoundName(round, numberOfRounds),
        status: 'scheduled',
      })
      matchNumber++
    }
    prevRoundMatches = inRound
  }

  // Auto-advance BYE winners into round 2 (mirrors the auto-generator)
  const round1 = matches.filter(m => m.round === 1)
  const round2 = matches.filter(m => m.round === 2)
  round1.forEach((m, idx) => {
    if (m.winner && m.status === 'completed') {
      const nextIdx = Math.floor(idx / 2)
      const isFirst = idx % 2 === 0
      const w = m.player1?.id === m.winner ? m.player1 : m.player2
      if (w && round2[nextIdx]) {
        const fullIdx = matches.findIndex(x => x.id === round2[nextIdx].id)
        if (isFirst) matches[fullIdx].player1 = { ...w, isBye: undefined }
        else matches[fullIdx].player2 = { ...w, isBye: undefined }
      }
    }
  })

  return {
    type: 'single_elimination',
    matches,
    bracketSize,
    numberOfRounds,
    generatedAt: new Date().toISOString(),
  }
}

export function ManualDrawBuilder({
  category,
  tournamentId,
  categoryId,
  editMode = false,
  onSaved,
  onCancel,
}: ManualDrawBuilderProps) {
  const acceptedEntries = useMemo(
    () => category.entries.filter(e => e.status === 'accepted'),
    [category.entries]
  )

  // Derive initial slots + bracket size from the existing draw when editing.
  const derivedFromDraw = useMemo(() => {
    if (!editMode || !category.draw || category.draw.type !== 'single_elimination') return null
    const draw = category.draw as any
    const size = (draw.bracketSize as BracketSize | undefined) ?? null
    if (!size || !(BRACKET_SIZES as readonly number[]).includes(size)) return null

    const round1: any[] = (draw.matches || [])
      .filter((m: any) => m.round === 1)
      .sort((a: any, b: any) => a.matchNumber - b.matchNumber)

    const slots: Slot[] = Array.from({ length: size }, emptySlot)
    const entryByPlayerId = new Map(acceptedEntries.map(e => [e.playerId, e] as const))

    const playerToSlot = (p: any): Slot => {
      if (!p || p.isBye) return { source: 'bye' }
      const matchedEntry = p.id ? entryByPlayerId.get(p.id) : undefined
      if (matchedEntry) return { source: 'entry', entryId: matchedEntry.id, seed: p.seed ?? matchedEntry.seed }
      if (p.id && String(p.id).startsWith('walkin-')) return { source: 'walkin', walkinName: p.name || '', seed: p.seed }
      // Fallback: treat as walk-in if we have a name but no matching entry
      if (p.name) return { source: 'walkin', walkinName: p.name, seed: p.seed }
      return { source: 'empty' }
    }

    round1.forEach((m, i) => {
      slots[i * 2] = playerToSlot(m.player1)
      slots[i * 2 + 1] = playerToSlot(m.player2)
    })

    return { size, slots }
  }, [editMode, category.draw, acceptedEntries])

  const initialBracketSize: BracketSize = useMemo(() => {
    if (derivedFromDraw) return derivedFromDraw.size as BracketSize
    const count = acceptedEntries.length || 8
    return (BRACKET_SIZES.find(s => s >= count) ?? 64) as BracketSize
  }, [acceptedEntries.length, derivedFromDraw])

  const [bracketSize, setBracketSize] = useState<BracketSize>(initialBracketSize)
  const [slots, setSlots] = useState<Slot[]>(() =>
    derivedFromDraw ? derivedFromDraw.slots : Array.from({ length: initialBracketSize }, emptySlot)
  )
  const [preview, setPreview] = useState<Draw | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresOverwrite, setRequiresOverwrite] = useState(false)

  const usedEntryIds = useMemo(
    () => new Set(slots.filter(s => s.source === 'entry' && s.entryId).map(s => s.entryId!)),
    [slots]
  )

  const changeBracketSize = (size: BracketSize) => {
    setBracketSize(size)
    setSlots(prev => {
      const next = Array.from({ length: size }, (_, i) => prev[i] ?? emptySlot())
      return next
    })
    setPreview(null)
  }

  const updateSlot = (index: number, patch: Partial<Slot>) => {
    setSlots(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
    setPreview(null)
  }

  const setSlotSource = (index: number, source: SlotSource, entryId?: string) => {
    if (source === 'entry') {
      updateSlot(index, { source, entryId, walkinName: undefined })
    } else if (source === 'walkin') {
      updateSlot(index, { source, entryId: undefined, walkinName: '' })
    } else {
      updateSlot(index, { source, entryId: undefined, walkinName: undefined, seed: undefined })
    }
  }

  const autoFillFromEntries = () => {
    // Place accepted entries into consecutive slots in the order provided.
    setSlots(prev => {
      const next = prev.map(() => emptySlot()) as Slot[]
      acceptedEntries.slice(0, bracketSize).forEach((entry, i) => {
        next[i] = { source: 'entry', entryId: entry.id, seed: entry.seed }
      })
      return next
    })
    setPreview(null)
  }

  const clearAll = () => {
    setSlots(Array.from({ length: bracketSize }, emptySlot))
    setPreview(null)
  }

  const validate = (): string | null => {
    const filled = slots.filter(s => s.source !== 'empty').length
    if (filled < 2) return 'At least two slots must be filled (or marked as BYE)'

    const seenIds = new Set<string>()
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (s.source === 'entry') {
        if (!s.entryId) return `Slot ${i + 1}: no player selected`
        if (seenIds.has(s.entryId)) return `Slot ${i + 1}: player already placed in another slot`
        seenIds.add(s.entryId)
      }
      if (s.source === 'walkin') {
        if (!s.walkinName || !s.walkinName.trim()) return `Slot ${i + 1}: walk-in name is required`
      }
    }
    return null
  }

  const handlePreview = () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setPreview(buildSingleEliminationDraw(slots, acceptedEntries))
  }

  const slotsToPayload = () => {
    // Project each slot into the wire format expected by updateManualDrawSlots.
    // Walk-ins get a stable synthetic id; entries contribute their playerId.
    return slots.map(s => {
      const player = slotToPlayer(s, acceptedEntries)
      return {
        id: player.id,
        name: player.name,
        seed: player.seed,
        isBye: player.isBye,
      }
    })
  }

  const handleSave = async (confirmOverwrite = false) => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editMode) {
        await tournamentService.updateManualDrawSlots(tournamentId, categoryId, slotsToPayload())
      } else {
        const drawToSave = preview ?? buildSingleEliminationDraw(slots, acceptedEntries)
        await tournamentService.saveManualDraw(tournamentId, categoryId, drawToSave, confirmOverwrite)
      }
      await onSaved()
    } catch (e: any) {
      const msg: string = e?.message || (editMode ? 'Failed to update draw slots' : 'Failed to save manual draw')
      // saveManualDraw returns DRAW_HAS_RESULTS when an existing scored draw is present
      if (!editMode && (/existing draw/i.test(msg) || /recorded results/i.test(msg))) {
        setRequiresOverwrite(true)
      }
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const renderSlotRow = (slot: Slot, index: number) => {
    const entryOptions = acceptedEntries.filter(
      e => !usedEntryIds.has(e.id) || e.id === slot.entryId
    )

    return (
      <div key={index} className="flex items-center gap-2 py-1">
        <div className="w-14 shrink-0 text-sm text-muted-foreground">Slot {index + 1}</div>

        <select
          className="h-9 rounded-md border bg-background px-2 text-sm flex-1 min-w-0"
          value={slot.source === 'entry' ? `entry:${slot.entryId ?? ''}` : slot.source}
          onChange={e => {
            const val = e.target.value
            if (val.startsWith('entry:')) {
              setSlotSource(index, 'entry', val.slice('entry:'.length))
            } else {
              setSlotSource(index, val as SlotSource)
            }
          }}
        >
          <option value="empty">— choose —</option>
          <option value="bye">BYE</option>
          <option value="walkin">Walk-in (type name)</option>
          {entryOptions.length > 0 && (
            <optgroup label="Accepted entries">
              {entryOptions.map(e => (
                <option key={e.id} value={`entry:${e.id}`}>
                  {e.playerName}
                  {e.seed ? ` (seed ${e.seed})` : ''}
                  {e.clubName ? ` — ${e.clubName}` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {slot.source === 'walkin' && (
          <Input
            placeholder="Walk-in player name"
            className="h-9 flex-1 min-w-0"
            value={slot.walkinName ?? ''}
            onChange={e => updateSlot(index, { walkinName: e.target.value })}
          />
        )}

        {(slot.source === 'entry' || slot.source === 'walkin') && (
          <Input
            type="number"
            min={1}
            placeholder="Seed"
            className="h-9 w-20"
            value={slot.seed ?? ''}
            onChange={e => {
              const raw = e.target.value
              updateSlot(index, { seed: raw ? parseInt(raw, 10) : undefined })
            }}
          />
        )}
      </div>
    )
  }

  if (preview) {
    return (
      <div className="space-y-6">
        <Card className="border-primary">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editMode ? 'Updated Round 1 — Preview' : 'Manual Draw Preview'}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Back to edit
                </Button>
                <Button onClick={() => handleSave(requiresOverwrite)} disabled={saving}>
                  {saving ? 'Saving…' : editMode ? 'Apply slot changes' : requiresOverwrite ? 'Confirm & overwrite existing draw' : 'Save manual draw'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {editMode
                  ? 'Only round-1 slots are updated. Any match that already has a recorded result will be refused by the server to protect your scores.'
                  : 'Review the bracket carefully. Saving publishes this draw. Walk-in players are marked with a unique synthetic id so live scoring and PDF export work the same as for registered players.'}
              </AlertDescription>
            </Alert>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DrawBracket draw={preview} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardEdit className="h-5 w-5" />
                {editMode ? 'Edit manual draw slots' : 'Enter manual draw'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {editMode
                  ? 'Edit round-1 slots. Scores on any already-played match are preserved — the server will refuse to change a match that has a recorded result.'
                  : 'Record a draw that was conducted offline. Pick a bracket size, then place each player in their slot. Accepted entries appear in the dropdown; use "Walk-in" for any player who is not registered in the system.'}
              </p>
            </div>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">Bracket size:</Label>
            {BRACKET_SIZES.map(size => (
              <Button
                key={size}
                size="sm"
                variant={size === bracketSize ? 'default' : 'outline'}
                onClick={() => changeBracketSize(size)}
                disabled={editMode}
                title={editMode ? 'Bracket size is fixed while editing an existing draw' : ''}
              >
                {size}
              </Button>
            ))}
            {!editMode && (
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={autoFillFromEntries} disabled={acceptedEntries.length === 0}>
                  Auto-fill from entries
                </Button>
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div>
              Accepted entries: <Badge variant="outline">{acceptedEntries.length}</Badge>
            </div>
            <div>
              Slots filled:{' '}
              <Badge variant="outline">
                {slots.filter(s => s.source !== 'empty').length} / {bracketSize}
              </Badge>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {slots.map((slot, index) => renderSlotRow(slot, index))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview bracket
            </Button>
            <Button variant="outline" onClick={() => handleSave(requiresOverwrite)} disabled={saving}>
              {saving
                ? 'Saving…'
                : editMode
                  ? 'Apply slot changes'
                  : requiresOverwrite
                    ? 'Confirm & overwrite existing draw'
                    : 'Save without preview'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
