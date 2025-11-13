import { useState } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trophy, Calendar, MapPin, Edit, Plus } from 'lucide-react'
import { getLeague } from '@/data/leagueData'
import type { Region, Gender, MatchResult } from '@/types/league'

export function Leagues() {
  const [selectedRegion, setSelectedRegion] = useState<Region>('northern')
  const [selectedGender, setSelectedGender] = useState<Gender>('men')
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'results'>('standings')
  const [editingFixture, setEditingFixture] = useState<number | null>(null)
  const [scores, setScores] = useState<{ [key: string]: { homeScore: number; awayScore: number } }>({})

  const league = getLeague(selectedRegion, selectedGender)

  const handleScoreChange = (fixtureId: number, matchType: string, team: 'home' | 'away', value: string) => {
    const key = `${fixtureId}-${matchType}`
    const numValue = parseInt(value) || 0
    setScores(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { homeScore: 0, awayScore: 0 }),
        [team === 'home' ? 'homeScore' : 'awayScore']: numValue,
      }
    }))
  }

  const handleSaveScores = (fixtureId: number) => {
    console.log('Saving scores for fixture:', fixtureId, scores)
    alert('Scores saved successfully! (In production, this would update the database)')
    setEditingFixture(null)
  }

  const getMatchScore = (results: MatchResult[]) => {
    let homeWins = 0
    let awayWins = 0
    results.forEach(result => {
      if (result.homeScore > result.awayScore) homeWins++
      else if (result.awayScore > result.homeScore) awayWins++
    })
    return { homeWins, awayWins }
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="League Management"
        description="Regional tennis leagues - Northern Region (Copperbelt) and Southern Region (Midlands)"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Region Selection */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <Button
                variant={selectedRegion === 'northern' ? 'default' : 'outline'}
                onClick={() => setSelectedRegion('northern')}
              >
                Northern Region
              </Button>
              <Button
                variant={selectedRegion === 'southern' ? 'default' : 'outline'}
                onClick={() => setSelectedRegion('southern')}
              >
                Southern Region
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedGender === 'men' ? 'default' : 'outline'}
                onClick={() => setSelectedGender('men')}
              >
                Men's League
              </Button>
              <Button
                variant={selectedGender === 'women' ? 'default' : 'outline'}
                onClick={() => setSelectedGender('women')}
              >
                Women's League
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 border-b">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'standings'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('standings')}
            >
              Standings
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'fixtures'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('fixtures')}
            >
              Fixtures
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'results'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          </div>

          {/* League Content */}
          {league && (
            <>
              {/* Standings Table */}
              {activeTab === 'standings' && (
                <Card>
                  <CardHeader>
                    <CardTitle>League Table</CardTitle>
                    <CardDescription>
                      {selectedRegion === 'northern' ? 'Northern Region (Copperbelt)' : 'Southern Region (Midlands)'} - {selectedGender === 'men' ? "Men's" : "Women's"} League
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Pos</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">P</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">W</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">L</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">MF</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">MA</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {league.standings.map((standing, index) => (
                            <tr key={standing.team.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-center font-medium">
                                {index === 0 && <Trophy className="inline h-4 w-4 text-primary mr-1" />}
                                {index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <div className="font-medium">{standing.team.name}</div>
                                  <div className="text-sm text-muted-foreground">{standing.team.city}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">{standing.played}</td>
                              <td className="px-4 py-3 text-center text-primary font-medium">{standing.won}</td>
                              <td className="px-4 py-3 text-center text-destructive">{standing.lost}</td>
                              <td className="px-4 py-3 text-center">{standing.matchesFor}</td>
                              <td className="px-4 py-3 text-center">{standing.matchesAgainst}</td>
                              <td className="px-4 py-3 text-center font-bold">{standing.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p className="mb-1"><strong>Legend:</strong> P - Played, W - Won, L - Lost, MF - Matches For, MA - Matches Against, Pts - Points</p>
                      <p>Points: Win = 3 points, Loss = 0 points</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fixtures */}
              {activeTab === 'fixtures' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Fixtures</h3>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Fixtures
                    </Button>
                  </div>

                  {league.fixtures.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No fixtures scheduled yet. Click "Generate Fixtures" to create the fixture list.
                      </CardContent>
                    </Card>
                  ) : (
                    league.fixtures
                      .filter(f => f.status === 'scheduled')
                      .map((fixture) => (
                        <Card key={fixture.id} className="card-elevated">
                          <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge>Round {fixture.round}</Badge>
                                  <Badge variant="outline">{fixture.status}</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                  <div className="text-right">
                                    <div className="font-semibold text-lg">{fixture.homeTeam.name}</div>
                                    <div className="text-sm text-muted-foreground">{fixture.homeTeam.city}</div>
                                  </div>
                                  <div className="text-center font-bold text-2xl text-muted-foreground">
                                    vs
                                  </div>
                                  <div className="text-left">
                                    <div className="font-semibold text-lg">{fixture.awayTeam.name}</div>
                                    <div className="text-sm text-muted-foreground">{fixture.awayTeam.city}</div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(fixture.date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {fixture.venue}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingFixture(fixture.id)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Enter Scores
                                </Button>
                              </div>
                            </div>

                            {/* Score Entry Form */}
                            {editingFixture === fixture.id && (
                              <div className="mt-6 pt-6 border-t">
                                <h4 className="font-semibold mb-4">Enter Match Scores</h4>
                                <div className="space-y-4">
                                  {/* Singles 1 */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="font-medium">Singles Match 1</div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        onChange={(e) => handleScoreChange(fixture.id, 'singles1', 'home', e.target.value)}
                                      />
                                      <span>-</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        onChange={(e) => handleScoreChange(fixture.id, 'singles1', 'away', e.target.value)}
                                      />
                                    </div>
                                    <div className="text-sm text-muted-foreground">Best of 3 sets</div>
                                  </div>

                                  {/* Singles 2 */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="font-medium">Singles Match 2</div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        onChange={(e) => handleScoreChange(fixture.id, 'singles2', 'home', e.target.value)}
                                      />
                                      <span>-</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        onChange={(e) => handleScoreChange(fixture.id, 'singles2', 'away', e.target.value)}
                                      />
                                    </div>
                                    <div className="text-sm text-muted-foreground">Best of 3 sets</div>
                                  </div>

                                  {/* Doubles */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="font-medium">Doubles Match</div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        onChange={(e) => handleScoreChange(fixture.id, 'doubles', 'home', e.target.value)}
                                      />
                                      <span>-</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        onChange={(e) => handleScoreChange(fixture.id, 'doubles', 'away', e.target.value)}
                                      />
                                    </div>
                                    <div className="text-sm text-muted-foreground">Best of 3 sets</div>
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    <Button onClick={() => handleSaveScores(fixture.id)}>
                                      Save Scores
                                    </Button>
                                    <Button variant="outline" onClick={() => setEditingFixture(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              )}

              {/* Results */}
              {activeTab === 'results' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-6">Match Results</h3>

                  {league.fixtures.filter(f => f.status === 'completed').length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No completed matches yet.
                      </CardContent>
                    </Card>
                  ) : (
                    league.fixtures
                      .filter(f => f.status === 'completed')
                      .map((fixture) => {
                        const score = fixture.results ? getMatchScore(fixture.results) : { homeWins: 0, awayWins: 0 }
                        return (
                          <Card key={fixture.id} className="card-elevated">
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-3 mb-4">
                                <Badge>Round {fixture.round}</Badge>
                                <Badge variant="secondary">Completed</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(fixture.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-4 items-center mb-6">
                                <div className="text-right">
                                  <div className="font-semibold text-lg">{fixture.homeTeam.name}</div>
                                  <div className="text-sm text-muted-foreground">{fixture.homeTeam.city}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-3xl font-bold">
                                    {score.homeWins} - {score.awayWins}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-lg">{fixture.awayTeam.name}</div>
                                  <div className="text-sm text-muted-foreground">{fixture.awayTeam.city}</div>
                                </div>
                              </div>

                              {fixture.results && (
                                <div className="border-t pt-4">
                                  <h5 className="font-semibold mb-3 text-sm">Match Details</h5>
                                  <div className="space-y-2 text-sm">
                                    {fixture.results.map((result, idx) => (
                                      <div key={idx} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded">
                                        <span className="font-medium">
                                          {result.matchType === 'singles1' && 'Singles 1'}
                                          {result.matchType === 'singles2' && 'Singles 2'}
                                          {result.matchType === 'doubles' && 'Doubles'}
                                        </span>
                                        <span className="font-semibold">
                                          {result.homeScore} - {result.awayScore}
                                        </span>
                                        {result.homePlayer && result.awayPlayer && (
                                          <span className="text-muted-foreground text-xs">
                                            {result.homePlayer} vs {result.awayPlayer}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
