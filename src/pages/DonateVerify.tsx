import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, ArrowLeft, Home } from 'lucide-react'
import { donationService } from '@/services/donationService'

export function DonateVerify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [donation, setDonation] = useState<any>(null)

  useEffect(() => {
    const verifyPayment = async () => {
      const transactionId = searchParams.get('transaction_id')
      const status = searchParams.get('status')

      if (!transactionId) {
        setError('No transaction ID found')
        setVerifying(false)
        return
      }

      // If Flutterwave indicates failure upfront
      if (status === 'cancelled' || status === 'failed') {
        setError('Payment was cancelled or failed')
        setVerifying(false)
        return
      }

      try {
        const response = await donationService.verifyDonation(transactionId)

        if (response.success && response.donation) {
          setSuccess(true)
          setDonation(response.donation)
        } else {
          setError(response.message || 'Payment verification failed')
        }
      } catch (err: any) {
        console.error('Verification error:', err)
        setError(err.response?.data?.message || 'Failed to verify payment')
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {verifying ? 'Verifying Payment...' : success ? 'Thank You!' : 'Payment Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {verifying && (
            <div className="text-center py-12">
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin mb-4" />
              <p className="text-muted-foreground">
                Please wait while we verify your payment...
              </p>
            </div>
          )}

          {!verifying && success && donation && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Your Donation Was Successful!
              </h3>
              <p className="text-muted-foreground mb-6">
                Thank you for supporting tennis development in Zambia. Your generosity makes a real difference.
              </p>

              <div className="bg-muted/50 rounded-lg p-6 text-left space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Receipt Number:</div>
                  <div className="font-medium">{donation.receiptNumber}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Amount:</div>
                  <div className="font-medium">K{donation.amount.toFixed(2)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Purpose:</div>
                  <div className="font-medium capitalize">{donation.donationType.replace('_', ' ')}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Date:</div>
                  <div className="font-medium">
                    {new Date(donation.paymentDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                A receipt has been sent to your email address. Please check your inbox.
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/donate')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Make Another Donation
                </Button>
                <Button onClick={() => navigate('/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </div>
          )}

          {!verifying && !success && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Payment Unsuccessful
              </h3>
              <p className="text-muted-foreground mb-6">
                {error || 'We could not process your payment. Please try again.'}
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
                <Button onClick={() => navigate('/donate')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
