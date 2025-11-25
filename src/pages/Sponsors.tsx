import { useState } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Users,
  GraduationCap,
  Building2,
  Star,
  CheckCircle,
  TrendingUp,
  Target,
  Award,
  Handshake
} from 'lucide-react'

const sponsorshipTiers = [
  {
    name: 'Platinum',
    amount: 'K50,000+',
    period: 'year',
    color: 'from-slate-400 to-slate-600',
    icon: Star,
    featured: true,
    benefits: [
      'Title sponsorship of major tournaments',
      'Logo on all marketing materials',
      'VIP hospitality at all events (10 passes)',
      'Naming rights for tournaments',
      'Featured placement on website homepage',
      'Extensive social media coverage',
      'Quarterly impact reports',
      'Executive networking opportunities',
      'Custom branding opportunities',
      'First right of refusal for next year'
    ]
  },
  {
    name: 'Gold',
    amount: 'K20,000 - K49,999',
    period: 'year',
    color: 'from-yellow-400 to-yellow-600',
    icon: Award,
    benefits: [
      'Co-sponsorship of tournaments/programs',
      'Logo on event materials',
      'Event hospitality passes (5 passes)',
      'Premium website recognition',
      'Regular social media mentions',
      'Semi-annual impact reports',
      'Brand visibility at major events',
      'Partnership certificate'
    ]
  },
  {
    name: 'Silver',
    amount: 'K5,000 - K19,999',
    period: 'year',
    color: 'from-gray-300 to-gray-500',
    icon: Trophy,
    benefits: [
      'Program-specific sponsorship',
      'Logo on program materials',
      'Website sponsor listing',
      'Social media recognition',
      'Annual impact report',
      'Event hospitality (2 passes)',
      'Partnership certificate'
    ]
  },
  {
    name: 'Bronze',
    amount: 'K1,000 - K4,999',
    period: 'year',
    color: 'from-amber-600 to-amber-800',
    icon: Handshake,
    benefits: [
      'Supporting sponsor status',
      'Website listing',
      'Social media thank you post',
      'Annual report',
      'Partnership certificate'
    ]
  }
]

const sponsorshipCategories = [
  {
    icon: Trophy,
    title: 'Tournament Sponsorship',
    description: 'Support competitive tennis events across Zambia',
    examples: ['National Championships', 'Regional Tournaments', 'Junior Events', 'Club Leagues'],
    color: 'text-yellow-500'
  },
  {
    icon: Users,
    title: 'Development Programs',
    description: 'Invest in growing the game and developing talent',
    examples: ['Junior Development', 'Coach Education', 'School Programs', 'Grassroots Initiatives'],
    color: 'text-blue-500'
  },
  {
    icon: Building2,
    title: 'Infrastructure',
    description: 'Build the foundation for Zambian tennis',
    examples: ['Court Construction', 'Equipment Provision', 'Facility Upgrades', 'Mobile Units'],
    color: 'text-green-500'
  },
  {
    icon: GraduationCap,
    title: 'Player Support',
    description: 'Help talented players reach their potential',
    examples: ['Scholarships', 'Travel Grants', 'Training Camps', 'Equipment Sponsorships'],
    color: 'text-purple-500'
  }
]

const impactStats = [
  { number: '500+', label: 'Junior Players Reached', icon: Users },
  { number: '25+', label: 'Annual Tournaments', icon: Trophy },
  { number: '10+', label: 'Affiliated Clubs', icon: Building2 },
  { number: '30+', label: 'Certified Coaches', icon: GraduationCap }
]

export function Sponsors() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    interest: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Simulate submission
    setTimeout(() => {
      alert('Thank you for your interest! We will contact you within 48 hours.')
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        interest: '',
        message: ''
      })
      setSubmitting(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Partner with ZTA"
        description="Join us in developing tennis excellence across Zambia. Together, we can create opportunities and transform lives through sport."
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Introduction */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Partner with ZTA?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Sponsoring the Zambia Tennis Association means investing in youth development,
              community health, and national sporting excellence. Your partnership creates
              lasting impact while enhancing your brand's visibility and reputation.
            </p>

            {/* Impact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {impactStats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 mx-auto">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sponsorship Tiers */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
              Sponsorship Packages
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Choose a partnership level that aligns with your goals and budget.
              All packages can be customized to meet your specific needs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sponsorshipTiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`card-elevated-hover relative overflow-hidden ${tier.featured ? 'border-primary border-2' : ''}`}
                >
                  {tier.featured && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  )}
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4`}>
                      <tier.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                    <div className="text-muted-foreground">
                      <div className="text-2xl font-bold text-foreground">{tier.amount}</div>
                      <div className="text-sm">per {tier.period}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sponsorship Categories */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
              Sponsorship Opportunities
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Choose what matters most to you. Support specific programs that align with your
              corporate values and community engagement goals.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sponsorshipCategories.map((category, index) => (
                <Card key={index} className="card-elevated-hover">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <category.icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{category.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {category.examples.map((example, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-20 bg-muted/50 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              What You Get as a Sponsor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Brand Visibility</h3>
                <p className="text-sm text-muted-foreground">
                  Reach thousands of tennis enthusiasts, families, and community members through
                  events, digital platforms, and media coverage
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Community Impact</h3>
                <p className="text-sm text-muted-foreground">
                  Demonstrate corporate social responsibility while making a real difference
                  in youth development and sports growth
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Handshake className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Networking</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with business leaders, government officials, and community stakeholders
                  at exclusive events
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Express Your Interest</CardTitle>
              <p className="text-center text-muted-foreground">
                Fill out the form below and our partnership team will contact you within 48 hours
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="interest">Area of Interest</Label>
                  <Input
                    id="interest"
                    placeholder="e.g., Tournament Sponsorship, Junior Development"
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your sponsorship goals and how you'd like to partner with ZTA..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Inquiry'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Additional Contact Info */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Or contact us directly at{' '}
              <a href="mailto:partnerships@zambiatennisassociation.com" className="text-primary hover:underline">
                partnerships@zambiatennisassociation.com
              </a>
              {' '}or call{' '}
              <a href="tel:+260123456789" className="text-primary hover:underline">
                +260 123 456 789
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
