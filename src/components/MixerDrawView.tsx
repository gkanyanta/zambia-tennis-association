import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Users } from 'lucide-react'

interface MixerCourt {
  _id?: string
  courtNumber: number
  pair1A: { playerId: string; playerName: string }
  pair1B: { playerId: string; playerName: string }
  pair2A: { playerId: string; playerName: string }
  pair2B: { playerId: string; playerName: string }
  pair1GamesWon: number | null
  pair2GamesWon: number | null
  status: string
}

interface MixerRound {
  roundNumber: number
  courts: MixerCourt[]
}

interface MixerStanding {
  playerId: string
  playerName: string
  gender: string
  rating: string
  roundsPlayed: number
  totalGamesWon: number
  totalGamesLost: number
}

interface MixerDrawViewProps {
  rounds: MixerRound[]
  standings: MixerStanding[]
  finalized?: boolean
  finalStandings?: {
    overallWinner?: { id: string; name: string; gamesWon: number }
    ladiesWinner?: { id: string; name: string; gamesWon: number }
  }
  onCourtResult?: (roundNumber: number, courtNumber: number, pair1GamesWon: number, pair2GamesWon: number) => Promise<void>
}

export function MixerDrawView({ rounds, standings, finalized, finalStandings, onCourtResult }: MixerDrawViewProps) {
  const [activeTab, setActiveTab] = useState<'overall' | 'ladies'>('overall')
  const [editingCourt, setEditingCourt] = useState<string | null>(null)
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)
  const [saving, setSaving] = useState(false)

  const handleSubmitScore = async (roundNumber: number, courtNumber: number) => {
    if (!onCourtResult) return
    if (p1Score + p2Score !== 4) return

    setSaving(true)
    try {
      await onCourtResult(roundNumber, courtNumber, p1Score, p2Score)
      setEditingCourt(null)
      setP1Score(0)
      setP2Score(0)
    } catch (error) {
      console.error('Error saving court result:', error)
    } finally {
      setSaving(false)
    }
  }

  const sortedStandings = [...standings].sort((a, b) => b.totalGamesWon - a.totalGamesWon)
  const ladiesStandings = sortedStandings.filter(s => s.gender === 'female')

  return (
    <div className="space-y-6">
      {/* Final standings if finalized */}
      {finalized && finalStandings && (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Final Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finalStandings.overallWinner && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Winner</div>
                    <div className="font-bold text-lg">{finalStandings.overallWinner.name}</div>
                    <div className="text-sm text-muted-foreground">{finalStandings.overallWinner.gamesWon} games won</div>
                  </div>
                </div>
              )}
              {finalStandings.ladiesWinner && (
                <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg border border-pink-200">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Ladies Winner</div>
                    <div className="font-bold text-lg">{finalStandings.ladiesWinner.name}</div>
                    <div className="text-sm text-muted-foreground">{finalStandings.ladiesWinner.gamesWon} games won</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rounds */}
      {rounds.map(round => (
        <Card key={round.roundNumber}>
          <CardHeader>
            <CardTitle className="text-lg">Round {round.roundNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {round.courts.map(court => {
                const courtKey = `${round.roundNumber}-${court.courtNumber}`
                const isEditing = editingCourt === courtKey
                const isCompleted = court.status === 'completed'

                return (
                  <div
                    key={court.courtNumber}
                    className={`p-4 border rounded-lg ${isCompleted ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">Court {court.courtNumber}</Badge>
                      {isCompleted && court.pair1GamesWon !== null && court.pair2GamesWon !== null && (
                        <Badge variant="default" className="bg-green-600">
                          {court.pair1GamesWon} - {court.pair2GamesWon}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      {/* Pair 1 */}
                      <div className={`text-sm ${isCompleted && court.pair1GamesWon !== null && court.pair2GamesWon !== null && court.pair1GamesWon > court.pair2GamesWon ? 'font-bold' : ''}`}>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">A</Badge>
                          <span>{court.pair1A.playerName}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">B</Badge>
                          <span>{court.pair1B.playerName}</span>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground font-medium">vs</div>

                      {/* Pair 2 */}
                      <div className={`text-sm text-right ${isCompleted && court.pair1GamesWon !== null && court.pair2GamesWon !== null && court.pair2GamesWon > court.pair1GamesWon ? 'font-bold' : ''}`}>
                        <div className="flex items-center gap-1 justify-end">
                          <span>{court.pair2A.playerName}</span>
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">A</Badge>
                        </div>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <span>{court.pair2B.playerName}</span>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">B</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Score entry */}
                    {onCourtResult && !finalized && (
                      <div className="mt-3 pt-3 border-t">
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground">Pair 1:</label>
                              <select
                                className="border rounded p-1 text-sm w-16"
                                value={p1Score}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  setP1Score(v)
                                  setP2Score(4 - v)
                                }}
                              >
                                {[0, 1, 2, 3, 4].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground">Pair 2:</label>
                              <select
                                className="border rounded p-1 text-sm w-16"
                                value={p2Score}
                                onChange={(e) => {
                                  const v = Number(e.target.value)
                                  setP2Score(v)
                                  setP1Score(4 - v)
                                }}
                              >
                                {[0, 1, 2, 3, 4].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitScore(round.roundNumber, court.courtNumber)}
                              disabled={saving || p1Score + p2Score !== 4}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCourt(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCourt(courtKey)
                              setP1Score(court.pair1GamesWon ?? 0)
                              setP2Score(court.pair2GamesWon ?? 0)
                            }}
                          >
                            {isCompleted ? 'Edit Score' : 'Enter Score'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Leaderboard */}
      {standings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={activeTab === 'overall' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overall')}
              >
                Overall
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'ladies' ? 'default' : 'outline'}
                onClick={() => setActiveTab('ladies')}
              >
                Ladies
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-center">Rating</th>
                    <th className="px-4 py-3 text-center">Rounds</th>
                    <th className="px-4 py-3 text-center">Won</th>
                    <th className="px-4 py-3 text-center">Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(activeTab === 'overall' ? sortedStandings : ladiesStandings).map((standing, index) => (
                    <tr key={standing.playerId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-bold text-muted-foreground">{index + 1}</span>
                        {index === 0 && standing.totalGamesWon > 0 && (
                          <span className="ml-1">🏆</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{standing.playerName}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={standing.rating === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}
                        >
                          {standing.rating}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">{standing.roundsPlayed}</td>
                      <td className="px-4 py-3 text-center font-bold">{standing.totalGamesWon}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{standing.totalGamesLost}</td>
                    </tr>
                  ))}
                  {(activeTab === 'ladies' ? ladiesStandings : sortedStandings).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {activeTab === 'ladies' ? 'No female players in this draw' : 'No standings yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
