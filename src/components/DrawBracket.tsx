import { useRef, useEffect, useState, useCallback, useMemo, forwardRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Draw, Match } from '@/types/tournament'

interface DrawBracketProps {
  draw: Draw
  onMatchClick?: (match: Match) => void
}

export function DrawBracket({ draw, onMatchClick }: DrawBracketProps) {
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
  const isCompleted = match.status === 'completed'

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

function RoundRobinMatchCard({
  match,
  onClick,
}: {
  match: Match & { _id?: string }
  onClick?: () => void
}) {
  const isClickable =
    match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye

  return (
    <Card
      className={`${isClickable ? 'cursor-pointer hover:border-primary' : ''} ${
        match.status === 'completed' ? 'bg-muted/50' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <RoundRobinPlayerLine
            player={match.player1}
            isWinner={match.winner === match.player1?.id}
            score={match.score}
          />
          <div className="border-t" />
          <RoundRobinPlayerLine
            player={match.player2}
            isWinner={match.winner === match.player2?.id}
            score={match.score}
          />
        </div>
        {match.status === 'completed' && match.score && (
          <div className="mt-2 text-xs text-muted-foreground text-center">{match.score}</div>
        )}
        {match.court && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Court {match.court}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RoundRobinPlayerLine({
  player,
  isWinner,
  score,
}: {
  player?: { id: string; name: string; seed?: number; isBye?: boolean }
  isWinner: boolean
  score?: string
}) {
  if (!player) {
    return <div className="text-sm text-muted-foreground italic py-1">TBD</div>
  }

  if (player.isBye) {
    return <div className="text-sm text-muted-foreground italic py-1">BYE</div>
  }

  return (
    <div className={`flex items-center justify-between py-1 ${isWinner ? 'font-bold' : ''}`}>
      <div className="flex items-center gap-2">
        {player.seed && (
          <Badge variant="outline" className="text-xs px-1.5">
            {player.seed}
          </Badge>
        )}
        <span className="text-sm">{player.name}</span>
      </div>
      {isWinner && score && (
        <Badge variant="default" className="ml-2">
          W
        </Badge>
      )}
    </div>
  )
}

function RoundRobinView({ draw, onMatchClick }: DrawBracketProps) {
  const { roundRobinGroups = [] } = draw

  return (
    <div className="space-y-8">
      {roundRobinGroups.map((group) => (
        <Card key={group.groupName}>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">{group.groupName}</h3>

            {/* Players in group */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Players:</h4>
              <div className="flex flex-wrap gap-2">
                {group.players.map((player) => (
                  <Badge key={player.id} variant="outline">
                    {player.seed && `(${player.seed}) `}
                    {player.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Matches */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Matches:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.matches.map((match) => (
                  <RoundRobinMatchCard
                    key={(match as any)._id || match.id}
                    match={match}
                    onClick={() => onMatchClick?.(match)}
                  />
                ))}
              </div>
            </div>

            {/* Standings if available */}
            {group.standings && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Standings:</h4>
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2">Pos</th>
                      <th className="text-left py-2">Player</th>
                      <th className="text-center py-2">P</th>
                      <th className="text-center py-2">W</th>
                      <th className="text-center py-2">L</th>
                      <th className="text-center py-2">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((standing, index) => (
                      <tr key={standing.playerId} className="border-b">
                        <td className="py-2">{index + 1}</td>
                        <td className="py-2">{standing.playerName}</td>
                        <td className="text-center py-2">{standing.played}</td>
                        <td className="text-center py-2">{standing.won}</td>
                        <td className="text-center py-2">{standing.lost}</td>
                        <td className="text-center py-2 font-bold">{standing.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
