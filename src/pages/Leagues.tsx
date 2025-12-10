import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trophy, Calendar, MapPin, Edit, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  fetchLeagues,
  fetchLeagueStandings,
  fetchLeagueFixtures,
  updateFixtureResult,
  League,
  LeagueStanding,
  LeagueFixture,
  MatchResult
} from '@/services/leagueService'

type Region = 'northern' | 'southern'
type Gender = 'men' | 'women'
type TabType = 'standings' | 'fixtures' | 'results'

export function Leagues() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedRegion, setSelectedRegion] = useState<Region>('northern')
  const [selectedGender, setSelectedGender] = useState<Gender>('men')
  const [activeTab, setActiveTab] = useState<TabType>('standings')
  const [editingFixture, setEditingFixture] = useState<string | null>(null)
  const [scores, setScores] = useState<{ [key: string]: { homeScore: number; awayScore: number } }>({})

  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [standings, setStandings] = useState<LeagueStanding[]>([])
  const [fixtures, setFixtures] = useState<LeagueFixture[]>([])
  const [loading, setLoading] = useState(false)
  const [savingScores, setSavingScores] = useState(false)

  // Fetch leagues on mount and when region/gender changes
  useEffect(() => {
    loadLeagues()
  }, [selectedRegion, selectedGender])

  // Fetch standings when league changes
  useEffect(() => {
    if (currentLeague && activeTab === 'standings') {
      loadStandings()
    }
  }, [currentLeague, activeTab])

  // Fetch fixtures when league changes
  useEffect(() => {
    if (currentLeague && (activeTab === 'fixtures' || activeTab === 'results')) {
      loadFixtures()
    }
  }, [currentLeague, activeTab])

  const loadLeagues = async () => {
    setLoading(true)
    try {
      const response = await fetchLeagues({
        region: selectedRegion,
        gender: selectedGender,
        status: 'active'
      })

      // Set the first active league as current
      if (response.data.length > 0) {
        setCurrentLeague(response.data[0])
      } else {
        setCurrentLeague(null)
        setStandings([])
        setFixtures([])
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load leagues',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStandings = async () => {
    if (!currentLeague) return
    setLoading(true)
    try {
      const response = await fetchLeagueStandings(currentLeague._id)
      setStandings(response.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load standings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFixtures = async () => {
    if (!currentLeague) return
    setLoading(true)
    try {
      const status = activeTab === 'fixtures' ? 'scheduled' : 'completed'
      const response = await fetchLeagueFixtures(currentLeague._id, { status })
      setFixtures(response.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load fixtures',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleScoreChange = (fixtureId: string, matchType: string, team: 'home' | 'away', value: string) => {
    const key = `${fixtureId}-${matchType}`
    let numValue = parseInt(value) || 0

    // Validate score range (best of 3 sets: 0-3)
    if (numValue < 0) numValue = 0
    if (numValue > 3) numValue = 3

    setScores(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { homeScore: 0, awayScore: 0 }),
        [team === 'home' ? 'homeScore' : 'awayScore']: numValue,
      }
    }))
  }

  const getMatchTypesForFormat = (format: string) => {
    switch (format) {
      case '2singles_1doubles':
        return ['singles1', 'singles2', 'doubles']
      case '3singles_2doubles':
        return ['singles1', 'singles2', 'singles3', 'doubles', 'doubles2']
      default:
        return ['singles1', 'singles2', 'doubles']
    }
  }

  const getMatchLabel = (matchType: string) => {
    const labels: { [key: string]: string } = {
      singles1: 'Singles Match 1',
      singles2: 'Singles Match 2',
      singles3: 'Singles Match 3',
      doubles: 'Doubles Match',
      doubles2: 'Doubles Match 2'
    }
    return labels[matchType] || matchType
  }

  const handleSaveScores = async (fixture: LeagueFixture) => {
    if (!currentLeague) return

    // Get the match types for this league's format
    const matchTypes = getMatchTypesForFormat(currentLeague.settings.matchFormat)

    // Validate that all scores are entered
    const hasAllScores = matchTypes.every(matchType => {
      const key = `${fixture._id}-${matchType}`
      const score = scores[key]
      return score && (score.homeScore !== undefined && score.awayScore !== undefined)
    })

    if (!hasAllScores) {
      toast({
        title: 'Validation Error',
        description: 'Please enter scores for all matches',
        variant: 'destructive'
      })
      return
    }

    setSavingScores(true)
    try {
      // Build matches array from scores based on league format
      const matches: MatchResult[] = matchTypes.map(matchType => ({
        matchType: matchType as any,
        homeScore: scores[`${fixture._id}-${matchType}`]?.homeScore || 0,
        awayScore: scores[`${fixture._id}-${matchType}`]?.awayScore || 0
      }))

      await updateFixtureResult(currentLeague._id, fixture._id, {
        matches,
        status: 'completed'
      })

      toast({
        title: 'Success',
        description: 'Match scores saved successfully'
      })

      setEditingFixture(null)
      setScores({})

      // Reload fixtures
      loadFixtures()

      // Reload standings if on standings tab
      if (activeTab === 'standings') {
        loadStandings()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save scores',
        variant: 'destructive'
      })
    } finally {
      setSavingScores(false)
    }
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

  if (loading && !currentLeague) {
    return (
      <div className="flex flex-col">
        <Hero
          title="League Management"
          description="Regional tennis leagues - Northern Region (Copperbelt) and Southern Region (Midlands)"
          gradient
        />
        <section className="py-16">
          <div className="container-custom flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </section>
      </div>
    )
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

          {!currentLeague ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active league found for {selectedRegion} region - {selectedGender === 'men' ? "Men's" : "Women's"} division.
              </CardContent>
            </Card>
          ) : (
            <>
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

              {/* Standings Table */}
              {activeTab === 'standings' && (
                <Card>
                  <CardHeader>
                    <CardTitle>League Table</CardTitle>
                    <CardDescription>
                      {currentLeague.name} - {currentLeague.season} {currentLeague.year}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : standings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No standings data available yet.
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="border-b bg-muted/50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Pos</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">P</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">W</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">D</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">L</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">MF</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">MA</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">MD</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Pts</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {standings.map((standing, index) => (
                                <tr key={standing.team._id} className="hover:bg-muted/50">
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
                                  <td className="px-4 py-3 text-center">{standing.drawn}</td>
                                  <td className="px-4 py-3 text-center text-destructive">{standing.lost}</td>
                                  <td className="px-4 py-3 text-center">{standing.matchesFor}</td>
                                  <td className="px-4 py-3 text-center">{standing.matchesAgainst}</td>
                                  <td className="px-4 py-3 text-center font-medium">
                                    {standing.matchesDifference > 0 ? '+' : ''}{standing.matchesDifference}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold">{standing.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          <p className="mb-1"><strong>Legend:</strong> P - Played, W - Won, D - Drawn, L - Lost, MF - Matches For, MA - Matches Against, MD - Match Difference, Pts - Points</p>
                          <p>Points: Win = {currentLeague.settings.pointsForWin} points, Draw = {currentLeague.settings.pointsForDraw} point(s), Loss = {currentLeague.settings.pointsForLoss} points</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Fixtures */}
              {activeTab === 'fixtures' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : fixtures.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No upcoming fixtures scheduled.
                      </CardContent>
                    </Card>
                  ) : (
                    fixtures.map((fixture) => (
                      <Card key={fixture._id} className="card-elevated">
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
                                  {new Date(fixture.scheduledDate).toLocaleDateString('en-US', {
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
                              {fixture.status === 'scheduled' || fixture.status === 'in_progress' ? (
                                <Button
                                  variant="outline"
                                  onClick={() => navigate(`/leagues/${currentLeague?._id}/fixtures/${fixture._id}/score`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {fixture.status === 'in_progress' ? 'Continue Scoring' : 'Enter Scores'}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => navigate(`/leagues/${currentLeague?._id}/fixtures/${fixture._id}/score`)}
                                >
                                  <Trophy className="h-4 w-4 mr-2" />
                                  View Results
                                </Button>
                              )}
                              {fixture.overallScore && (fixture.overallScore.homeWins > 0 || fixture.overallScore.awayWins > 0) && (
                                <div className="text-center text-sm font-semibold text-primary">
                                  {fixture.overallScore.homeWins} - {fixture.overallScore.awayWins}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Remove old inline score entry form */}
                          {false && editingFixture === fixture._id && currentLeague && (
                            <div className="mt-6 pt-6 border-t">
                              <h4 className="font-semibold mb-4">Enter Match Scores</h4>
                              <div className="text-sm text-muted-foreground mb-4">
                                Format: {currentLeague.settings.matchFormat === '2singles_1doubles' ? '2 Singles + 1 Doubles' : '3 Singles + 2 Doubles'}
                              </div>
                              <div className="space-y-4">
                                {getMatchTypesForFormat(currentLeague.settings.matchFormat).map((matchType) => (
                                  <div key={matchType} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="font-medium">{getMatchLabel(matchType)}</div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        value={scores[`${fixture._id}-${matchType}`]?.homeScore ?? ''}
                                        onChange={(e) => handleScoreChange(fixture._id, matchType, 'home', e.target.value)}
                                      />
                                      <span>-</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="3"
                                        placeholder="0"
                                        className="w-20"
                                        value={scores[`${fixture._id}-${matchType}`]?.awayScore ?? ''}
                                        onChange={(e) => handleScoreChange(fixture._id, matchType, 'away', e.target.value)}
                                      />
                                    </div>
                                    <div className="text-sm text-muted-foreground">Best of 3 sets</div>
                                  </div>
                                ))}

                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => handleSaveScores(fixture)} disabled={savingScores}>
                                    {savingScores && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Scores
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingFixture(null)
                                      // Clear scores for this fixture
                                      const updatedScores = { ...scores }
                                      getMatchTypesForFormat(currentLeague.settings.matchFormat).forEach(mt => {
                                        delete updatedScores[`${fixture._id}-${mt}`]
                                      })
                                      setScores(updatedScores)
                                    }}
                                    disabled={savingScores}
                                  >
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
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : fixtures.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No completed matches yet.
                      </CardContent>
                    </Card>
                  ) : (
                    fixtures.map((fixture) => {
                      const score = getMatchScore(fixture.matches)
                      return (
                        <Card key={fixture._id} className="card-elevated">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Badge>Round {fixture.round}</Badge>
                              <Badge variant="secondary">Completed</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(fixture.scheduledDate).toLocaleDateString('en-US', {
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

                            {fixture.matches && fixture.matches.length > 0 && (
                              <div className="border-t pt-4">
                                <h5 className="font-semibold mb-3 text-sm">Match Details</h5>
                                <div className="space-y-2 text-sm">
                                  {fixture.matches.map((result, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded">
                                      <span className="font-medium">
                                        {result.matchType === 'singles1' && 'Singles 1'}
                                        {result.matchType === 'singles2' && 'Singles 2'}
                                        {result.matchType === 'singles3' && 'Singles 3'}
                                        {result.matchType === 'doubles' && 'Doubles'}
                                        {result.matchType === 'doubles2' && 'Doubles 2'}
                                      </span>
                                      <span className="font-semibold">
                                        {result.homeScore} - {result.awayScore}
                                      </span>
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
