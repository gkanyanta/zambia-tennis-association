import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CreditCard, Trophy, Search } from 'lucide-react'
import { apiFetch } from '@/services/api'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import { MobileMoneyOnlyNotice } from '@/components/MobileMoneyOnlyNotice'

interface PayLaterEntry {
  entryId: string
  categoryId: string
  categoryName: string
  playerName: string
  entryFee?: number
  partnerName?: string
  partnerFee?: number
  status?: string
  paymentStatus?: string
}

interface PayLaterData {
  tournamentId: string
  tournamentName: string
  amount: number
  payerEmail: string
  entryFee?: number
  entryReferenceNumber?: string
  entries: PayLaterEntry[]
}

interface LookupGroup {
  tournamentId: string
  tournamentName: string
  tournamentStartDate?: string
  tournamentVenue?: string
  tournamentCity?: string
  entryReferenceNumber: string
  payerEmail: string
  payerName: string
  entries: PayLaterEntry[]
  totalAmount: number
}

export function PayLaterComplete() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const refParam = searchParams.get('ref')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PayLaterData | null>(null)
  const [processing, setProcessing] = useState(false)

  // Lookup form state
  const [refInput, setRefInput] = useState(refParam || '')
  const [emailInput, setEmailInput] = useState('')
  const [lookupResults, setLookupResults] = useState<LookupGroup[] | null>(null)

  // If token or ref param provided, auto-load
  useEffect(() => {
    if (token) {
      verifyToken()
    } else if (refParam) {
      handleLookup(refParam.trim(), '')
    }
  }, [token, refParam])

  const verifyToken = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch(`/tournaments/pay-later/verify?token=${encodeURIComponent(token!)}`)
      setData(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment link')
    } finally {
      setLoading(false)
    }
  }

  const handleLookup = async (ref?: string, email?: string) => {
    const searchRef = ref ?? refInput.trim()
    const searchEmail = email ?? emailInput.trim()

    if (!searchRef && !searchEmail) {
      setError('Please enter a reference number or email address')
      return
    }

    setLoading(true)
    setError(null)
    setData(null)
    setLookupResults(null)

    try {
      const params = new URLSearchParams()
      if (searchRef) params.set('ref', searchRef)
      if (searchEmail) params.set('email', searchEmail)

      const response = await apiFetch(`/tournaments/pay-later/lookup?${params.toString()}`)
      const results: LookupGroup[] = response.data

      if (results.length === 1) {
        // Single result — go directly to payment
        selectGroup(results[0])
      } else {
        // Multiple results — let user pick
        setLookupResults(results)
      }
    } catch (err: any) {
      setError(err.message || 'No pending entries found')
    } finally {
      setLoading(false)
    }
  }

  const selectGroup = (group: LookupGroup) => {
    setData({
      tournamentId: group.tournamentId,
      tournamentName: group.tournamentName,
      amount: group.totalAmount,
      payerEmail: group.payerEmail,
      entryReferenceNumber: group.entryReferenceNumber,
      entries: group.entries
    })
    setLookupResults(null)
  }

  const handlePayNow = async () => {
    if (!data) return
    setProcessing(true)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://zta-backend-y10h.onrender.com'}/api/membership/bulk-payment/initialize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'tournament-entry',
            tournamentId: data.tournamentId,
            amount: data.amount,
            email: data.payerEmail,
            entryIds: data.entries.map(e => e.entryId)
          })
        }
      )

      const paymentData = await response.json()

      if (paymentData.success && paymentData.data?.publicKey) {
        await initializeLencoWidget({
          key: paymentData.data.publicKey,
          reference: paymentData.data.reference,
          email: data.payerEmail,
          amount: data.amount,
          currency: 'ZMW',
          channels: ['card', 'mobile-money'],
          onSuccess: (response) => {
            navigate(`/payment/verify?reference=${response.reference}&type=tournament-entry`)
          },
          onClose: () => {
            setProcessing(false)
          },
          onConfirmationPending: () => {
            navigate(`/payment/verify?reference=${paymentData.data.reference}&type=tournament-entry&pending=true`)
          }
        })
      } else {
        setError('Failed to initialize payment. Please try again.')
        setProcessing(false)
      }
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed')
      setProcessing(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {token ? 'Verifying payment link...' : 'Looking up entries...'}
          </p>
        </div>
      </div>
    )
  }

  // Error with no data loaded — show error + lookup form
  if (error && !data && !lookupResults) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-custom max-w-2xl">
          {token && (
            <Card className="mb-6">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h2 className="text-xl font-semibold mb-2">Payment Link Error</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <p className="text-sm text-muted-foreground">You can look up your entries using your reference number or email below.</p>
              </CardContent>
            </Card>
          )}
          {renderLookupForm()}
        </div>
      </div>
    )
  }

  // Multiple lookup results — show selection
  if (lookupResults) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-custom max-w-2xl space-y-4">
          <h2 className="text-xl font-semibold">Select Entries to Pay</h2>
          <p className="text-muted-foreground">Multiple pending registrations found. Select which one to pay for.</p>
          {lookupResults.map((group, idx) => (
            <Card key={idx} className="cursor-pointer hover:border-primary transition-colors" onClick={() => selectGroup(group)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{group.tournamentName}</h3>
                    {group.entryReferenceNumber && (
                      <p className="text-xs font-mono text-muted-foreground">Ref: {group.entryReferenceNumber}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'} &middot; {group.entries.map(e => e.playerName).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">K{group.totalAmount}</div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">Unpaid</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={() => { setLookupResults(null); setData(null); setError(null) }}>
            Back to Search
          </Button>
        </div>
      </div>
    )
  }

  // No data and no token — show lookup form
  if (!data) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-custom max-w-2xl">
          {renderLookupForm()}
        </div>
      </div>
    )
  }

  // Data loaded — show payment card
  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-custom max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Complete Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold mb-1">{data.tournamentName}</h3>
              <p className="text-sm text-muted-foreground">Tournament Entry Fee Payment</p>
              {data.entryReferenceNumber && (
                <p className="text-xs font-mono text-muted-foreground mt-1">Ref: {data.entryReferenceNumber}</p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-3">Entries to Pay For</h4>
              <div className="space-y-2">
                {data.entries.map((entry) => (
                  <div key={entry.entryId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{entry.playerName}</div>
                      <div className="text-sm text-muted-foreground">{entry.categoryName}</div>
                      {entry.partnerName && (
                        <div className="text-sm text-muted-foreground">Partner: {entry.partnerName}</div>
                      )}
                    </div>
                    <div className="text-right">
                      {entry.entryFee != null && (
                        <div className="text-sm font-medium">K{(entry.entryFee || 0) + (entry.partnerFee || 0)}</div>
                      )}
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Unpaid
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Total Amount Due</div>
                <div className="text-2xl font-bold">K{data.amount}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <MobileMoneyOnlyNotice />

            <Button
              onClick={handlePayNow}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay K{data.amount} Now
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Payment for {data.payerEmail}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  function renderLookupForm() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Entry Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Enter your reference number or the email address used during registration to find your pending entries.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ref">Reference Number</Label>
              <Input
                id="ref"
                placeholder="e.g. TRN-A3K7-M9X2"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email used during registration"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>
          </div>

          {error && !token && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button onClick={() => handleLookup()} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Find My Entries
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }
}
