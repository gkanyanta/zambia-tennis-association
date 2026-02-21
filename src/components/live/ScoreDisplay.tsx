import { cn } from '@/lib/utils'
import type { MatchState } from '@/types/liveMatch'
import { getDisplayScore } from '@/utils/tennisScoring'

interface ScoreDisplayProps {
  matchState: MatchState
  player1Name: string
  player2Name: string
  player1Seed?: number
  player2Seed?: number
  compact?: boolean
}

export function ScoreDisplay({
  matchState,
  player1Name,
  player2Name,
  player1Seed,
  player2Seed,
  compact = false
}: ScoreDisplayProps) {
  const display = getDisplayScore(matchState)

  return (
    <div className={cn('font-mono', compact ? 'text-sm' : 'text-base')}>
      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="text-left font-normal pb-1">Player</th>
            {display.sets.map((_, i) => (
              <th key={i} className="text-center font-normal pb-1 w-8">
                S{i + 1}
              </th>
            ))}
            <th className="text-center font-normal pb-1 w-10">
              {display.currentGame.isTiebreak
                ? 'TB'
                : display.currentGame.isMatchTiebreak
                ? 'MTB'
                : 'Pts'}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Player 1 */}
          <tr className={cn(
            'border-b border-border/50',
            display.winner === 0 && 'font-bold'
          )}>
            <td className="py-1.5 pr-2">
              <div className="flex items-center gap-1.5">
                {display.server === 0 && display.status === 'in_progress' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Serving" />
                )}
                {display.server !== 0 && display.status === 'in_progress' && (
                  <span className="inline-block w-2 h-2 flex-shrink-0" />
                )}
                <span className={cn('truncate', compact ? 'max-w-[120px]' : 'max-w-[200px]')}>
                  {player1Name}
                </span>
                {player1Seed && (
                  <span className="text-xs text-muted-foreground">[{player1Seed}]</span>
                )}
              </div>
            </td>
            {display.sets.map((set, i) => {
              const isCurrentSet = i === display.sets.length - 1 && display.status === 'in_progress'
              return (
                <td key={i} className={cn(
                  'text-center py-1.5 w-8',
                  isCurrentSet && 'font-bold',
                  matchState.sets[i]?.winner === 0 && 'text-green-600 dark:text-green-400'
                )}>
                  {set[0]}
                  {matchState.sets[i]?.tiebreak && matchState.sets[i]?.winner === 1 && (
                    <sup className="text-[10px] ml-0.5">{matchState.sets[i].tiebreak![0]}</sup>
                  )}
                </td>
              )
            })}
            <td className={cn(
              'text-center py-1.5 w-10 font-bold',
              display.status === 'completed' && 'invisible'
            )}>
              {display.currentGame.display[0]}
            </td>
          </tr>

          {/* Player 2 */}
          <tr className={cn(display.winner === 1 && 'font-bold')}>
            <td className="py-1.5 pr-2">
              <div className="flex items-center gap-1.5">
                {display.server === 1 && display.status === 'in_progress' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Serving" />
                )}
                {display.server !== 1 && display.status === 'in_progress' && (
                  <span className="inline-block w-2 h-2 flex-shrink-0" />
                )}
                <span className={cn('truncate', compact ? 'max-w-[120px]' : 'max-w-[200px]')}>
                  {player2Name}
                </span>
                {player2Seed && (
                  <span className="text-xs text-muted-foreground">[{player2Seed}]</span>
                )}
              </div>
            </td>
            {display.sets.map((set, i) => {
              const isCurrentSet = i === display.sets.length - 1 && display.status === 'in_progress'
              return (
                <td key={i} className={cn(
                  'text-center py-1.5 w-8',
                  isCurrentSet && 'font-bold',
                  matchState.sets[i]?.winner === 1 && 'text-green-600 dark:text-green-400'
                )}>
                  {set[1]}
                  {matchState.sets[i]?.tiebreak && matchState.sets[i]?.winner === 0 && (
                    <sup className="text-[10px] ml-0.5">{matchState.sets[i].tiebreak![1]}</sup>
                  )}
                </td>
              )
            })}
            <td className={cn(
              'text-center py-1.5 w-10 font-bold',
              display.status === 'completed' && 'invisible'
            )}>
              {display.currentGame.display[1]}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
