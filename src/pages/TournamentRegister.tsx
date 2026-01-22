import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Trophy,
  Search,
  User,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Plus,
  CreditCard,
  Info,
  Building2,
  AlertTriangle
} from 'lucide-react'
import { tournamentService, Tournament } from '@/services/tournamentService'
import { membershipService, PlayerSearchResult } from '@/services/membershipService'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import debounce from 'lodash/debounce'

interface SelectedEntry {
  player: PlayerSearchResult
  categoryId: string
  categoryName: string
}

export function TournamentRegister() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Tournament data
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Player search
  const [searchQuery, setSearchQuery] = useState('')
  const [clubFilter, setClubFilter] = useState('')
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Selected entries
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')

  // Payer information
  const [showPayerForm, setShowPayerForm] = useState(false)
  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [payerRelationship, setPayerRelationship] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [payNow, setPayNow] = useState(false)

  const payerFormRef = useRef<HTMLDivElement>(null)

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

      // Check if public registration is allowed
      if (!(data as any).allowPublicRegistration) {
        setError('Public registration is not enabled for this tournament')
      }
    } catch (err: any) {
      console.error('Failed to load tournament:', err)
      setError(err.message || 'Failed to load tournament')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, club: string) => {
      if (!query || query.length < 2) {
        setSearchResults([])
        setSearching(false)
        return
      }

      try {
        setSearching(true)
        // Use the membership service to search players
        const results = await membershipService.searchPlayers(query)

        // Filter by club if specified
        let filtered = results
        if (club) {
          filtered = results.filter(p =>
            p.club?.toLowerCase().includes(club.toLowerCase())
          )
        }

        setSearchResults(filtered)
      } catch (err: any) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery, clubFilter)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, clubFilter, debouncedSearch])

  // Auto-scroll to payer form
  useEffect(() => {
    if (showPayerForm && payerFormRef.current) {
      setTimeout(() => {
        payerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [showPayerForm])

  const handleSelectPlayer = (player: PlayerSearchResult) => {
    setSelectedPlayer(player)
    setSelectedCategory('')
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAddEntry = () => {
    if (!selectedPlayer || !selectedCategory || !tournament) return

    const category = tournament.categories.find(c => c._id === selectedCategory)
    if (!category) return

    // Check if player already entered this category
    const alreadyEntered = selectedEntries.some(
      e => e.player._id === selectedPlayer._id && e.categoryId === selectedCategory
    )
    if (alreadyEntered) {
      setError('This player is already entered in this category')
      return
    }

    // Check if multiple categories allowed
    const playerEntries = selectedEntries.filter(e => e.player._id === selectedPlayer._id)
    if (playerEntries.length > 0 && !(tournament as any).allowMultipleCategories) {
      setError('This tournament does not allow players to enter multiple categories')
      return
    }

    setSelectedEntries([
      ...selectedEntries,
      {
        player: selectedPlayer,
        categoryId: selectedCategory,
        categoryName: category.name
      }
    ])

    setSelectedPlayer(null)
    setSelectedCategory('')
    setError(null)
  }

  const handleRemoveEntry = (index: number) => {
    setSelectedEntries(selectedEntries.filter((_, i) => i !== index))
  }

  const calculateTotalFee = () => {
    if (!tournament) return 0
    return selectedEntries.length * tournament.entryFee
  }

  const handleProceedToPayment = () => {
    if (selectedEntries.length === 0) {
      setError('Please add at least one entry')
      return
    }
    setShowPayerForm(true)
    setError(null)
  }

  const handleSubmit = async (payImmediately: boolean) => {
    if (!payerName.trim() || !payerEmail.trim()) {
      setError('Please enter payer name and email')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setSubmitting(true)
    setPayNow(payImmediately)
    setError(null)

    try {
      // Submit entries to backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://zta-backend-y10h.onrender.com'}/api/tournaments/${id}/public-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entries: selectedEntries.map(e => ({
            playerId: e.player._id,
            categoryId: e.categoryId
          })),
          payer: {
            name: payerName.trim(),
            email: payerEmail.trim(),
            phone: payerPhone.trim() || undefined,
            relationship: payerRelationship || undefined
          },
          payNow: payImmediately
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit entries')
      }

      if (payImmediately && data.payment) {
        // Launch payment widget
        await initializeLencoWidget({
          key: data.payment.publicKey,
          reference: data.payment.reference,
          email: payerEmail,
          amount: data.payment.amount,
          currency: 'ZMW',
          channels: ['card', 'mobile-money'],
          onSuccess: (response) => {
            navigate(`/payment/verify?reference=${response.reference}&type=tournament-entry`)
          },
          onClose: () => {
            setSubmitting(false)
            // Still show success since entries are submitted
            alert('Entries submitted! You can pay later from your confirmation email.')
            navigate(`/tournaments/${id}`)
          },
          onConfirmationPending: () => {
            navigate(`/payment/verify?reference=${data.payment.reference}&type=tournament-entry&pending=true`)
          }
        })
      } else {
        // Pay later - show success
        alert(`${selectedEntries.length} entries submitted successfully! Payment can be made later. A confirmation email has been sent to ${payerEmail}.`)
        navigate(`/tournaments/${id}`)
      }
    } catch (err: any) {
      console.error('Submission failed:', err)
      setError(err.message || 'Failed to submit entries. Please try again.')
      setSubmitting(false)
    }
  }

  const getEligibleCategories = () => {
    if (!tournament || !selectedPlayer) return []

    return tournament.categories.filter(category => {
      // Check gender match
      const playerGender = selectedPlayer.gender
      const catGender = category.gender

      if (catGender === 'boys' && playerGender !== 'male') return false
      if (catGender === 'girls' && playerGender !== 'female') return false
      if (catGender === 'mens' && playerGender !== 'male') return false
      if (catGender === 'womens' && playerGender !== 'female') return false

      // Check age for junior categories
      if (category.type === 'junior' && category.maxAge && selectedPlayer.age && selectedPlayer.dateOfBirth) {
        // Calculate age on Dec 31 of tournament year
        const tournamentYear = new Date(tournament.startDate).getFullYear()
        const dob = new Date(selectedPlayer.dateOfBirth)
        const dec31 = new Date(tournamentYear, 11, 31)
        let ageOnDec31 = dec31.getFullYear() - dob.getFullYear()
        const monthDiff = dec31.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && dec31.getDate() < dob.getDate())) {
          ageOnDec31--
        }
        if (ageOnDec31 > category.maxAge) return false
      }

      // Check minimum age for madalas
      if (category.type === 'madalas' && category.minAge && selectedPlayer.age) {
        if (selectedPlayer.age < category.minAge) return false
      }

      return true
    })
  }

  // Get unique clubs from selected entries
  const getClubsSummary = () => {
    const clubs: Record<string, number> = {}
    selectedEntries.forEach(entry => {
      const club = entry.player.club || 'Unknown Club'
      clubs[club] = (clubs[club] || 0) + 1
    })
    return clubs
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Loading..." description="Please wait" gradient />
        <section className="py-16">
          <div className="container-custom">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!tournament || error === 'Public registration is not enabled for this tournament') {
    return (
      <div className="flex flex-col">
        <Hero title="Registration Unavailable" description="" gradient />
        <section className="py-16">
          <div className="container-custom max-w-2xl">
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <h2 className="text-xl font-semibold mb-2">Registration Not Available</h2>
                <p className="text-muted-foreground mb-6">
                  {error || 'This tournament does not exist or registration is closed.'}
                </p>
                <Button onClick={() => navigate('/tournaments')}>
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
        title={`Register for ${tournament.name}`}
        description="Search and register players for this tournament"
        gradient
      />

      <section className="py-8">
        <div className="container-custom max-w-5xl">
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => navigate(`/tournaments/${id}`)}
          >
            ← Back to Tournament
          </Button>

          {/* Tournament Info Card */}
          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-muted-foreground">Dates</div>
                    <div className="font-medium">
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-muted-foreground">Categories</div>
                    <div className="font-medium">{tournament.categories.length} available</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-muted-foreground">Entry Fee</div>
                    <div className="font-medium">K{tournament.entryFee} per entry</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-muted-foreground">Entry Deadline</div>
                    <div className="font-medium">{new Date(tournament.entryDeadline).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info about multiple categories */}
          {(tournament as any).allowMultipleCategories && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Multiple Categories Allowed:</strong> Players can enter more than one category in this tournament.
              </div>
            </div>
          )}

          {!showPayerForm ? (
            <>
              {/* Player Search */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Players
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Search by Name or ZPIN</Label>
                      <div className="relative mt-1">
                        <Input
                          type="text"
                          placeholder="Enter player name or ZPIN..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pr-10"
                        />
                        {searching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Filter by Club (Optional)</Label>
                      <Input
                        type="text"
                        placeholder="Enter club name..."
                        value={clubFilter}
                        onChange={(e) => setClubFilter(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {searchResults.map((player) => (
                        <div
                          key={player._id}
                          className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                          onClick={() => handleSelectPlayer(player)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{player.firstName} {player.lastName}</div>
                              <div className="text-sm text-muted-foreground">
                                {player.zpin} • {player.club || 'No club'}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-1" />
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No players found matching "{searchQuery}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Player - Category Selection */}
              {selectedPlayer && (
                <Card className="mb-8 border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Add Entry for {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPlayer(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">ZPIN</div>
                          <div className="font-medium">{selectedPlayer.zpin}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Club</div>
                          <div className="font-medium">{selectedPlayer.club || 'None'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Gender</div>
                          <div className="font-medium capitalize">{selectedPlayer.gender}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Age</div>
                          <div className="font-medium">{selectedPlayer.age || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Select Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {getEligibleCategories().map(category => (
                            <SelectItem key={category._id} value={category._id}>
                              {category.name} ({category.entries?.length || 0}/{category.maxEntries})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getEligibleCategories().length === 0 && (
                        <p className="text-sm text-amber-600 mt-2">
                          No eligible categories found for this player based on age/gender.
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleAddEntry}
                      disabled={!selectedCategory}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Selected Entries */}
              {selectedEntries.length > 0 && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Selected Entries ({selectedEntries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      {selectedEntries.map((entry, index) => (
                        <div
                          key={`${entry.player._id}-${entry.categoryId}`}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {entry.player.firstName} {entry.player.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {entry.categoryName} • {entry.player.club || 'No club'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">K{tournament.entryFee}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEntry(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Clubs Summary */}
                    {Object.keys(getClubsSummary()).length > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg mb-6">
                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Entries by Club
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(getClubsSummary()).map(([club, count]) => (
                            <Badge key={club} variant="secondary">
                              {club}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Entry Fees</div>
                        <div className="text-2xl font-bold">K{calculateTotalFee()}</div>
                      </div>
                      <Button size="lg" onClick={handleProceedToPayment}>
                        Proceed to Register
                        <Trophy className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            /* Payer Information Form */
            <Card ref={payerFormRef} className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Payer Information
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowPayerForm(false)}>
                    Back to Entries
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payerName">Your Name *</Label>
                    <Input
                      id="payerName"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payerEmail">Email Address *</Label>
                    <Input
                      id="payerEmail"
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Confirmation will be sent to this email
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payerPhone">Phone Number (Optional)</Label>
                    <Input
                      id="payerPhone"
                      type="tel"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="+260 XXX XXXXXX"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payerRelationship">Relationship to Players</Label>
                    <Select value={payerRelationship} onValueChange={setPayerRelationship}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self (I am one of the players)</SelectItem>
                        <SelectItem value="parent">Parent/Guardian</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="club_official">Club Official</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Entry Summary */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-semibold mb-3">Registration Summary</h4>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span>Tournament</span>
                      <span className="font-medium">{tournament.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Entries</span>
                      <span className="font-medium">{selectedEntries.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry Fee (per entry)</span>
                      <span className="font-medium">K{tournament.entryFee}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t flex justify-between font-semibold text-lg">
                    <span>Total Amount</span>
                    <span>K{calculateTotalFee()}</span>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                    className="w-full"
                    size="lg"
                  >
                    {submitting && payNow ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Register & Pay Now (K{calculateTotalFee()})
                      </>
                    )}
                  </Button>

                  {!(tournament as any).requirePaymentUpfront && (
                    <Button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      variant="outline"
                      className="w-full"
                      size="lg"
                    >
                      {submitting && !payNow ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Register Now, Pay Later
                        </>
                      )}
                    </Button>
                  )}

                  {!(tournament as any).requirePaymentUpfront && (
                    <p className="text-xs text-center text-muted-foreground">
                      Pay later entries will be marked as pending until payment is received
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Help Card */}
          <Card className="border-dashed">
            <CardContent className="py-6">
              <h4 className="font-semibold text-center mb-4">Need Help?</h4>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Contact the tournament organizers if you have questions about registration.
              </p>
              <div className="flex justify-center gap-4 text-sm">
                <span>{tournament.contactEmail}</span>
                <span>{tournament.contactPhone}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
