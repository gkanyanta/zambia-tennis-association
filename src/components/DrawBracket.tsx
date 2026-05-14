import { useRef, useEffect, useState, useCallback, useMemo, forwardRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { Draw, Match } from '@/types/tournament'

interface DrawBracketProps {
  draw: Draw
  onMatchClick?: (match: Match) => void
}

export function DrawBracket({ draw, onMatchClick }: DrawBracketProps) {
  if (draw.type === 'mixer') {
    // Mixer draws are rendered by MixerDrawView, not DrawBracket
    return null
  }

  if (draw.type === 'round_robin') {
    return <RoundRobinView draw={draw} onMatchClick={onMatchClick} />
  }

  return <SingleEliminationBracket draw={draw} onMatchClick={onMatchClick} />
}

// ─── Single Elimination Bracket ──────────────────────────────────────────────

function SingleEliminationBracket({ draw, onMatchClick }: DrawBracketProps) {
  const { matches, numberOfRounds = 0 } = draw
  const containerRef = useRef<HTMLDivElement>(null)
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<string[]>([])
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 })

  const matchesByRound = useMemo(() => {
    const result: Match[][] = []
    for (let round = 1; round <= numberOfRounds; round++) {
      result.push(
        matches
          .filter(m => m.round === round)
          .sort((a, b) => a.matchNumber - b.matchNumber)
      )
    }
    return result
  }, [matches, numberOfRounds])

  const setMatchRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) matchRefs.current.set(key, el)
    else matchRefs.current.delete(key)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || matchesByRound.length < 2) return

    const calculate = () => {
      const cRect = container.getBoundingClientRect()
      const paths: string[] = []

      for (let r = 0; r < matchesByRound.length - 1; r++) {
        const nextRound = matchesByRound[r + 1]
        for (let j = 0; j < nextRound.length; j++) {
          const top = matchRefs.current.get(`${r}-${j * 2}`)
          const bot = matchRefs.current.get(`${r}-${j * 2 + 1}`)
          const nxt = matchRefs.current.get(`${r + 1}-${j}`)
          if (!top || !bot || !nxt) continue

          const tR = top.getBoundingClientRect()
          const bR = bot.getBoundingClientRect()
          const nR = nxt.getBoundingClientRect()

          const x1 = tR.right - cRect.left
          const y1 = tR.top + tR.height / 2 - cRect.top
          const y2 = bR.top + bR.height / 2 - cRect.top
          const x2 = nR.left - cRect.left
          const yN = nR.top + nR.height / 2 - cRect.top
          const xM = (x1 + x2) / 2

          paths.push(
            `M${x1},${y1} H${xM} M${x1},${y2} H${xM} M${xM},${y1} V${y2} M${xM},${yN} H${x2}`
          )
        }
      }

      setSvgSize({ width: container.scrollWidth, height: container.scrollHeight })
      setLines(paths)
    }

    const raf = requestAnimationFrame(calculate)
    const observer = new ResizeObserver(calculate)
    observer.observe(container)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [matchesByRound])

  return (
    <div className="overflow-x-auto pb-4">
      <div ref={containerRef} className="relative flex min-w-max">
        {/* SVG connector lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={svgSize.width || '100%'}
          height={svgSize.height || '100%'}
          style={{ zIndex: 0 }}
        >
          {lines.map((d, i) => (
            <path key={i} d={d} stroke="hsl(var(--border))" fill="none" strokeWidth={1.5} />
          ))}
        </svg>

        {matchesByRound.map((roundMatches, roundIndex) => (
          <div
            key={roundIndex}
            className="flex flex-col min-w-[220px] relative"
            style={{ zIndex: 1 }}
          >
            <h3 className="text-center font-bold mb-3 text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-background py-2">
              {roundMatches[0]?.roundName || `Round ${roundIndex + 1}`}
            </h3>
            <div className="flex flex-col justify-around flex-1 gap-1 px-5">
              {roundMatches.map((match, matchIndex) => (
                <BracketMatch
                  key={(match as any)._id || match.id}
                  ref={(el) => setMatchRef(`${roundIndex}-${matchIndex}`, el)}
                  match={match}
                  onClick={() => onMatchClick?.(match)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bracket Match Box ───────────────────────────────────────────────────────

const BracketMatch = forwardRef<
  HTMLDivElement,
  { match: Match & { _id?: string }; onClick?: () => void }
>(({ match, onClick }, ref) => {
  const isClickable =
    match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye
  const isCompleted = match.status === 'completed' || match.status === 'walkover'

  return (
    <div
      ref={ref}
      className={`border rounded bg-card text-card-foreground shadow-sm ${
        isClickable ? 'cursor-pointer hover:border-primary hover:shadow-md transition-shadow' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <BracketPlayer
        player={match.player1}
        isWinner={isCompleted && match.winner === match.player1?.id}
        score={isCompleted ? match.score : undefined}
        showScore={isCompleted && match.winner === match.player1?.id}
      />
      <div className="border-t" />
      <BracketPlayer
        player={match.player2}
        isWinner={isCompleted && match.winner === match.player2?.id}
        score={isCompleted ? match.score : undefined}
        showScore={isCompleted && match.winner === match.player2?.id}
      />
      {match.court && (
        <div className="border-t text-[10px] text-muted-foreground text-center py-0.5">
          Ct {match.court}
        </div>
      )}
    </div>
  )
})
BracketMatch.displayName = 'BracketMatch'

// ─── Bracket Player Row ─────────────────────────────────────────────────────

function BracketPlayer({
  player,
  isWinner,
  score,
  showScore,
}: {
  player?: { id: string; name: string; seed?: number; isBye?: boolean }
  isWinner: boolean
  score?: string
  showScore?: boolean
}) {
  if (!player) {
    return (
      <div className="py-1.5 px-2 text-xs text-muted-foreground italic">
        TBD
      </div>
    )
  }

  if (player.isBye) {
    return (
      <div className="py-1.5 px-2 text-xs text-muted-foreground italic">
        BYE
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-between py-1.5 px-2 text-xs ${
        isWinner
          ? 'bg-green-50 dark:bg-green-950/30 font-bold text-green-700 dark:text-green-400'
          : ''
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {player.seed && (
          <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">
            [{player.seed}]
          </span>
        )}
        <span className="truncate">{player.name}</span>
      </div>
      {showScore && score && (
        <span className="ml-2 text-[10px] text-muted-foreground shrink-0 font-normal">
          {score}
        </span>
      )}
    </div>
  )
}

// ─── Round Robin View (unchanged) ───────────────────────────────────────────

function RoundRobinCrossTable({ group, onMatchClick }: { group: any; onMatchClick?: (match: Match) => void }) {
  const players = group.players || []
  const matches = group.matches || []
  const standings = group.standings || []

  // Build result lookup: matchMap[rowId][colId] = { score, won, match }
  const matchMap: Record<string, Record<string, { score: string; won: boolean; match: any }>> = {}
  for (const m of matches) {
    if (!m.player1?.id || !m.player2?.id) continue
    if (!m.winner && !m.score) continue
    const p1Won = m.winner === m.player1.id
    if (!matchMap[m.player1.id]) matchMap[m.player1.id] = {}
    if (!matchMap[m.player2.id]) matchMap[m.player2.id] = {}
    matchMap[m.player1.id][m.player2.id] = { score: m.score || '', won: p1Won, match: m }
    matchMap[m.player2.id][m.player1.id] = { score: m.score || '', won: !p1Won, match: m }
  }

  // Standings lookup
  const standingsMap: Record<string, any> = {}
  standings.forEach((s: any, i: number) => { standingsMap[s.playerId] = { ...s, position: i + 1 } })

  // Find unplayed matches for click handling
  const findMatch = (p1Id: string, p2Id: string) => {
    return matches.find((m: any) =>
      (m.player1?.id === p1Id && m.player2?.id === p2Id) ||
      (m.player1?.id === p2Id && m.player2?.id === p1Id)
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="border border-slate-600 px-2 py-2 text-center w-8">#</th>
            <th className="border border-slate-600 px-3 py-2 text-left min-w-[120px]">Player</th>
            {players.map((_: any, j: number) => (
              <th key={j} className="border border-slate-600 px-2 py-2 text-center min-w-[80px]">{j + 1}</th>
            ))}
            <th className="border border-slate-600 px-2 py-2 text-center w-8">W</th>
            <th className="border border-slate-600 px-2 py-2 text-center w-8">L</th>
            <th className="border border-slate-600 px-2 py-2 text-center w-10">Pts</th>
            <th className="border border-slate-600 px-2 py-2 text-center w-10">Pos</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player: any, i: number) => {
            const st = standingsMap[player.id] || { won: 0, lost: 0, points: 0, position: '-' }
            return (
              <tr key={player.id} className={i % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/30' : ''}>
                <td className="border px-2 py-2 text-center font-bold">{i + 1}</td>
                <td className="border px-3 py-2 font-medium">{player.name}</td>
                {players.map((opponent: any, j: number) => {
                  if (i === j) {
                    return <td key={j} className="border px-2 py-2 bg-slate-200 dark:bg-slate-700" />
                  }
                  const result = matchMap[player.id]?.[opponent.id]
                  const match = findMatch(player.id, opponent.id)
                  return (
                    <td
                      key={j}
                      className={`border px-2 py-2 text-center text-xs ${
                        result ? (result.won ? 'text-green-700 dark:text-green-400 font-bold' : 'text-slate-500') : ''
                      } ${match && onMatchClick ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950' : ''}`}
                      onClick={() => match && onMatchClick?.(match)}
                    >
                      {result ? result.score : ''}
                    </td>
                  )
                })}
                <td className="border px-2 py-2 text-center">{st.won}</td>
                <td className="border px-2 py-2 text-center">{st.lost}</td>
                <td className="border px-2 py-2 text-center font-bold">{st.points}</td>
                <td className="border px-2 py-2 text-center font-bold">{st.position}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RoundRobinView({ draw, onMatchClick }: DrawBracketProps) {
  const { roundRobinGroups = [] } = draw

  return (
    <div className="space-y-8">
      {/* Knockout stage bracket (if generated) */}
      {(draw as any).knockoutStage?.matches?.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">Knockout Stage</h3>
            <SingleEliminationBracket
              draw={{
                ...draw,
                type: 'single_elimination',
                matches: (draw as any).knockoutStage.matches,
                numberOfRounds: (draw as any).knockoutStage.numberOfRounds
              }}
              onMatchClick={onMatchClick}
            />
          </CardContent>
        </Card>
      )}

      {roundRobinGroups.map((group) => (
        <Card key={group.groupName}>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">{group.groupName}</h3>
            <RoundRobinCrossTable group={group} onMatchClick={onMatchClick} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
