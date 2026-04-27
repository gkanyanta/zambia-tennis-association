import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CreditCard,
  Search,
  User,
  Users,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Plus,
  ShoppingCart,
  Info
} from 'lucide-react'
import { membershipService, PlayerSearchResult } from '@/services/membershipService'
import {
  playerRegistrationService,
  type DuplicateCheckResponse,
  type DuplicateCheckUserMatch,
} from '@/services/playerRegistrationService'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import debounce from 'lodash/debounce'

const iconMap: Record<string, any> = {
  'zpin_junior': User,
  'zpin_senior': Users,
  'zpin_international': Globe
}

const colorMap: Record<string, string> = {
  'zpin_junior': 'bg-blue-500',
  'zpin_senior': 'bg-green-500',
  'zpin_international': 'bg-purple-500'
}

interface SelectedPlayer extends PlayerSearchResult {
  selected: boolean
  nationalityOverride?: boolean // true = international, false = zambian
}

interface PendingPlayer extends PlayerSearchResult {
  // Player waiting for nationality confirmation
}

export function ZPINPayment() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([])
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPayerForm, setShowPayerForm] = useState(false)
  const [pendingPlayer, setPendingPlayer] = useState<PendingPlayer | null>(null)
  const payerFormRef = useRef<HTMLDivElement>(null)

  // Payer information
  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [payerRelation, setPayerRelation] = useState('')

  // "Can't find your player?" submission flow
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submitFirstName, setSubmitFirstName] = useState('')
  const [submitLastName, setSubmitLastName] = useState('')
  const [submitDob, setSubmitDob] = useState('')
  const [dupChecking, setDupChecking] = useState(false)
  const [dupResult, setDupResult] = useState<DuplicateCheckResponse | null>(null)
  const [dupError, setDupError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([])
        setSearching(false)
        return
      }

      try {
        setSearching(true)
        setError(null)
        const results = await membershipService.searchPlayers(query)
        setSearchResults(results)
      } catch (err: any) {
        console.error('Search failed:', err)
        setError(err.message || 'Failed to search players')
      } finally {
        setSearching(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, debouncedSearch])

  // When the user re-engages the main search, hide the manual submit panel
  // so they don't end up looking at stale duplicate-check results.
  useEffect(() => {
    if (searchQuery.length >= 2) {
      setShowSubmitForm(false)
      setDupResult(null)
      setDupError(null)
    }
  }, [searchQuery])

  const handleCheckDuplicate = async () => {
    setDupError(null)
    setDupResult(null)
    if (!submitFirstName.trim() || !submitLastName.trim()) {
      setDupError('Please enter both first and last name.')
      return
    }
    try {
      setDupChecking(true)
      const result = await playerRegistrationService.checkDuplicate({
        firstName: submitFirstName.trim(),
        lastName: submitLastName.trim(),
        dateOfBirth: submitDob || undefined,
      })
      setDupResult(result)
    } catch (err: any) {
      setDupError(err.message || 'Failed to check for existing records')
    } finally {
      setDupChecking(false)
    }
  }

  const handleConfirmExistingPlayer = (match: DuplicateCheckUserMatch) => {
    // Drop into the existing renewal basket flow — the duplicate-check
    // response shape is compatible with PlayerSearchResult.
    handleAddPlayer(match as unknown as PlayerSearchResult)
    setShowSubmitForm(false)
    setDupResult(null)
    setSubmitFirstName('')
    setSubmitLastName('')
    setSubmitDob('')
  }

  const handleProceedAsNewPlayer = () => {
    const params = new URLSearchParams()
    if (submitFirstName.trim()) params.set('firstName', submitFirstName.trim())
    if (submitLastName.trim()) params.set('lastName', submitLastName.trim())
    if (submitDob) params.set('dateOfBirth', submitDob)
    navigate(`/register-player?${params.toString()}`)
  }

  // Auto-scroll to payer form when it becomes visible
  useEffect(() => {
    if (showPayerForm && payerFormRef.current) {
      setTimeout(() => {
        payerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [showPayerForm])

  const handleAddPlayer = (player: PlayerSearchResult) => {
    // Check if player is already selected
    if (selectedPlayers.find(p => p._id === player._id)) {
      return
    }

    // Check if player already has active subscription
    if (player.hasActiveSubscription) {
      setError(`${player.fullName} already has an active membership until ${player.subscriptionExpiry ? new Date(player.subscriptionExpiry).toLocaleDateString() : 'December 31, ' + currentYear}`)
      return
    }

    // Check if player doesn't have a membership type (shouldn't happen but safe check)
    if (!player.membershipType) {
      setError(`Could not determine membership type for ${player.fullName}. Please contact ZTA.`)
      return
    }

    // Show nationality confirmation prompt
    setPendingPlayer(player)
    setError(null)
  }

  const confirmNationality = (isInternational: boolean) => {
    if (!pendingPlayer) return

    // Recalculate membership type based on nationality choice
    let membershipType = pendingPlayer.membershipType
    if (membershipType) {
      if (isInternational && membershipType.code !== 'zpin_international') {
        membershipType = {
          ...membershipType,
          code: 'zpin_international',
          name: 'International ZPIN',
          amount: 500
        }
      } else if (!isInternational && membershipType.code === 'zpin_international') {
        // Revert to age-based type
        const isJunior = pendingPlayer.age !== null && pendingPlayer.age <= 18
        membershipType = {
          ...membershipType,
          code: isJunior ? 'zpin_junior' : 'zpin_senior',
          name: isJunior ? 'Junior ZPIN' : 'Senior ZPIN',
          amount: isJunior ? 100 : 250
        }
      }
    }

    setSelectedPlayers([...selectedPlayers, {
      ...pendingPlayer,
      membershipType,
      isInternational,
      nationalityOverride: isInternational,
      selected: true
    }])
    setPendingPlayer(null)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p._id !== playerId))
  }

  const getTotalAmount = () => {
    return selectedPlayers.reduce((sum, player) => {
      return sum + (player.membershipType?.amount || 0)
    }, 0)
  }

  const handleProceedToPayment = () => {
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player')
      return
    }
    setShowPayerForm(true)
    setError(null)
  }

  const handlePayment = async () => {
    if (!payerName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!payerEmail.trim()) {
      setError('Please enter your email')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const playerIds = selectedPlayers.map(p => p._id)
      // Build nationality overrides for players whose nationality was changed
      const nationalityOverrides: Record<string, boolean> = {}
      selectedPlayers.forEach(p => {
        if (p.nationalityOverride !== undefined) {
          nationalityOverrides[p._id] = p.nationalityOverride
        }
      })

      const paymentData = await membershipService.initializeBulkPayment({
        playerIds,
        nationalityOverrides: Object.keys(nationalityOverrides).length > 0 ? nationalityOverrides : undefined,
        payer: {
          name: payerName.trim(),
          email: payerEmail.trim(),
          phone: payerPhone.trim() || undefined,
          relation: payerRelation || undefined
        }
      })

      // Launch Lenco widget
      await initializeLencoWidget({
        key: paymentData.publicKey,
        reference: paymentData.reference,
        email: paymentData.payer.email,
        amount: paymentData.totalAmount,
        currency: (paymentData.currency || 'ZMW') as 'ZMW' | 'USD',
        channels: ['card', 'mobile-money'],
        onSuccess: (response) => {
          navigate(`/payment/verify?reference=${response.reference}&type=bulk-zpin`)
        },
        onClose: () => {
          setProcessing(false)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${paymentData.reference}&type=bulk-zpin&pending=true`)
        }
      })
    } catch (err: any) {
      console.error('Payment initialization failed:', err)
      setError(err.message || 'Failed to initialize payment. Please try again.')
      setProcessing(false)
    }
  }

  const getMembershipIcon = (code: string | undefined) => {
    if (!code) return User
    return iconMap[code] || User
  }

  const getMembershipColor = (code: string | undefined) => {
    if (!code) return 'bg-gray-500'
    return colorMap[code] || 'bg-gray-500'
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Register ZPIN"
        description="Pay for player ZPIN membership registration"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-4xl">
          {/* Introduction */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              ZPIN Registration Payment
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Search for players and pay for their ZPIN (Zambia Player Identification Number) membership.
              Parents, guardians, or sponsors can pay for one or multiple players in a single transaction.
            </p>
            <div className="inline-flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>All memberships expire December 31, {currentYear}</span>
            </div>
          </div>

          {/* Pricing Info */}
          <Card className="mb-8 bg-muted/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-3 mb-4">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Membership Pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    Pricing is determined by nationality and age. You will be asked to confirm nationality when adding each player:
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Junior</p>
                    <p className="text-sm text-muted-foreground">Under 18 years - K100</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Senior</p>
                    <p className="text-sm text-muted-foreground">18+ years - K250</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">International</p>
                    <p className="text-sm text-muted-foreground">Non-Zambian - K500</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {!showPayerForm ? (
            <>
              {/* Player Search */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search for Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search by player name or ZPIN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-4 border rounded-lg divide-y max-h-80 overflow-y-auto">
                      {searchResults.map((player) => {
                        const isSelected = selectedPlayers.some(p => p._id === player._id)

                        return (
                          <div
                            key={player._id}
                            className={`p-4 flex items-center justify-between gap-4 ${
                              isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{player.fullName}</p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                  {player.zpin ? (
                                    <span className="font-mono">ZPIN: {player.zpin}</span>
                                  ) : (
                                    <span className="font-mono italic">ZPIN: •••••••• (pay to reveal)</span>
                                  )}
                                  {player.age !== null && (
                                    <span>Age: {player.age}</span>
                                  )}
                                  {player.club && (
                                    <span>Club: {player.club}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {player.hasActiveSubscription ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={isSelected ? 'secondary' : 'default'}
                                  onClick={() => handleAddPlayer(player)}
                                  disabled={isSelected}
                                >
                                  {isSelected ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Select
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && !showSubmitForm && (
                    <div className="mt-4 text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No players found matching "{searchQuery}"</p>
                      <p className="text-sm mt-1">Try a different name or ZPIN</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setShowSubmitForm(true)
                          setDupResult(null)
                          setDupError(null)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Submit player details
                      </Button>
                    </div>
                  )}

                  {showSubmitForm && (
                    <div className="mt-4 border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">Can't find the player?</p>
                          <p className="text-sm text-muted-foreground">
                            Enter their details below. We'll check whether they're already in the system before creating a new registration.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowSubmitForm(false)
                            setDupResult(null)
                            setDupError(null)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="dup-first-name">First name *</Label>
                          <Input
                            id="dup-first-name"
                            value={submitFirstName}
                            onChange={(e) => setSubmitFirstName(e.target.value)}
                            placeholder="e.g. Mwape"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dup-last-name">Last name *</Label>
                          <Input
                            id="dup-last-name"
                            value={submitLastName}
                            onChange={(e) => setSubmitLastName(e.target.value)}
                            placeholder="e.g. Banda"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dup-dob">Date of birth (optional)</Label>
                          <Input
                            id="dup-dob"
                            type="date"
                            value={submitDob}
                            onChange={(e) => setSubmitDob(e.target.value)}
                          />
                        </div>
                      </div>

                      {dupError && (
                        <div className="text-sm text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {dupError}
                        </div>
                      )}

                      <Button onClick={handleCheckDuplicate} disabled={dupChecking}>
                        {dupChecking ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Checking…
                          </>
                        ) : (
                          'Check & continue'
                        )}
                      </Button>

                      {dupResult && (
                        <div className="space-y-3">
                          {dupResult.registrationMatches.length > 0 && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-amber-900">
                                    A registration with this name is already in progress.
                                  </p>
                                  <ul className="mt-1 space-y-1 text-amber-900">
                                    {dupResult.registrationMatches.map((r) => (
                                      <li key={r.referenceNumber}>
                                        <span className="font-mono">{r.referenceNumber}</span> — status: {r.status.replace('_', ' ')}
                                      </li>
                                    ))}
                                  </ul>
                                  <p className="mt-1 text-amber-800">
                                    Please wait for ZTA to process the existing registration before submitting again.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {dupResult.userMatches.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold">
                                We found {dupResult.userMatches.length === 1 ? 'a player' : 'players'} with this name. Is this who you're paying for?
                              </p>
                              <div className="border rounded-lg divide-y">
                                {dupResult.userMatches.map((m) => (
                                  <div key={m._id} className="p-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">
                                        {m.fullName}
                                        {m.dobMatches === true && (
                                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                                            DOB matches
                                          </Badge>
                                        )}
                                      </p>
                                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        {m.age !== null && <span>Age: {m.age}</span>}
                                        {m.club && <span>Club: {m.club}</span>}
                                        {m.gender && <span className="capitalize">{m.gender}</span>}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                      {m.hasActiveSubscription ? (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Already paid for {currentYear}
                                        </Badge>
                                      ) : (
                                        <Button size="sm" onClick={() => handleConfirmExistingPlayer(m)}>
                                          That's the player — pay renewal
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Button variant="outline" size="sm" onClick={handleProceedAsNewPlayer}>
                                None of these is the player — register as new
                              </Button>
                            </div>
                          ) : dupResult.registrationMatches.length === 0 ? (
                            <div className="rounded-md border bg-background p-3 text-sm space-y-2">
                              <p>
                                We didn't find any existing record. Continue to the full registration form to submit details and pay.
                              </p>
                              <Button size="sm" onClick={handleProceedAsNewPlayer}>
                                Continue to registration
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Nationality Confirmation Prompt */}
              {pendingPlayer && (
                <Card className="mb-8 border-primary/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Confirm Nationality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Is <span className="font-semibold text-foreground">{pendingPlayer.fullName}</span> a Zambian or non-Zambian player?
                      This determines the registration fee.
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => confirmNationality(false)}
                        className="flex-1 flex items-center gap-3 p-4 rounded-lg border-2 border-muted hover:border-green-500 hover:bg-green-500/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">Zambian</p>
                          <p className="text-sm text-muted-foreground">
                            {pendingPlayer.age !== null && pendingPlayer.age <= 18
                              ? 'Junior - K100'
                              : 'Senior - K250'}
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => confirmNationality(true)}
                        className="flex-1 flex items-center gap-3 p-4 rounded-lg border-2 border-muted hover:border-purple-500 hover:bg-purple-500/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <Globe className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">Non-Zambian</p>
                          <p className="text-sm text-muted-foreground">International - K500</p>
                        </div>
                      </button>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setPendingPlayer(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Players */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Selected Players ({selectedPlayers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPlayers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No players selected yet</p>
                      <p className="text-sm mt-1">Search and add players above</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y">
                        {selectedPlayers.map((player) => {
                          const Icon = getMembershipIcon(player.membershipType?.code)
                          const bgColor = getMembershipColor(player.membershipType?.code)

                          return (
                            <div key={player._id} className="py-3 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{player.fullName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {player.membershipType?.name} - K{player.membershipType?.amount}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemovePlayer(player._id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>

                      {/* Total */}
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-2xl font-bold">K{getTotalAmount()}</p>
                        </div>
                        <Button size="lg" onClick={handleProceedToPayment}>
                          Proceed to Payment
                          <CreditCard className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPayerForm(false)}
                  >
                    Back to Selection
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="payerName">Your Name *</Label>
                    <Input
                      id="payerName"
                      placeholder="Enter your full name"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payerEmail">Email Address *</Label>
                    <Input
                      id="payerEmail"
                      type="email"
                      placeholder="Enter your email address"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Payment receipt will be sent to this email
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payerPhone">Phone Number (Optional)</Label>
                    <Input
                      id="payerPhone"
                      type="tel"
                      placeholder="e.g., +260971234567"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payerRelation">Relationship to Player(s) (Optional)</Label>
                    <Select value={payerRelation} onValueChange={setPayerRelation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="club">Club</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Summary */}
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm mb-4">
                      {selectedPlayers.map((player) => (
                        <div key={player._id} className="flex justify-between">
                          <span>{player.fullName} ({player.membershipType?.name})</span>
                          <span>K{player.membershipType?.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Total ({selectedPlayers.length} player{selectedPlayers.length > 1 ? 's' : ''})</span>
                      <span className="text-lg">K{getTotalAmount()}</span>
                    </div>
                  </div>
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

          {/* Pay Button (shown only when payer form is visible) */}
          {showPayerForm && (
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handlePayment}
                disabled={processing}
                className="min-w-[200px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay K{getTotalAmount()}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Payment Methods Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Secure payment powered by Lenco
            </p>
            <div className="flex items-center justify-center gap-4 text-muted-foreground flex-wrap">
              <span className="text-xs">Accepts:</span>
              <Badge variant="outline">Visa/Mastercard</Badge>
              <Badge variant="outline">MTN Mobile Money</Badge>
              <Badge variant="outline">Airtel Money</Badge>
              <Badge variant="outline">Zamtel Kwacha</Badge>
            </div>
          </div>

          {/* Player Not Registered? */}
          <Card className="mt-8 border-dashed">
            <CardContent className="py-6">
              <h4 className="font-semibold text-center mb-4">
                Player Not Registered?
              </h4>
              <p className="text-sm text-muted-foreground text-center mb-4">
                If the player is not in our system, they can register for a new ZPIN online.
                The registration will be reviewed and approved by the ZTA.
              </p>
              <div className="text-center">
                <Button variant="outline" onClick={() => navigate('/register-player')}>
                  Register New Player
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
