import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Users,
  User,
  UserCheck,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { lencoPaymentService } from '@/services/lencoPaymentService'
import { initializeLencoWidget } from '@/utils/lencoWidget'
import { useAuth } from '@/context/AuthContext'

const membershipPlans = [
  {
    id: 'junior',
    name: 'Junior Membership',
    price: 200,
    description: 'For players under 18 years old',
    icon: User,
    features: [
      'Access to junior tournaments',
      'Official ZTA ranking',
      'Development programs access',
      'Junior coaching sessions'
    ],
    color: 'bg-blue-500'
  },
  {
    id: 'adult',
    name: 'Adult Membership',
    price: 400,
    description: 'For players 18 years and above',
    icon: UserCheck,
    features: [
      'Access to all tournaments',
      'Official ZTA ranking',
      'League participation',
      'Coaching resources'
    ],
    color: 'bg-green-500',
    popular: true
  },
  {
    id: 'family',
    name: 'Family Membership',
    price: 750,
    description: 'For families with multiple players',
    icon: Users,
    features: [
      'Up to 4 family members',
      'Access to all tournaments',
      'Official ZTA rankings',
      'Family events access'
    ],
    color: 'bg-purple-500'
  }
]

export function MembershipPayment() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    setProcessing(true)
    setError(null)

    try {
      // Initialize payment with backend
      const paymentData = await lencoPaymentService.initializeMembershipPayment(
        selectedPlan as 'junior' | 'adult' | 'family'
      )

      // Launch Lenco widget
      await initializeLencoWidget({
        key: paymentData.publicKey,
        reference: paymentData.reference,
        email: paymentData.email,
        amount: paymentData.amount,
        currency: 'ZMW',
        channels: ['card', 'mobile-money'],
        onSuccess: (response) => {
          // Redirect to verification page
          navigate(`/payment/verify?reference=${response.reference}&type=membership`)
        },
        onClose: () => {
          setProcessing(false)
        },
        onConfirmationPending: () => {
          // Handle pending state - redirect to verify page anyway
          navigate(`/payment/verify?reference=${paymentData.reference}&type=membership&pending=true`)
        }
      })
    } catch (err: any) {
      console.error('Payment initialization failed:', err)
      setError(err.message || 'Failed to initialize payment. Please try again.')
      setProcessing(false)
    }
  }

  const selectedPlanData = membershipPlans.find(p => p.id === selectedPlan)

  return (
    <div className="flex flex-col">
      <Hero
        title="Become a ZTA Member"
        description="Join the Zambia Tennis Association and unlock access to tournaments, rankings, and more"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-5xl">
          {/* Introduction */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Choose Your Membership Plan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the membership that best fits your needs. All memberships are valid for one year
              and include official ZTA ranking eligibility.
            </p>
          </div>

          {/* Membership Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {membershipPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-primary ring-2 ring-primary shadow-lg'
                    : 'hover:border-primary/50 hover:shadow-md'
                }`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 rounded-full ${plan.color} flex items-center justify-center mx-auto mb-3`}>
                    <plan.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">K{plan.price}</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                  <ul className="text-sm space-y-2 text-left">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {selectedPlan === plan.id && (
                    <div className="mt-4 pt-4 border-t">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Selected
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Payment Summary */}
          {selectedPlanData && (
            <Card className="mb-8 border-primary/30 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <h3 className="font-semibold text-lg">
                      {selectedPlanData.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Valid for 1 year from payment date
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">K{selectedPlanData.price}</p>
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
          {!selectedPlanData && (
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
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <span className="text-xs">Accepts:</span>
              <Badge variant="outline">Visa/Mastercard</Badge>
              <Badge variant="outline">MTN Mobile Money</Badge>
              <Badge variant="outline">Airtel Money</Badge>
            </div>
          </div>

          {/* Current Membership Status */}
          {isAuthenticated && user && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Your Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Member Status</p>
                    <p className="font-medium capitalize">
                      {(user as any).membershipStatus || 'Not a member'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Membership Type</p>
                    <p className="font-medium capitalize">
                      {(user as any).membershipType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">
                      {(user as any).membershipExpiry
                        ? new Date((user as any).membershipExpiry).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Payment</p>
                    <p className="font-medium">
                      {(user as any).lastPaymentDate
                        ? new Date((user as any).lastPaymentDate).toLocaleDateString()
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
                  Please log in or create an account to purchase a membership
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
        </div>
      </section>
    </div>
  )
}
