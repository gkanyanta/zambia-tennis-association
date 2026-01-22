import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Loader2
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
                          <div className="text-right">
                            <p className="text-sm font-medium">{category.entryCount} / {category.maxEntries}</p>
                            <p className="text-xs text-muted-foreground">Entries</p>
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
                      <Button
                        className="w-full mt-4"
                        variant="outline"
                      >
                        View Results
                      </Button>
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
        </div>
      </section>
    </div>
  )
}
