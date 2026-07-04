import { useEffect, useMemo, useState } from 'react'
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

// TournamentEntry.id is typed as always present, but the API never actually
// serializes a Mongoose `id` virtual for subdocuments — only `_id`. Using
// `e.id` directly means every entry option collapses to the same
// `entry:undefined` value, so the browser always displays whichever entry is
// first in the list, no matter which one was actually selected. `_id` is the
// one field guaranteed present and unique per entry.
const entryKey = (e: TournamentEntry): string => (e as any)._id || e.id

type SlotSource = 'empty' | 'entry' | 'walkin' | 'bye' | 'qualifier'

interface Slot {
  source: SlotSource
  entryId?: string
  walkinName?: string
  seed?: number
  /** Derived (not user-set) 1-based ordinal among all 'qualifier' slots, top-to-bottom. */
  qualifierNumber?: number
}

/** One qualifying match: two accepted entries competing for one reserved main-draw slot. */
interface QualifyingMatch {
  entryIdA?: string
  entryIdB?: string
  /** Index into `qualifierSlotIndexes` — which reserved slot this match feeds. */
  assignedSlotIndex?: number
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
  if (slot.source === 'qualifier') {
    const n = slot.qualifierNumber ?? 0
    return { id: `qualifier-${n}`, name: `Qualifier ${n}`, isQualifierPlaceholder: true }
  }
  if (slot.source === 'entry' && slot.entryId) {
    const entry = entries.find(e => entryKey(e) === slot.entryId)
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
    // A qualifier placeholder is not yet a resolved player — never auto-advance
    // it via a BYE walkover; the match stays scheduled until the qualifying
    // match is actually decided (see updateMatchResult's promotion logic).
    const autoCompletable = hasBye && !!realPlayer && !realPlayer.isQualifierPlaceholder

    matches.push({
      id: `match-${matchNumber}`,
      matchNumber,
      round: 1,
      roundName: getRoundName(1, numberOfRounds),
      player1: p1,
      player2: p2,
      status: bothByes ? 'completed' : autoCompletable ? 'completed' : 'scheduled',
      winner: autoCompletable ? realPlayer!.id : undefined,
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
      // Preserve qualifier placeholders as-is — editMode can't redefine the
      // qualifying bracket (see updateManualDrawSlots), so this must round-trip
      // unchanged rather than falling through to the walk-in fallback below,
      // which would mint a new random id each save and break the promotion link.
      if (p.isQualifierPlaceholder) return { source: 'qualifier' }
      const matchedEntry = p.id ? entryByPlayerId.get(p.id) : undefined
      if (matchedEntry) return { source: 'entry', entryId: entryKey(matchedEntry), seed: p.seed ?? matchedEntry.seed }
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

  // Slots carry a derived (not user-set) qualifierNumber so "Qualifier 1",
  // "Qualifier 2", etc. always match top-to-bottom Round-1 order.
  const effectiveSlots = useMemo(() => {
    let qNum = 0
    return slots.map(s => {
      if (s.source === 'qualifier') {
        qNum += 1
        return { ...s, qualifierNumber: qNum }
      }
      return s
    })
  }, [slots])

  const qualifierSlotIndexes = useMemo(
    () => slots.map((s, i) => ({ s, i })).filter(x => x.s.source === 'qualifier').map(x => x.i),
    [slots]
  )

  // Fixed candidate pool: accepted entries not placed in a main-draw 'entry'
  // slot. Every one of these must end up in exactly one qualifying match.
  const qualifyingPool = useMemo(
    () => acceptedEntries.filter(e => !usedEntryIds.has(entryKey(e))),
    [acceptedEntries, usedEntryIds]
  )

  const [qualifyingMatches, setQualifyingMatches] = useState<QualifyingMatch[]>([])

  // Keep qualifyingMatches sized to the number of reserved Qualifier slots,
  // preserving already-filled rows when the count grows/shrinks.
  useEffect(() => {
    setQualifyingMatches(prev => {
      const needed = qualifierSlotIndexes.length
      if (prev.length === needed) return prev
      const next = Array.from({ length: needed }, (_, i) => prev[i] ?? { assignedSlotIndex: i })
      return next
    })
  }, [qualifierSlotIndexes.length])

  const usedQualifyingEntryIds = useMemo(
    () => new Set(qualifyingMatches.flatMap(m => [m.entryIdA, m.entryIdB].filter(Boolean) as string[])),
    [qualifyingMatches]
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
        next[i] = { source: 'entry', entryId: entryKey(entry), seed: entry.seed }
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

    // Qualifying pool/bracket validation only applies when building a fresh
    // draw — editMode can't redefine the qualifying bracket (see
    // updateManualDrawSlots), it only round-trips existing Qualifier slots unchanged.
    if (!editMode && qualifierSlotIndexes.length > 0) {
      if (qualifyingPool.length !== 2 * qualifierSlotIndexes.length) {
        return `${qualifierSlotIndexes.length} Qualifier slot(s) need exactly ${2 * qualifierSlotIndexes.length} unused accepted entries to fill the qualifying bracket, but ${qualifyingPool.length} are unused. Adjust the main-draw slots or the number of Qualifier slots.`
      }
      if (qualifyingMatches.length !== qualifierSlotIndexes.length) {
        return `Expected ${qualifierSlotIndexes.length} qualifying match(es), found ${qualifyingMatches.length}`
      }
      const usedQualIds = new Set<string>()
      const assignedSlots = new Set<number>()
      for (let i = 0; i < qualifyingMatches.length; i++) {
        const qm = qualifyingMatches[i]
        if (!qm.entryIdA || !qm.entryIdB) return `Qualifying match ${i + 1}: both players are required`
        if (qm.entryIdA === qm.entryIdB) return `Qualifying match ${i + 1}: cannot pair a player against themselves`
        if (usedQualIds.has(qm.entryIdA) || usedQualIds.has(qm.entryIdB)) {
          return `Qualifying match ${i + 1}: a player is already used in another qualifying match`
        }
        usedQualIds.add(qm.entryIdA)
        usedQualIds.add(qm.entryIdB)
        if (qm.assignedSlotIndex == null || qm.assignedSlotIndex < 0 || qm.assignedSlotIndex >= qualifierSlotIndexes.length) {
          return `Qualifying match ${i + 1}: must be assigned to a Qualifier slot`
        }
        if (assignedSlots.has(qm.assignedSlotIndex)) {
          return `Two qualifying matches are assigned to the same Qualifier slot`
        }
        assignedSlots.add(qm.assignedSlotIndex)
      }
    }
    return null
  }

  const buildQualifyingStage = (): NonNullable<Draw['qualifyingStage']> => {
    const matches: Match[] = qualifyingMatches.map((qm, i) => {
      const entryA = acceptedEntries.find(e => entryKey(e) === qm.entryIdA)!
      const entryB = acceptedEntries.find(e => entryKey(e) === qm.entryIdB)!
      const targetSlotIndex = qualifierSlotIndexes[qm.assignedSlotIndex!]
      return {
        id: `qualifying-match-${i + 1}`,
        matchNumber: i + 1,
        round: 1,
        roundName: 'Qualifying',
        player1: { id: entryA.playerId, name: entryA.playerName, seed: entryA.seed },
        player2: { id: entryB.playerId, name: entryB.playerName, seed: entryB.seed },
        status: 'scheduled',
        advancesToMatchNumber: Math.floor(targetSlotIndex / 2) + 1,
        advancesToSlot: targetSlotIndex % 2 === 0 ? 'player1' : 'player2',
      }
    })
    return { matches, numberOfRounds: 1, generatedAt: new Date().toISOString() }
  }

  const buildDraw = (): Draw => {
    const draw = buildSingleEliminationDraw(effectiveSlots, acceptedEntries)
    if (!editMode && qualifierSlotIndexes.length > 0) {
      draw.qualifyingStage = buildQualifyingStage()
    }
    return draw
  }

  const handlePreview = () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setPreview(buildDraw())
  }

  const slotsToPayload = () => {
    // Project each slot into the wire format expected by updateManualDrawSlots.
    // Walk-ins get a stable synthetic id; entries contribute their playerId.
    // Uses effectiveSlots so an existing 'qualifier' slot reconstructs the same
    // stable id/name it already has (see playerToSlot above) — since
    // updateManualDrawSlots only touches a match when its slot id actually
    // differs, this makes re-saving a qualifier placeholder in editMode a safe no-op.
    return effectiveSlots.map(s => {
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
        const drawToSave = preview ?? buildDraw()
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
      e => !usedEntryIds.has(entryKey(e)) || entryKey(e) === slot.entryId
    )

    // A qualifier placeholder can't be redefined while editing an existing
    // draw (editMode has no way to send a new qualifyingStage) — round-trip
    // it read-only instead of exposing an interactive select for it.
    if (editMode && slot.source === 'qualifier') {
      return (
        <div key={index} className="flex items-center gap-2 py-1">
          <div className="w-14 shrink-0 text-sm text-muted-foreground">Slot {index + 1}</div>
          <div className="h-9 flex-1 min-w-0 flex items-center px-2 text-sm text-amber-600 italic font-medium border rounded-md bg-amber-50">
            Qualifier {slot.qualifierNumber} (reserved — edit via full draw rebuild)
          </div>
        </div>
      )
    }

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
          {!editMode && (
            <option value="qualifier">
              Qualifier (reserved){slot.source === 'qualifier' && slot.qualifierNumber ? ` — Qualifier ${slot.qualifierNumber}` : ''}
            </option>
          )}
          {entryOptions.length > 0 && (
            <optgroup label="Accepted entries">
              {entryOptions.map(e => (
                <option key={entryKey(e)} value={`entry:${entryKey(e)}`}>
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

  const updateQualifyingMatch = (index: number, patch: Partial<QualifyingMatch>) => {
    setQualifyingMatches(prev => prev.map((qm, i) => (i === index ? { ...qm, ...patch } : qm)))
    setPreview(null)
  }

  const renderQualifyingPanel = () => {
    const overflow = qualifierSlotIndexes.length
    return (
      <div className="border rounded-md p-4 space-y-3 bg-amber-50">
        <div className="text-sm font-medium text-amber-800">
          Qualifying — {acceptedEntries.length} accepted entries into a {bracketSize}-slot draw ⇒{' '}
          {overflow} slot{overflow === 1 ? '' : 's'} reserved for Qualifier{overflow === 1 ? '' : 's'}
        </div>
        <p className="text-xs text-muted-foreground">
          Assign the {2 * overflow} unused accepted entries into {overflow} qualifying match
          {overflow === 1 ? '' : 'es'}. Each match's winner fills its assigned Qualifier slot once
          you record that qualifying match's result.
        </p>
        {qualifyingMatches.map((qm, i) => {
          const optionsA = qualifyingPool.filter(e => !usedQualifyingEntryIds.has(entryKey(e)) || entryKey(e) === qm.entryIdA)
          const optionsB = qualifyingPool.filter(e => !usedQualifyingEntryIds.has(entryKey(e)) || entryKey(e) === qm.entryIdB)
          return (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="w-28 shrink-0 text-sm text-muted-foreground">Qualifying {i + 1}</div>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm flex-1 min-w-0"
                value={qm.entryIdA ?? ''}
                onChange={e => updateQualifyingMatch(i, { entryIdA: e.target.value || undefined })}
              >
                <option value="">— choose —</option>
                {optionsA.map(e => (
                  <option key={entryKey(e)} value={entryKey(e)}>{e.playerName}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground shrink-0">vs</span>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm flex-1 min-w-0"
                value={qm.entryIdB ?? ''}
                onChange={e => updateQualifyingMatch(i, { entryIdB: e.target.value || undefined })}
              >
                <option value="">— choose —</option>
                {optionsB.map(e => (
                  <option key={entryKey(e)} value={entryKey(e)}>{e.playerName}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground shrink-0">feeds into</span>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm w-36 shrink-0"
                value={qm.assignedSlotIndex ?? ''}
                onChange={e =>
                  updateQualifyingMatch(i, {
                    assignedSlotIndex: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                  })
                }
              >
                <option value="">— choose —</option>
                {qualifierSlotIndexes.map((_, slotOrdinal) => (
                  <option key={slotOrdinal} value={slotOrdinal}>
                    Qualifier {slotOrdinal + 1}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
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
            {effectiveSlots.map((slot, index) => renderSlotRow(slot, index))}
          </div>

          {!editMode && qualifierSlotIndexes.length > 0 && renderQualifyingPanel()}

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
