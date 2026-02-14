import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CreditCard, Trophy } from 'lucide-react'
import { apiFetch } from '@/services/api'
import { initializeLencoWidget } from '@/utils/lencoWidget'

interface PayLaterData {
  tournamentId: string
  tournamentName: string
  amount: number
  payerEmail: string
  entryFee: number
  entries: Array<{
    entryId: string
    categoryId: string
    categoryName: string
    playerName: string
    status: string
    paymentStatus: string
  }>
}

export function PayLaterComplete() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PayLaterData | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setError('No payment token provided')
      setLoading(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await apiFetch(`/tournaments/pay-later/verify?token=${encodeURIComponent(token!)}`)
      setData(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment link')
    } finally {
      setLoading(false)
    }
  }

  const handlePayNow = async () => {
    if (!data) return
    setProcessing(true)

    try {
      // Initialize payment through Lenco
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying payment link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Payment Link Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/tournaments')}>
              Back to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

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
            </div>

            <div>
              <h4 className="font-medium mb-3">Entries to Pay For</h4>
              <div className="space-y-2">
                {data.entries.map((entry) => (
                  <div key={entry.entryId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{entry.playerName}</div>
                      <div className="text-sm text-muted-foreground">{entry.categoryName}</div>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Unpaid
                    </Badge>
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
                {data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'} x K{data.entryFee}
              </div>
            </div>

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
}
