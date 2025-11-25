import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Users, Trophy, GraduationCap, Building2, Sparkles } from 'lucide-react'

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
                    className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground mb-1">{option.amount}</div>
                        <div className="text-sm text-muted-foreground">{option.impact}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card className="mb-12 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-center text-2xl">How to Donate</CardTitle>
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
                    Please email your deposit slip to finance@zambiatennisassociation.com for acknowledgment
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-4 text-lg">Mobile Money</h4>
                  <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">MTN:</div>
                      <div className="col-span-2 font-medium">[MTN Number]</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Airtel:</div>
                      <div className="col-span-2 font-medium">[Airtel Number]</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-sm text-muted-foreground">Zamtel:</div>
                      <div className="col-span-2 font-medium">[Zamtel Number]</div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <Button size="lg" onClick={() => window.location.href = 'mailto:info@zambiatennisassociation.com?subject=Donation Inquiry'}>
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
                For corporate partnerships, sponsorships, or large donations, we'd love to discuss how
                your support can create lasting impact in Zambian tennis.
              </p>
              <Button size="lg" variant="default" onClick={() => window.location.href = '/sponsors'}>
                Explore Sponsorship Opportunities
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
