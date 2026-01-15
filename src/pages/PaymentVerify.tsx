import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Receipt,
  User,
  Calendar,
  CreditCard,
  ArrowRight,
  RefreshCw,
  Home,
  Download
} from 'lucide-react'
import { lencoPaymentService, LencoPaymentVerifyResponse } from '@/services/lencoPaymentService'

type PaymentStatus = 'loading' | 'success' | 'failed' | 'pending'

const paymentTypeLabels: Record<string, string> = {
  membership: 'Membership Payment',
  donation: 'Donation',
  tournament: 'Tournament Entry Fee',
  coach: 'Coach Listing Payment'
}

const paymentTypeRedirects: Record<string, { path: string; label: string }> = {
  membership: { path: '/membership/pay', label: 'View Membership' },
  donation: { path: '/donate', label: 'Make Another Donation' },
  tournament: { path: '/tournaments', label: 'View Tournaments' },
  coach: { path: '/coaches', label: 'View Coaches' }
}

export function PaymentVerify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<PaymentStatus>('loading')
  const [paymentData, setPaymentData] = useState<LencoPaymentVerifyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const reference = searchParams.get('reference')
  const paymentType = searchParams.get('type') || 'payment'
  const isPending = searchParams.get('pending') === 'true'

  useEffect(() => {
    if (reference) {
      verifyPayment()
    } else {
      setStatus('failed')
      setError('No payment reference provided')
    }
  }, [reference])

  const verifyPayment = async () => {
    if (!reference) return

    try {
      setStatus('loading')
      setError(null)

      const data = await lencoPaymentService.verifyPayment(reference)
      setPaymentData(data)

      if (data.status === 'successful' || data.status === 'success') {
        setStatus('success')
      } else if (data.status === 'pending') {
        setStatus('pending')
      } else {
        setStatus('failed')
        setError('Payment was not successful')
      }
    } catch (err: any) {
      console.error('Payment verification failed:', err)
      setStatus(isPending ? 'pending' : 'failed')
      setError(err.message || 'Failed to verify payment')
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    await verifyPayment()
    setRetrying(false)
  }

  const redirect = paymentTypeRedirects[paymentType] || { path: '/', label: 'Go Home' }

  return (
    <div className="flex flex-col">
      <Hero
        title={status === 'loading' ? 'Verifying Payment...' :
               status === 'success' ? 'Payment Successful!' :
               status === 'pending' ? 'Payment Pending' : 'Payment Failed'}
        description={paymentTypeLabels[paymentType] || 'Payment Verification'}
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-2xl">
          {/* Loading State */}
          {status === 'loading' && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Verifying Your Payment</h3>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Success State */}
          {status === 'success' && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="py-8">
                <div className="text-center mb-6">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
                    Payment Successful!
                  </h3>
                  <p className="text-muted-foreground">
                    Your {paymentTypeLabels[paymentType]?.toLowerCase() || 'payment'} has been processed successfully.
                  </p>
                </div>

                {/* Payment Details */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment Details
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reference</p>
                      <p className="font-medium font-mono">{paymentData?.reference}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transaction ID</p>
                      <p className="font-medium font-mono">{paymentData?.transactionId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">K{paymentData?.amount?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium text-green-600 capitalize">{paymentData?.status}</p>
                    </div>
                  </div>

                  {/* Membership Specific Info */}
                  {paymentType === 'membership' && paymentData?.user && (
                    <div className="pt-4 border-t space-y-3">
                      <h5 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Membership Updated
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Membership Type</p>
                          <p className="font-medium capitalize">{paymentData.user.membershipType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium capitalize">{paymentData.user.membershipStatus}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Valid Until</p>
                          <p className="font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {paymentData.user.membershipExpiry
                              ? new Date(paymentData.user.membershipExpiry).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Donation Specific Info */}
                  {paymentType === 'donation' && paymentData?.donation && (
                    <div className="pt-4 border-t space-y-3">
                      <h5 className="font-medium">Donation Receipt</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Receipt Number</p>
                          <p className="font-medium">{paymentData.donation.receiptNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Donor</p>
                          <p className="font-medium">{paymentData.donation.donorName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium capitalize">
                            {paymentData.donation.donationType?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                  {paymentData?.receiptNumber && (
                    <Button
                      variant="default"
                      onClick={() => {
                        const apiUrl = import.meta.env.VITE_API_URL || '';
                        window.open(`${apiUrl}/api/lenco/receipt/${paymentData.receiptNumber}`, '_blank');
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate(redirect.path)}>
                    {redirect.label}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/')}>
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending State */}
          {status === 'pending' && (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="py-8">
                <div className="text-center mb-6">
                  <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
                    Payment Pending
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your payment is being processed. This may take a few moments.
                    Please check back shortly or contact support if it takes longer than expected.
                  </p>
                </div>

                {reference && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Payment Reference</p>
                    <p className="font-mono font-medium">{reference}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button onClick={handleRetry} disabled={retrying}>
                    {retrying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  You will receive an email confirmation once your payment is confirmed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="py-8">
                <div className="text-center mb-6">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
                    Payment Failed
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {error || 'We could not verify your payment. Please try again or contact support.'}
                  </p>
                </div>

                {reference && (
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Payment Reference</p>
                    <p className="font-mono font-medium">{reference}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button onClick={handleRetry} disabled={retrying}>
                    {retrying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(redirect.path)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Make New Payment
                  </Button>
                </div>

                <div className="text-center mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Need help?</p>
                  <Link
                    to="/contact"
                    className="text-primary hover:underline text-sm"
                  >
                    Contact Support
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
