import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DrawBracket } from '@/components/DrawBracket'
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  DollarSign,
  ArrowLeft,
  Clock,
  Mail,
  Phone,
  CreditCard,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { tournamentService, Tournament } from '@/services/tournamentService'
import { lencoPaymentService } from '@/services/lencoPaymentService'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

export function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [payingEntryFee, setPayingEntryFee] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    if (id) {
      fetchTournament()
    }
  }, [id])

  const fetchTournament = async () => {
    try {
      setLoading(true)
      const data = await tournamentService.getTournament(id!)
      setTournament(data)
    } catch (err) {
      console.error('Failed to load tournament:', err)
      toast({
        title: 'Error',
        description: 'Failed to load tournament details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!isAuthenticated || !user) {
      navigate(`/login?redirect=/tournaments/${id}`)
      return
    }

    if (!selectedCategory) {
      toast({
        title: 'Category Required',
        description: 'Please select a category to register',
        variant: 'destructive'
      })
      return
    }

    try {
      setRegistering(true)
      // Use submitEntry which properly adds to category.entries
      const result = await tournamentService.submitEntry(id!, selectedCategory, (user as any)._id)

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        toast({
          title: 'Registration Successful',
          description: `Entry submitted. Note: ${result.warnings.join(', ')}`
        })
      } else {
        toast({
          title: 'Registration Successful',
          description: 'Your entry has been submitted and is pending approval'
        })
      }
      fetchTournament()
    } catch (err: any) {
      console.error('Registration failed:', err)
      const errorMessage = err.message || err.response?.data?.message || 'Failed to register. Please try again.'
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setRegistering(false)
    }
  }

  const handlePayEntryFee = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/tournaments/${id}`)
      return
    }

    try {
      setPayingEntryFee(true)

      // Initialize payment with Lenco
      const paymentData = await lencoPaymentService.initializeTournamentPayment(id!)

      // Launch Lenco widget
      await initializeLencoWidget({
        key: paymentData.publicKey,
        reference: paymentData.reference,
        email: paymentData.email,
        amount: paymentData.amount,
        currency: 'ZMW',
        channels: ['card', 'mobile-money'],
        onSuccess: (response) => {
          navigate(`/payment/verify?reference=${response.reference}&type=tournament`)
        },
        onClose: () => {
          setPayingEntryFee(false)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${paymentData.reference}&type=tournament&pending=true`)
        }
      })
    } catch (err: any) {
      console.error('Payment initialization failed:', err)
      toast({
        title: 'Payment Error',
        description: err.message || 'Failed to initialize payment. Please try again.',
        variant: 'destructive'
      })
      setPayingEntryFee(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'entries_open':
        return 'bg-blue-500'
      case 'ongoing':
      case 'in_progress':
        return 'bg-green-500'
      case 'completed':
        return 'bg-gray-500'
      case 'entries_closed':
        return 'bg-orange-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Loading..." description="Please wait" gradient />
        <section className="py-16">
          <div className="container-custom">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tournament details...</p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col">
        <Hero title="Not Found" description="Tournament not found" gradient />
        <section className="py-16">
          <div className="container-custom">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Tournament not found</p>
                <Button onClick={() => navigate('/tournaments')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tournaments
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero
        title={tournament.name}
        description={tournament.description}
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => navigate('/tournaments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="draws">
                Draws
                {tournament.categories?.some((c: any) => c.draw) && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {tournament.categories.filter((c: any) => c.draw).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Tournament Details</CardTitle>
                        <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                          {getStatusText(tournament.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <p className="font-medium">{new Date(tournament.startDate).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <p className="font-medium">{new Date(tournament.endDate).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Venue</p>
                            <p className="font-medium">{tournament.venue}</p>
                            <p className="text-sm text-muted-foreground">{tournament.city}, {tournament.province}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Entry Deadline</p>
                            <p className="font-medium">{new Date(tournament.entryDeadline).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Entry Fee</p>
                            <p className="font-medium">K{tournament.entryFee}</p>
                          </div>
                        </div>

                        {tournament.maxParticipants && (
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Max Participants</p>
                              <p className="font-medium">{tournament.maxParticipants}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {tournament.description && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-2">Description</p>
                          <p>{tournament.description}</p>
                        </div>
                      )}

                      {(tournament as any).rules && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-2">Rules</p>
                          <p className="whitespace-pre-wrap">{(tournament as any).rules}</p>
                        </div>
                      )}

                      {(tournament as any).prizes && (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-2">Prizes</p>
                          <p className="whitespace-pre-wrap">{(tournament as any).prizes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Categories */}
                  {tournament.categories && tournament.categories.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {tournament.categories.map((category) => (
                            <div
                              key={category._id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{category.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {category.type} • {category.gender}
                                  {category.ageGroup && ` • ${category.ageGroup}`}
                                  {' • '}{category.drawType.replace('_', ' ')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {(category as any).draw && (
                                  <Badge variant="secondary">Draw Generated</Badge>
                                )}
                                <div className="text-right">
                                  <p className="text-sm font-medium">{category.entryCount} / {category.maxEntries}</p>
                                  <p className="text-xs text-muted-foreground">Entries</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Registration Card */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-6">
                    <CardHeader>
                      <CardTitle>Register for Tournament</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(tournament.status === 'upcoming' || tournament.status === 'entries_open') ? (
                        <>
                          {tournament.categories && tournament.categories.length > 0 ? (
                            <>
                              {/* Public Registration Button - Always visible */}
                              {(tournament as any).allowPublicRegistration !== false && (
                                <div className="space-y-3 pb-4 border-b mb-4">
                                  <Button
                                    className="w-full"
                                    onClick={() => navigate(`/tournaments/${id}/register`)}
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Register Players
                                  </Button>
                                  <p className="text-xs text-muted-foreground text-center">
                                    Register one or multiple players • No login required
                                  </p>
                                </div>
                              )}

                              {/* Member Login Registration */}
                              {!isAuthenticated ? (
                                <div className="text-center py-4 space-y-4">
                                  <p className="text-sm text-muted-foreground">
                                    Already a member? Log in for quick registration
                                  </p>
                                  <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => navigate(`/login?redirect=/tournaments/${id}`)}
                                  >
                                    Log In to Register
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-medium mb-2">Quick Self-Registration</p>
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Select Category</label>
                                    <select
                                      className="w-full p-2 border rounded-md"
                                      value={selectedCategory}
                                      onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                      <option value="">-- Select a category --</option>
                                      {tournament.categories.map((category) => (
                                        <option key={category._id} value={category._id}>
                                          {category.name} ({category.entryCount}/{category.maxEntries})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={handleRegister}
                                    disabled={!selectedCategory || registering}
                                  >
                                    <Trophy className="h-4 w-4 mr-2" />
                                    {registering ? 'Submitting Entry...' : 'Submit My Entry'}
                                  </Button>

                                  {tournament.entryFee > 0 && (
                                    <Button
                                      className="w-full"
                                      variant="outline"
                                      onClick={handlePayEntryFee}
                                      disabled={payingEntryFee}
                                    >
                                      {payingEntryFee ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="h-4 w-4 mr-2" />
                                          Pay Entry Fee (K{tournament.entryFee})
                                        </>
                                      )}
                                    </Button>
                                  )}

                                  <p className="text-xs text-muted-foreground text-center">
                                    Entry fee: K{tournament.entryFee}
                                  </p>
                                </>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No categories available for registration
                            </p>
                          )}
                        </>
                      ) : tournament.status === 'entries_closed' ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">Entries are now closed for this tournament</p>
                        </div>
                      ) : tournament.status === 'completed' ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">This tournament has been completed</p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">Registration not available</p>
                        </div>
                      )}

                      <div className="pt-4 border-t space-y-2">
                        <p className="text-sm font-medium">Contact Information</p>
                        {(tournament as any).contactEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${(tournament as any).contactEmail}`} className="text-blue-600 hover:underline">
                              {(tournament as any).contactEmail}
                            </a>
                          </div>
                        )}
                        {(tournament as any).contactPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${(tournament as any).contactPhone}`} className="text-blue-600 hover:underline">
                              {(tournament as any).contactPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="draws">
              <PublicDrawsView tournament={tournament} />
            </TabsContent>

            <TabsContent value="results">
              <PublicResultsView tournament={tournament} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}

function PublicDrawsView({ tournament }: { tournament: Tournament }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const categoriesWithDraws = tournament.categories?.filter((c: any) => c.draw) || []

  // Auto-select first category with draw
  const activeCategoryId = selectedCategoryId || categoriesWithDraws[0]?._id || ''
  const activeCategory = categoriesWithDraws.find((c: any) => c._id === activeCategoryId)
  const draw = (activeCategory as any)?.draw

  if (categoriesWithDraws.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No draws available yet</p>
          <p className="text-sm">Draws will appear here once they are generated by the tournament organizers.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      {categoriesWithDraws.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Select Category</label>
            <select
              className="w-full p-2 border rounded-md"
              value={activeCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              {categoriesWithDraws.map((category: any) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                  {category.draw?.finalized ? ' (Finalized)' : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Draw Info */}
      {draw && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {(activeCategory as any)?.name} - Draw
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {draw.type.replace('_', ' ')}
                </Badge>
                {draw.bracketSize && (
                  <Badge variant="outline">
                    {draw.bracketSize} draw
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Finalized Standings */}
            {draw.finalized && draw.standings && (
              <div className="mb-6 p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Final Standings
                </h4>
                <div className="space-y-2">
                  {draw.standings.champion && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <span className="font-bold">{draw.standings.champion.name}</span>
                      <span className="text-sm text-muted-foreground">Champion</span>
                    </div>
                  )}
                  {draw.standings.runnerUp && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🥈</span>
                      <span className="font-medium">{draw.standings.runnerUp.name}</span>
                      <span className="text-sm text-muted-foreground">Runner-up</span>
                    </div>
                  )}
                  {draw.standings.semiFinalists?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🥉</span>
                      <span>{draw.standings.semiFinalists.map((p: any) => p.name).join(', ')}</span>
                      <span className="text-sm text-muted-foreground">Semi-finalists</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DrawBracket draw={draw} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PublicResultsView({ tournament }: { tournament: Tournament }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const categoriesWithDraws = tournament.categories?.filter((c: any) => c.draw) || []
  const activeCategoryId = selectedCategoryId || categoriesWithDraws[0]?._id || ''
  const activeCategory = categoriesWithDraws.find((c: any) => c._id === activeCategoryId)
  const draw = (activeCategory as any)?.draw

  // Get completed matches
  const completedMatches = draw?.matches?.filter((m: any) => m.status === 'completed' && !m.player1?.isBye && !m.player2?.isBye) || []

  // Group completed matches by round
  const matchesByRound: Record<number, any[]> = {}
  completedMatches.forEach((m: any) => {
    if (!matchesByRound[m.round]) matchesByRound[m.round] = []
    matchesByRound[m.round].push(m)
  })

  if (categoriesWithDraws.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No results available yet</p>
          <p className="text-sm">Results will appear here once matches have been played.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      {categoriesWithDraws.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Select Category</label>
            <select
              className="w-full p-2 border rounded-md"
              value={activeCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              {categoriesWithDraws.map((category: any) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                  {category.draw?.finalized ? ' (Finalized)' : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Finalized Standings */}
      {draw?.finalized && draw.standings && (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Final Standings - {(activeCategory as any)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draw.standings.champion && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Champion</div>
                    <div className="font-bold text-lg">{draw.standings.champion.name}</div>
                  </div>
                </div>
              )}
              {draw.standings.runnerUp && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border">
                  <span className="text-2xl">🥈</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Runner-up</div>
                    <div className="font-semibold">{draw.standings.runnerUp.name}</div>
                  </div>
                </div>
              )}
              {draw.standings.semiFinalists?.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg border">
                  <span className="text-2xl">🥉</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Semi-finalists</div>
                    <div className="font-medium">
                      {draw.standings.semiFinalists.map((p: any) => p.name).join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Results by Round */}
      {completedMatches.length > 0 ? (
        Object.entries(matchesByRound)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([round, matches]) => (
            <Card key={round}>
              <CardHeader>
                <CardTitle className="text-lg">{matches[0]?.roundName || `Round ${round}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matches.map((match: any) => (
                    <div
                      key={match._id || match.id}
                      className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className={`flex-1 ${match.winner === match.player1?.id ? 'font-bold' : ''}`}>
                              {match.player1?.name || 'TBD'}
                              {match.player1?.seed && <span className="text-xs text-muted-foreground ml-1">[{match.player1.seed}]</span>}
                              {match.winner === match.player1?.id && <CheckCircle2 className="h-4 w-4 inline ml-1 text-green-600" />}
                            </div>
                            <div className="text-sm text-muted-foreground">vs</div>
                            <div className={`flex-1 text-right ${match.winner === match.player2?.id ? 'font-bold' : ''}`}>
                              {match.player2?.name || 'TBD'}
                              {match.player2?.seed && <span className="text-xs text-muted-foreground ml-1">[{match.player2.seed}]</span>}
                              {match.winner === match.player2?.id && <CheckCircle2 className="h-4 w-4 inline ml-1 text-green-600" />}
                            </div>
                          </div>
                          {match.score && (
                            <div className="text-center text-sm font-mono mt-1">{match.score}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No match results have been entered yet for this category.
          </CardContent>
        </Card>
      )}

      {/* Round Robin Group Standings */}
      {draw?.type === 'round_robin' && draw.roundRobinGroups?.map((group: any) => (
        group.standings && (
          <Card key={group.groupName}>
            <CardHeader>
              <CardTitle>{group.groupName} Standings</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Player</th>
                    <th className="text-center py-2">P</th>
                    <th className="text-center py-2">W</th>
                    <th className="text-center py-2">L</th>
                    <th className="text-center py-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.standings.map((s: any, idx: number) => (
                    <tr key={s.playerId} className="border-b">
                      <td className="py-2">{idx + 1}</td>
                      <td className="py-2 font-medium">{s.playerName}</td>
                      <td className="text-center py-2">{s.played}</td>
                      <td className="text-center py-2">{s.won}</td>
                      <td className="text-center py-2">{s.lost}</td>
                      <td className="text-center py-2 font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  )
}
