import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Search, CreditCard, Loader2, CheckCircle2, Clock,
  AlertCircle, XCircle
} from 'lucide-react'
import {
  playerRegistrationService,
  type RegistrationLookupResponse
} from '@/services/playerRegistrationService'
import { initializeLencoWidget } from '@/utils/lencoWidget'

export function RegisterPlayerPay() {
  const navigate = useNavigate()
  const [referenceNumber, setReferenceNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [registration, setRegistration] = useState<RegistrationLookupResponse | null>(null)

  const handleLookup = async () => {
    if (!referenceNumber.trim()) {
      setError('Please enter your reference number')
      return
    }

    try {
      setLoading(true)
      setError('')
      setRegistration(null)
      const data = await playerRegistrationService.lookupByReference(referenceNumber.trim())
      setRegistration(data)
      if (data.email) setEmail(data.email)
    } catch (err: any) {
      setError(err.message || 'Registration not found')
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async () => {
    if (!registration) return

    if (!email) {
      setError('Email is required for online payment')
      return
    }

    try {
      setPaying(true)
      setError('')

      const paymentData = await playerRegistrationService.initializePayLaterPayment(
        registration.referenceNumber,
        email
      )

      await initializeLencoWidget({
        key: paymentData.publicKey,
        reference: paymentData.paymentReference,
        email: paymentData.email,
        amount: paymentData.amount,
        currency: 'ZMW',
        onSuccess: (response) => {
          navigate(`/payment/verify?reference=${response.reference}&type=registration`)
        },
        onClose: () => {
          setPaying(false)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${paymentData.paymentReference}&type=registration&pending=true`)
        }
      })
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
      setPaying(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" /> Pending Payment</Badge>
      case 'pending_approval':
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><Clock className="h-3 w-3 mr-1" /> Pending Approval</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Complete Registration Payment"
        description="Enter your reference number to complete payment for your ZPIN registration"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-lg">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Lookup Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Find Your Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="refNumber">Reference Number</Label>
                <Input
                  id="refNumber"
                  value={referenceNumber}
                  onChange={(e) => {
                    setReferenceNumber(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g. REG-1234567890-ABC123"
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
              </div>
              <Button onClick={handleLookup} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Look Up Registration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Registration Details */}
          {registration && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Registration Details</CardTitle>
                  {getStatusBadge(registration.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{registration.firstName} {registration.lastName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Membership Type</p>
                    <p className="font-medium">{registration.membershipTypeName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">K{registration.paymentAmount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {new Date(registration.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {registration.status === 'pending_payment' && (
                  <div className="pt-4 border-t space-y-4">
                    <div>
                      <Label htmlFor="payEmail">Email for Payment *</Label>
                      <Input
                        id="payEmail"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError('') }}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <Button
                      onClick={handlePay}
                      disabled={paying}
                      className="w-full"
                      size="lg"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay K{registration.paymentAmount}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {registration.status === 'pending_approval' && (
                  <div className="pt-4 border-t text-center">
                    <CheckCircle2 className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                    <p className="font-medium">Payment received!</p>
                    <p className="text-sm text-muted-foreground">
                      Your application is pending admin approval. You will be notified once reviewed.
                    </p>
                  </div>
                )}

                {registration.status === 'approved' && (
                  <div className="pt-4 border-t text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-700">Registration Approved!</p>
                    <p className="text-sm text-muted-foreground">
                      Your ZPIN has been issued. Check your email for details.
                    </p>
                  </div>
                )}

                {registration.status === 'rejected' && (
                  <div className="pt-4 border-t text-center">
                    <XCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                    <p className="font-medium text-red-700">Registration Rejected</p>
                    <p className="text-sm text-muted-foreground">
                      Please contact ZTA for more information.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Link to register */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Don't have a reference number?</p>
            <Button variant="link" onClick={() => navigate('/register-player')}>
              Register as a New Player
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
