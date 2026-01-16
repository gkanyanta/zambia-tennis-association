import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Users,
  User,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award
} from 'lucide-react'
import { membershipService, MembershipType, SubscriptionStatus } from '@/services/membershipService'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import { useAuth } from '@/context/AuthContext'

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

export function MembershipPayment() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch membership types and current subscription
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const types = await membershipService.getPlayerMembershipTypes()
        setMembershipTypes(types)

        // Fetch subscription status if logged in
        if (isAuthenticated) {
          try {
            const status = await membershipService.getMySubscription()
            setSubscriptionStatus(status)
          } catch (err) {
            // Not logged in or error - subscription status is optional
            console.log('Could not fetch subscription status')
          }
        }
      } catch (err) {
        console.error('Failed to fetch membership types:', err)
        setError('Failed to load membership options. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)
    setError(null)
  }

  const handlePayment = async () => {
    if (!selectedPlan) {
      setError('Please select a membership plan')
      return
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=/membership/pay')
      return
    }

    // Check if already has active subscription
    if (subscriptionStatus?.hasActiveSubscription) {
      setError(`You already have an active membership for ${subscriptionStatus.currentYear}. It expires on December 31, ${subscriptionStatus.currentYear}.`)
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Initialize payment with new membership service
      const paymentData = await membershipService.initializePayment(selectedPlan)

      // Launch Lenco widget
      await initializeLencoWidget({
        key: paymentData.publicKey,
        reference: paymentData.reference,
        email: paymentData.email,
        amount: paymentData.amount,
        currency: (paymentData.currency || 'ZMW') as 'ZMW' | 'USD',
        channels: ['card', 'mobile-money'],
        onSuccess: (response) => {
          // Redirect to verification page
          navigate(`/payment/verify?reference=${response.reference}&type=membership`)
        },
        onClose: () => {
          setProcessing(false)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${paymentData.reference}&type=membership&pending=true`)
        }
      })
    } catch (err: any) {
      console.error('Payment initialization failed:', err)
      setError(err.message || 'Failed to initialize payment. Please try again.')
      setProcessing(false)
    }
  }

  const selectedPlanData = membershipTypes.find(p => p._id === selectedPlan)
  const currentYear = new Date().getFullYear()

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero
          title="ZPIN Membership"
          description="Join the Zambia Tennis Association"
          gradient
        />
        <section className="py-16">
          <div className="container-custom max-w-5xl">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading membership options...</span>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="ZPIN Membership"
        description="Register for your Zambia Player Identification Number and become an official ZTA member"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-5xl">
          {/* Introduction */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Choose Your ZPIN Membership
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your ZPIN (Zambia Player Identification Number) is your unique identifier in Zambian tennis.
              It's required for tournament participation and official ZTA rankings.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>All memberships expire December 31, {currentYear}</span>
            </div>
          </div>

          {/* Already has active subscription warning */}
          {subscriptionStatus?.hasActiveSubscription && subscriptionStatus.subscription && (
            <Card className="mb-8 border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                      You Have an Active Membership
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Type:</strong> {subscriptionStatus.subscription.membershipTypeName}</p>
                      {subscriptionStatus.subscription.zpin && (
                        <p><strong>ZPIN:</strong> {subscriptionStatus.subscription.zpin}</p>
                      )}
                      <p><strong>Valid Until:</strong> December 31, {subscriptionStatus.currentYear}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Membership Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {membershipTypes.map((plan) => {
              const Icon = iconMap[plan.code] || User
              const bgColor = colorMap[plan.code] || 'bg-gray-500'
              const isPopular = plan.code === 'zpin_senior'

              return (
                <Card
                  key={plan._id}
                  className={`relative cursor-pointer transition-all ${
                    selectedPlan === plan._id
                      ? 'border-primary ring-2 ring-primary shadow-lg'
                      : 'hover:border-primary/50 hover:shadow-md'
                  } ${subscriptionStatus?.hasActiveSubscription ? 'opacity-60 pointer-events-none' : ''}`}
                  onClick={() => !subscriptionStatus?.hasActiveSubscription && handleSelectPlan(plan._id)}
                >
                  {isPopular && !subscriptionStatus?.hasActiveSubscription && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    {plan.minAge !== null && (
                      <Badge variant="outline" className="mt-2">
                        {plan.minAge}+ years
                      </Badge>
                    )}
                    {plan.maxAge !== null && (
                      <Badge variant="outline" className="mt-2">
                        Under {plan.maxAge + 1} years
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold">K{plan.amount}</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <ul className="text-sm space-y-2 text-left">
                      {plan.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    {selectedPlan === plan._id && (
                      <div className="mt-4 pt-4 border-t">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Selected
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Payment Summary */}
          {selectedPlanData && !subscriptionStatus?.hasActiveSubscription && (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <h3 className="font-semibold text-lg">
                      {selectedPlanData.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Valid until December 31, {currentYear}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">K{selectedPlanData.amount}</p>
                  </div>
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
                        Pay Now
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Not Selected State */}
          {!selectedPlanData && !subscriptionStatus?.hasActiveSubscription && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Select a membership plan above to proceed with payment
              </p>
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

          {/* Current User Status */}
          {isAuthenticated && user && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Your ZTA Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {(user as any).firstName} {(user as any).lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ZPIN</p>
                    <p className="font-medium font-mono">
                      {(user as any).zpin || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={
                      (user as any).membershipStatus === 'active' ? 'default' : 'secondary'
                    }>
                      {(user as any).membershipStatus || 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry</p>
                    <p className="font-medium">
                      {(user as any).membershipExpiry
                        ? new Date((user as any).membershipExpiry).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Login Prompt */}
          {!isAuthenticated && (
            <Card className="mt-8 bg-muted/50">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please log in or create an account to purchase a ZPIN membership
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" onClick={() => navigate('/login?redirect=/membership/pay')}>
                    Log In
                  </Button>
                  <Button onClick={() => navigate('/register?redirect=/membership/pay')}>
                    Create Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bank Transfer Option */}
          <Card className="mt-8 border-dashed">
            <CardContent className="py-6">
              <h4 className="font-semibold text-center mb-4">
                Prefer Bank Transfer or Mobile Money?
              </h4>
              <p className="text-sm text-muted-foreground text-center mb-4">
                You can also pay via bank transfer or mobile money. Contact ZTA to process your membership manually.
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
