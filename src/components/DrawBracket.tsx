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

function SingleEliminationBracket({ draw, onMatchClick }: DrawBracketProps) {
  const { matches, numberOfRounds = 0 } = draw

  // Group matches by round
  const matchesByRound: Match[][] = []
  for (let round = 1; round <= numberOfRounds; round++) {
    matchesByRound.push(matches.filter(m => m.round === round))
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {matchesByRound.map((roundMatches, roundIndex) => (
          <div key={roundIndex} className="flex flex-col justify-around min-w-[280px]">
            <h3 className="text-center font-bold mb-4 text-sm sticky top-0 bg-background z-10 py-2">
              {roundMatches[0]?.roundName || `Round ${roundIndex + 1}`}
            </h3>
            <div className="flex flex-col justify-around flex-1 gap-4">
              {roundMatches.map((match) => (
                <MatchCard
                  key={match.id}
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

function MatchCard({ match, onClick }: { match: Match; onClick?: () => void }) {
  const isClickable = match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye

  return (
    <Card
      className={`${isClickable ? 'cursor-pointer hover:border-primary' : ''} ${
        match.status === 'completed' ? 'bg-muted/50' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <PlayerLine
            player={match.player1}
            isWinner={match.winner === match.player1?.id}
            score={match.score}
          />
          <div className="border-t" />
          <PlayerLine
            player={match.player2}
            isWinner={match.winner === match.player2?.id}
            score={match.score}
          />
        </div>
        {match.status === 'completed' && match.score && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {match.score}
          </div>
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

function PlayerLine({
  player,
  isWinner,
  score
}: {
  player?: { id: string; name: string; seed?: number; isBye?: boolean }
  isWinner: boolean
  score?: string
}) {
  if (!player) {
    return (
      <div className="text-sm text-muted-foreground italic py-1">
        TBD
      </div>
    )
  }

  if (player.isBye) {
    return (
      <div className="text-sm text-muted-foreground italic py-1">
        BYE
      </div>
    )
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
                  <MatchCard
                    key={match.id}
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
