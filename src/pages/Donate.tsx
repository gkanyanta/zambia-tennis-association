import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Heart, Users, Trophy, GraduationCap, Building2, Sparkles, CreditCard, Loader2 } from 'lucide-react'
import { lencoPaymentService } from '@/services/lencoPaymentService'
import { initializeLencoWidget } from '@/utils/lencoWidget'

const impactAreas = [
  {
    icon: Users,
    title: 'Youth Development',
    description: 'Support junior tennis programs and coaching for young players across Zambia',
    color: 'text-blue-500'
  },
  {
    icon: Trophy,
    title: 'Tournament Support',
    description: 'Help fund local and national tournaments, making tennis accessible to all',
    color: 'text-yellow-500'
  },
  {
    icon: GraduationCap,
    title: 'Coach Education',
    description: 'Fund ITF coaching courses and certifications for aspiring tennis coaches',
    color: 'text-green-500'
  },
  {
    icon: Building2,
    title: 'Infrastructure',
    description: 'Build and maintain tennis courts and facilities in underserved communities',
    color: 'text-purple-500'
  }
]

const donationOptions = [
  {
    amount: 'K100',
    impact: 'Provides tennis balls and equipment for a junior training session'
  },
  {
    amount: 'K500',
    impact: 'Sponsors a junior player\'s tournament entry fee for one event'
  },
  {
    amount: 'K1,000',
    impact: 'Funds a coaching workshop for community coaches'
  },
  {
    amount: 'K5,000',
    impact: 'Supports a regional development program for one month'
  },
  {
    amount: 'K10,000+',
    impact: 'Major contribution to facility improvement or national program'
  }
]

export function Donate() {
  const navigate = useNavigate()
  const [donationForm, setDonationForm] = useState({
    amount: '',
    donorName: '',
    donorEmail: '',
    donorPhone: '',
    donationType: 'general' as 'general' | 'youth_development' | 'tournament_support' | 'coach_education' | 'infrastructure',
    message: '',
    isAnonymous: false
  })
  const [processing, setProcessing] = useState(false)
  const [showOnlineForm, setShowOnlineForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onlineFormRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to online form when it becomes visible
  useEffect(() => {
    if (showOnlineForm && onlineFormRef.current) {
      setTimeout(() => {
        onlineFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [showOnlineForm])

  const handleQuickAmount = (amount: number) => {
    setDonationForm({ ...donationForm, amount: amount.toString() })
    setShowOnlineForm(true)
    setError(null)
  }

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)

    try {
      // Initialize donation with Lenco backend
      const paymentData = await lencoPaymentService.initializeDonation({
        amount: parseFloat(donationForm.amount),
        donorName: donationForm.donorName,
        donorEmail: donationForm.donorEmail,
        donorPhone: donationForm.donorPhone,
        donationType: donationForm.donationType,
        message: donationForm.message,
        isAnonymous: donationForm.isAnonymous
      })

      // Launch Lenco payment widget
      await initializeLencoWidget({
        key: paymentData.publicKey,
        reference: paymentData.reference,
        email: paymentData.email,
        amount: paymentData.amount,
        currency: 'ZMW',
        channels: ['card', 'mobile-money'],
        onSuccess: (response) => {
          // Redirect to verification page
          navigate(`/payment/verify?reference=${response.reference}&type=donation`)
        },
        onClose: () => {
          setProcessing(false)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${paymentData.reference}&type=donation&pending=true`)
        }
      })
    } catch (error: any) {
      console.error('Donation error:', error)
      setError(error.message || 'Failed to process donation. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Support Tennis Development in Zambia"
        description="Your donation helps us grow the game, develop young talent, and build a stronger tennis community"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-5xl">
          {/* Introduction */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Your Support Matters
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The Zambia Tennis Association relies on generous donations to develop tennis across the country.
              Your contribution directly impacts players, coaches, and communities, helping us build a vibrant
              tennis culture in Zambia.
            </p>
          </div>

          {/* Impact Areas */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
              Where Your Donation Goes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {impactAreas.map((area, index) => (
                <Card key={index} className="card-elevated-hover">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <area.icon className={`h-6 w-6 ${area.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg mb-2">{area.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{area.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Donation Options */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Your Impact</CardTitle>
              <p className="text-center text-muted-foreground">
                See how different donation amounts make a difference
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {donationOptions.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => handleQuickAmount(parseInt(option.amount.replace(/[^\d]/g, '')) || 0)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground mb-1">{option.amount}</div>
                        <div className="text-sm text-muted-foreground">{option.impact}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Donate
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Online Donation Form */}
          {showOnlineForm && (
            <Card ref={onlineFormRef} className="mb-12 border-primary/50">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-center text-2xl flex items-center justify-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Donate Online
                </CardTitle>
                <p className="text-center text-muted-foreground">
                  Secure payment via Lenco - Supports cards and mobile money (MTN, Airtel, Zamtel)
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <form onSubmit={handleDonationSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Donation Amount (ZMW) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        value={donationForm.amount}
                        onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="donationType">Donation Purpose</Label>
                      <Select
                        value={donationForm.donationType}
                        onValueChange={(value: any) => setDonationForm({ ...donationForm, donationType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Support</SelectItem>
                          <SelectItem value="youth_development">Youth Development</SelectItem>
                          <SelectItem value="tournament_support">Tournament Support</SelectItem>
                          <SelectItem value="coach_education">Coach Education</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="donorName">Full Name *</Label>
                      <Input
                        id="donorName"
                        value={donationForm.donorName}
                        onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })}
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="donorEmail">Email Address *</Label>
                      <Input
                        id="donorEmail"
                        type="email"
                        value={donationForm.donorEmail}
                        onChange={(e) => setDonationForm({ ...donationForm, donorEmail: e.target.value })}
                        placeholder="your.email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="donorPhone">Phone Number (Optional)</Label>
                    <Input
                      id="donorPhone"
                      type="tel"
                      value={donationForm.donorPhone}
                      onChange={(e) => setDonationForm({ ...donationForm, donorPhone: e.target.value })}
                      placeholder="+260 XXX XXXXXX"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      value={donationForm.message}
                      onChange={(e) => setDonationForm({ ...donationForm, message: e.target.value })}
                      placeholder="Share why you're supporting ZTA..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isAnonymous"
                      checked={donationForm.isAnonymous}
                      onChange={(e) => setDonationForm({ ...donationForm, isAnonymous: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isAnonymous" className="font-normal">
                      Make this donation anonymous
                    </Label>
                  </div>

                  <div className="flex justify-center gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowOnlineForm(false)}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="lg" disabled={processing}>
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Show Online Donation Button */}
          {!showOnlineForm && (
            <div className="mb-12 text-center">
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
                <CardContent className="pt-8 pb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    Donate Online Securely
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Make an instant donation using your card or mobile money (MTN, Airtel, Zamtel)
                  </p>
                  <Button size="lg" onClick={() => setShowOnlineForm(true)}>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Donate Online Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Bank Details */}
          <Card className="mb-12 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-center text-2xl">Alternative: Direct Bank Transfer</CardTitle>
              <p className="text-center text-muted-foreground text-sm">
                Prefer to donate directly? Use our bank account details below
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-4 text-lg">Bank Transfer</h4>
                  <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Account Name:</div>
                      <div className="col-span-2 font-medium">Zambia Tennis Association</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Bank:</div>
                      <div className="col-span-2 font-medium">Zambia National Commercial Bank</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Account Number:</div>
                      <div className="col-span-2 font-medium">5884377500166</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Branch:</div>
                      <div className="col-span-2 font-medium">Northmead</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Swift Code:</div>
                      <div className="col-span-2 font-medium">ZNCOZMLU</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Please email your deposit slip to info@zambiatennis.com for acknowledgment
                  </p>
                </div>

                <div className="text-center pt-4">
                  <Button size="lg" onClick={() => window.location.href = 'mailto:info@zambiatennis.com?subject=Donation Inquiry'}>
                    <Heart className="h-4 w-4 mr-2" />
                    Contact Us About Donating
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Corporate/Large Donations */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-8 pb-8 text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Interested in a Major Contribution?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                For corporate partnerships or large donations, we'd love to discuss how
                your support can create lasting impact in Zambian tennis.
              </p>
              <Button size="lg" variant="default" onClick={() => window.location.href = '/partnerships'}>
                Explore Partnership Opportunities
              </Button>
            </CardContent>
          </Card>

          {/* Tax Information */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              The Zambia Tennis Association is a registered non-profit organization.
              All donations are used to support tennis development programs across Zambia.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
