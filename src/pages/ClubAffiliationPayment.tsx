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
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  Phone,
  Mail,
  User,
  Info
} from 'lucide-react'
import { membershipService, ClubSearchResult } from '@/services/membershipService'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import debounce from 'lodash/debounce'

export function ClubAffiliationPayment() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([])
  const [selectedClub, setSelectedClub] = useState<ClubSearchResult | null>(null)
  const [selectedMembershipType, setSelectedMembershipType] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPayerForm, setShowPayerForm] = useState(false)
  const payerFormRef = useRef<HTMLDivElement>(null)

  // Payer information
  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [payerRelation, setPayerRelation] = useState('')

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
        const results = await membershipService.searchClubs(query)
        setSearchResults(results)
      } catch (err: any) {
        console.error('Search failed:', err)
        setError(err.message || 'Failed to search clubs')
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

  // Auto-scroll to payer form when it becomes visible
  useEffect(() => {
    if (showPayerForm && payerFormRef.current) {
      setTimeout(() => {
        payerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [showPayerForm])

  const handleSelectClub = (club: ClubSearchResult) => {
    // Check if club already has active affiliation (all years paid)
    if (club.hasActiveSubscription) {
      setError(`${club.name} already has an active affiliation until ${club.currentAffiliation?.expiryDate ? new Date(club.currentAffiliation.expiryDate).toLocaleDateString() : 'December 31, ' + currentYear}`)
      return
    }

    if (!club.availableTypes || club.availableTypes.length === 0) {
      setError(`No affiliation types available for ${club.name}`)
      return
    }

    setSelectedClub(club)
    setSelectedMembershipType(club.availableTypes[0]._id) // Default to first type
    // Auto-select oldest unpaid year (enforced by backend)
    if (club.unpaidYears && club.unpaidYears.length > 0) {
      setSelectedYear(club.unpaidYears[0])
    } else {
      setSelectedYear(currentYear)
    }
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  const handleRemoveClub = () => {
    setSelectedClub(null)
    setSelectedMembershipType('')
    setSelectedYear(null)
    setShowPayerForm(false)
  }

  const getSelectedType = () => {
    if (!selectedClub || !selectedMembershipType) return null
    return selectedClub.availableTypes.find(t => t._id === selectedMembershipType)
  }

  const handleProceedToPayment = () => {
    if (!selectedClub) {
      setError('Please select a club')
      return
    }
    if (!selectedMembershipType) {
      setError('Please select an affiliation type')
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
    if (!selectedClub || !selectedMembershipType) {
      setError('Please select a club and affiliation type')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const paymentData = await membershipService.initializePublicClubPayment({
        clubId: selectedClub._id,
        membershipTypeId: selectedMembershipType,
        year: selectedYear || currentYear,
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
        amount: paymentData.amount,
        currency: (paymentData.currency || 'ZMW') as 'ZMW' | 'USD',
        channels: ['card', 'mobile-money'],
        onSuccess: (response) => {
          navigate(`/payment/verify?reference=${response.reference}&type=club-affiliation`)
        },
        onClose: () => {
          setProcessing(false)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${paymentData.reference}&type=club-affiliation&pending=true`)
        }
      })
    } catch (err: any) {
      console.error('Payment initialization failed:', err)
      setError(err.message || 'Failed to initialize payment. Please try again.')
      setProcessing(false)
    }
  }

  const selectedType = getSelectedType()

  return (
    <div className="flex flex-col">
      <Hero
        title="Club Affiliation"
        description="Pay for club affiliation with the Zambia Tennis Association"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-4xl">
          {/* Introduction */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Club Affiliation Payment
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Search for a club and pay for their annual ZTA affiliation.
              Club officials, sponsors, or members can make payments on behalf of the club.
            </p>
            <div className="inline-flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>All affiliations expire December 31{selectedYear ? `, ${selectedYear}` : ` of their respective year`}</span>
            </div>
          </div>

          {/* Info Card */}
          <Card className="mb-8 bg-muted/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Why Affiliate Your Club?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- Official recognition by the Zambia Tennis Association</li>
                    <li>- Eligibility for club members to participate in ZTA sanctioned tournaments</li>
                    <li>- Access to ZTA coaching programs and resources</li>
                    <li>- Listing in the official ZTA club directory</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {!showPayerForm ? (
            <>
              {/* Club Search */}
              {!selectedClub && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Search for Club
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search by club name, city, or province..."
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
                        {searchResults.map((club) => (
                          <div
                            key={club._id}
                            className="p-4 hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleSelectClub(club)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium">{club.name}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                                    {(club.city || club.province) && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {[club.city, club.province].filter(Boolean).join(', ')}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {club.memberCount} members
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                {club.hasActiveSubscription ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <>
                                    {club.unpaidYears && club.unpaidYears.length > 1 && (
                                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                        {club.unpaidYears.length} years due
                                      </Badge>
                                    )}
                                    <Badge variant="outline">
                                      Select
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <div className="mt-4 text-center py-8 text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No clubs found matching "{searchQuery}"</p>
                        <p className="text-sm mt-1">Try a different name or location</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Selected Club */}
              {selectedClub && (
                <Card className="mb-8 border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Selected Club
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveClub}
                      >
                        Change Club
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6">
                      {/* Club Details */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{selectedClub.name}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                            {(selectedClub.city || selectedClub.province) && (
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {[selectedClub.city, selectedClub.province].filter(Boolean).join(', ')}
                              </span>
                            )}
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {selectedClub.memberCount} registered members
                            </span>
                            {selectedClub.contactPerson && (
                              <span className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {selectedClub.contactPerson}
                              </span>
                            )}
                            {selectedClub.phone && (
                              <span className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {selectedClub.phone}
                              </span>
                            )}
                            {selectedClub.email && (
                              <span className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {selectedClub.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Year Selection (for clubs with arrears) */}
                      {selectedClub.unpaidYears && selectedClub.unpaidYears.length > 1 && (
                        <div className="grid gap-2">
                          <Label>Payment Year</Label>
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mb-2">
                            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              This club has outstanding affiliation fees for {selectedClub.unpaidYears.length} years.
                              Arrears must be paid starting from the oldest year.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {selectedClub.unpaidYears.map((year, index) => (
                              <div
                                key={year}
                                className={`p-3 border rounded-lg text-center transition-all ${
                                  selectedYear === year
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary cursor-pointer'
                                    : index === 0
                                    ? 'hover:border-primary/50 cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                                onClick={() => {
                                  if (index === 0) setSelectedYear(year)
                                }}
                              >
                                <p className="font-semibold">{year}</p>
                                {index === 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">Pay this first</p>
                                )}
                                {index > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">Pay {selectedClub.unpaidYears[index - 1]} first</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Affiliation Type Selection */}
                      <div className="grid gap-2">
                        <Label>Select Affiliation Type</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedClub.availableTypes.map((type) => (
                            <div
                              key={type._id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedMembershipType === type._id
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedMembershipType(type._id)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{type.name}</p>
                                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                                </div>
                                <p className="font-bold text-lg">K{type.amount}</p>
                              </div>
                              {selectedMembershipType === type._id && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Selected
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Proceed Button */}
                      {selectedType && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">Amount to Pay</p>
                            <p className="text-2xl font-bold">K{selectedType.amount}</p>
                          </div>
                          <Button size="lg" onClick={handleProceedToPayment}>
                            Proceed to Payment
                            <CreditCard className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}
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
                    <Label htmlFor="payerRelation">Relationship to Club (Optional)</Label>
                    <Select value={payerRelation} onValueChange={setPayerRelation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="club_official">Club Official</SelectItem>
                        <SelectItem value="club_member">Club Member</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Summary */}
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span>Club</span>
                        <span className="font-medium">{selectedClub?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Affiliation Type</span>
                        <span className="font-medium">{selectedType?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Affiliation Year</span>
                        <span className="font-medium">{selectedYear || currentYear}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valid Until</span>
                        <span className="font-medium">December 31, {selectedYear || currentYear}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-lg">K{selectedType?.amount}</span>
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
          {showPayerForm && selectedType && (
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
                    Pay K{selectedType.amount}
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

          {/* Contact Info */}
          <Card className="mt-8 border-dashed">
            <CardContent className="py-6">
              <h4 className="font-semibold text-center mb-4">
                Need Help or Club Not Found?
              </h4>
              <p className="text-sm text-muted-foreground text-center mb-4">
                If your club is not in our system, please contact ZTA for assistance with club registration.
              </p>
              <div className="text-center">
                <Button variant="outline" onClick={() => navigate('/contact')}>
                  Contact ZTA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
