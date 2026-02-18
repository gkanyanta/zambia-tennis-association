import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Calendar, MapPin, Edit, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import {
  fetchLeagues,
  fetchLeagueStandings,
  fetchLeagueTies,
  fetchPlayoffBracket,
  registerForLeague,
  League,
  LeagueStanding,
  Tie,
  MATCH_FORMATS
} from '@/services/leagueService'

type Region = 'northern' | 'southern'
type Gender = 'men' | 'women'
type TabType = 'standings' | 'fixtures' | 'results' | 'playoffs'

export function Leagues() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, isAdmin } = useAuth()
  const canScore = isAdmin || user?.role === 'club_official'
  const isClubOfficial = user?.role === 'club_official'
  const [selectedRegion, setSelectedRegion] = useState<Region>('northern')
  const [selectedGender, setSelectedGender] = useState<Gender>('men')
  const [activeTab, setActiveTab] = useState<TabType>('standings')

  const [currentLeague, setCurrentLeague] = useState<League | null>(null)
  const [standings, setStandings] = useState<LeagueStanding[]>([])
  const [ties, setTies] = useState<Tie[]>([])
  const [playoffTies, setPlayoffTies] = useState<Tie[]>([])
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => { loadLeagues() }, [selectedRegion, selectedGender])
  useEffect(() => { if (currentLeague && activeTab === 'standings') loadStandings() }, [currentLeague, activeTab])
  useEffect(() => { if (currentLeague && (activeTab === 'fixtures' || activeTab === 'results')) loadTies() }, [currentLeague, activeTab])
  useEffect(() => { if (currentLeague && activeTab === 'playoffs') loadPlayoffs() }, [currentLeague, activeTab])

  const loadLeagues = async () => {
    setLoading(true)
    try {
      // Try active first, then upcoming
      let response = await fetchLeagues({ region: selectedRegion, gender: selectedGender, status: 'active' })
      if (response.data.length === 0) {
        response = await fetchLeagues({ region: selectedRegion, gender: selectedGender, status: 'upcoming' })
      }
      if (response.data.length > 0) {
        setCurrentLeague(response.data[0])
      } else {
        setCurrentLeague(null)
        setStandings([])
        setTies([])
        setPlayoffTies([])
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to load leagues', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadPlayoffs = async () => {
    if (!currentLeague) return
    setLoading(true)
    try {
      const response = await fetchPlayoffBracket(currentLeague._id)
      setPlayoffTies(response.data)
    } catch (error: any) {
      setPlayoffTies([])
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!currentLeague) return
    setRegistering(true)
    try {
      await registerForLeague(currentLeague._id)
      toast({ title: 'Registration Submitted', description: 'Your club registration is pending admin approval.' })
    } catch (error: any) {
      toast({ title: 'Registration Failed', description: error.response?.data?.error || 'Failed to register', variant: 'destructive' })
    } finally {
      setRegistering(false)
    }
  }

  const loadStandings = async () => {
    if (!currentLeague) return
    setLoading(true)
    try {
      const response = await fetchLeagueStandings(currentLeague._id)
      setStandings(response.data)
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to load standings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadTies = async () => {
    if (!currentLeague) return
    setLoading(true)
    try {
      const status = activeTab === 'fixtures' ? 'scheduled' : 'completed'
      const response = await fetchLeagueTies(currentLeague._id, { status })
      setTies(response.data)
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Failed to load ties', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getRubberLabel = (type: string) => {
    const format = currentLeague?.settings?.matchFormat || '2s1d'
    const defs = MATCH_FORMATS[format] || MATCH_FORMATS['2s1d']
    const def = defs.find(d => d.type === type)
    return def?.label || type
  }

  const formatSetScore = (rubber: Tie['rubbers'][0]) => {
    if (!rubber.sets || rubber.sets.length === 0) return ''
    return rubber.sets.map(s => {
      let score = `${s.homeGames}-${s.awayGames}`
      if (s.tiebreak?.played) {
        const loserTB = Math.min(s.tiebreak.homePoints || 0, s.tiebreak.awayPoints || 0)
        score += `(${loserTB})`
      }
      return score
    }).join(', ')
  }

  if (loading && !currentLeague) {
    return (
      <div className="flex flex-col">
        <Hero title="ZTA League" description="Regional tennis leagues - Northern & Southern Regions" gradient />
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
      <Hero title="ZTA League" description="Regional tennis leagues - Northern & Southern Regions" gradient />

      <section className="py-16">
        <div className="container-custom">
          {/* Region/Gender Selection */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex gap-2">
              <Button variant={selectedRegion === 'northern' ? 'default' : 'outline'} onClick={() => setSelectedRegion('northern')}>
                Northern Region
              </Button>
              <Button variant={selectedRegion === 'southern' ? 'default' : 'outline'} onClick={() => setSelectedRegion('southern')}>
                Southern Region
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant={selectedGender === 'men' ? 'default' : 'outline'} onClick={() => setSelectedGender('men')}>
                Men's League
              </Button>
              <Button variant={selectedGender === 'women' ? 'default' : 'outline'} onClick={() => setSelectedGender('women')}>
                Women's League
              </Button>
            </div>
          </div>

          {!currentLeague ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No league found for {selectedRegion} region - {selectedGender === 'men' ? "Men's" : "Women's"} division.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Registration banner for upcoming leagues */}
              {currentLeague.status === 'upcoming' && isClubOfficial && (
                <Card className="mb-6 border-primary/30 bg-primary/5">
                  <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{currentLeague.name} - Registration Open</h3>
                      <p className="text-sm text-muted-foreground">Register your club for this league. Admin approval required.</p>
                    </div>
                    <Button onClick={handleRegister} disabled={registering}>
                      {registering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Register Club
                    </Button>
                  </CardContent>
                </Card>
              )}

              {currentLeague.status === 'upcoming' && !isClubOfficial && (
                <Card className="mb-6">
                  <CardContent className="py-4 text-center text-muted-foreground">
                    <p className="font-medium">{currentLeague.name} - Registration Open</p>
                    <p className="text-sm">Club officials can register their clubs for this league.</p>
                  </CardContent>
                </Card>
              )}

              {/* Tab Navigation */}
              <div className="flex gap-2 mb-8 border-b">
                {(['standings', 'fixtures', 'results', 'playoffs'] as TabType[]).map(tab => (
                  <button
                    key={tab}
                    className={`px-4 py-2 font-medium capitalize transition-colors ${
                      activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Standings Table */}
              {activeTab === 'standings' && (
                <Card>
                  <CardHeader>
                    <CardTitle>League Table</CardTitle>
                    <CardDescription>{currentLeague.name} - {currentLeague.season} {currentLeague.year}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : standings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No standings data available yet.</div>
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
                                <th className="px-4 py-3 text-center text-sm font-semibold">RF</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">RA</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">RD</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Pts</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {standings.map((s, i) => (
                                <tr key={s.team._id} className="hover:bg-muted/50">
                                  <td className="px-4 py-3 text-center font-medium">
                                    {i === 0 && <Trophy className="inline h-4 w-4 text-primary mr-1" />}
                                    {i + 1}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium">{s.team.name}</div>
                                    <div className="text-sm text-muted-foreground">{s.team.city}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">{s.played}</td>
                                  <td className="px-4 py-3 text-center text-primary font-medium">{s.won}</td>
                                  <td className="px-4 py-3 text-center">{s.drawn}</td>
                                  <td className="px-4 py-3 text-center text-destructive">{s.lost}</td>
                                  <td className="px-4 py-3 text-center">{s.rubbersFor}</td>
                                  <td className="px-4 py-3 text-center">{s.rubbersAgainst}</td>
                                  <td className="px-4 py-3 text-center font-medium">
                                    {(s.rubbersFor - s.rubbersAgainst) > 0 ? '+' : ''}{s.rubbersFor - s.rubbersAgainst}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold">{s.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          <p className="mb-1"><strong>Legend:</strong> P - Played, W - Won, D - Drawn, L - Lost, RF - Rubbers For, RA - Rubbers Against, RD - Rubber Difference, Pts - Points</p>
                          <p><strong>Tiebreakers:</strong> Points, Head-to-head, Rubber diff, Set diff, Game diff</p>
                          <p>Win = {currentLeague.settings.pointsForWin}pts, Draw = {currentLeague.settings.pointsForDraw}pt(s), Loss = {currentLeague.settings.pointsForLoss}pts</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Ties (Fixtures) */}
              {activeTab === 'fixtures' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : ties.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">No upcoming fixtures scheduled.</CardContent></Card>
                  ) : (
                    ties.map(tie => (
                      <Card key={tie._id} className="card-elevated">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge>Round {tie.round}</Badge>
                                <Badge variant="outline">{tie.status}</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 items-center">
                                <div className="text-right">
                                  <div className="font-semibold text-lg">{tie.homeTeam.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {[tie.homeTeam.city, tie.homeTeam.province].filter(Boolean).join(', ') || 'Location not specified'}
                                  </div>
                                </div>
                                <div className="text-center font-bold text-2xl text-muted-foreground">vs</div>
                                <div className="text-left">
                                  <div className="font-semibold text-lg">{tie.awayTeam.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {[tie.awayTeam.city, tie.awayTeam.province].filter(Boolean).join(', ') || 'Location not specified'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(tie.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {tie.venue}
                                </div>
                              </div>
                            </div>
                            {canScore && (
                              <Button variant="outline" onClick={() => navigate(`/leagues/${currentLeague?._id}/ties/${tie._id}/score`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Enter Scores
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Completed Results */}
              {activeTab === 'results' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : ties.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">No completed matches yet.</CardContent></Card>
                  ) : (
                    ties.map(tie => (
                      <Card key={tie._id} className="card-elevated">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Badge>Round {tie.round}</Badge>
                            <Badge variant="secondary">Completed</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(tie.scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-4 items-center mb-6">
                            <div className="text-right">
                              <div className="font-semibold text-lg">{tie.homeTeam.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {[tie.homeTeam.city, tie.homeTeam.province].filter(Boolean).join(', ') || 'Location not specified'}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold">{tie.score.home} - {tie.score.away}</div>
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-lg">{tie.awayTeam.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {[tie.awayTeam.city, tie.awayTeam.province].filter(Boolean).join(', ') || 'Location not specified'}
                              </div>
                            </div>
                          </div>

                          {tie.rubbers && tie.rubbers.length > 0 && (
                            <div className="border-t pt-4">
                              <h5 className="font-semibold mb-3 text-sm">Rubber Details</h5>
                              <div className="space-y-2 text-sm">
                                {tie.rubbers.map((rubber, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded">
                                    <span className="font-medium">{getRubberLabel(rubber.type)}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-muted-foreground">{formatSetScore(rubber)}</span>
                                      <Badge variant={rubber.winner === 'home' ? 'default' : rubber.winner === 'away' ? 'secondary' : 'outline'} className="text-xs">
                                        {rubber.winner === 'home' ? 'H' : rubber.winner === 'away' ? 'A' : '-'}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Playoffs */}
              {activeTab === 'playoffs' && (
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : playoffTies.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Playoffs have not been generated yet. Top 2 teams from each region will qualify.</CardContent></Card>
                  ) : (
                    <>
                      <CardHeader className="px-0">
                        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> National Championship Playoffs</CardTitle>
                        <CardDescription>Top 2 from each region compete for the national title</CardDescription>
                      </CardHeader>
                      {playoffTies.map(tie => (
                        <Card key={tie._id} className="card-elevated border-primary/20">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Badge variant="default">{tie.roundName}</Badge>
                              <Badge variant={tie.status === 'completed' ? 'secondary' : 'outline'}>{tie.status}</Badge>
                              {tie.notes && <span className="text-xs text-muted-foreground">{tie.notes}</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-4 items-center">
                              <div className="text-right">
                                <div className="font-semibold text-lg">{tie.homeTeam.name}</div>
                              </div>
                              <div className="text-center">
                                {tie.status === 'completed' ? (
                                  <div className="text-3xl font-bold">{tie.score.home} - {tie.score.away}</div>
                                ) : (
                                  <div className="text-2xl font-bold text-muted-foreground">vs</div>
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-lg">{tie.awayTeam.name}</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(tie.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {tie.venue}
                              </div>
                            </div>
                            {canScore && tie.status === 'scheduled' && (
                              <div className="mt-4">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/leagues/${currentLeague?._id}/ties/${tie._id}/score`)}>
                                  <Edit className="h-4 w-4 mr-2" /> Enter Scores
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </>
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
