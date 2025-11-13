import { Hero } from '@/components/Hero'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Heart, Users, Calendar } from 'lucide-react'

const categories = [
  {
    age: '35+',
    description: 'Competitive players aged 35 and above',
    tournaments: 'National and Regional events',
  },
  {
    age: '45+',
    description: 'Veterans category for experienced players',
    tournaments: 'Madalas Circuit and Championships',
  },
  {
    age: '55+',
    description: 'Senior players maintaining active competition',
    tournaments: 'Senior Madalas events',
  },
]

const benefits = [
  {
    icon: Heart,
    title: 'Stay Active & Healthy',
    description: 'Tennis provides excellent cardiovascular exercise while being easy on joints',
  },
  {
    icon: Users,
    title: 'Social Connection',
    description: 'Meet fellow players and build friendships through regular play',
  },
  {
    icon: Trophy,
    title: 'Competitive Play',
    description: 'Participate in age-appropriate tournaments across Zambia',
  },
  {
    icon: Calendar,
    title: 'Flexible Schedule',
    description: 'Regular social play and organized events to fit your lifestyle',
  },
]

export function Madalas() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Madalas Tennis"
        description="For veterans, retired professionals, and social players - competitive tennis for players 35 and over"
        primaryCta={{
          text: 'Join Madalas Program',
          href: '/membership',
        }}
        gradient
      />

      {/* Age Categories */}
      <section className="py-16">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Age Categories
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Competitive divisions designed for players at every stage
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {categories.map((category, index) => (
              <Card key={index} className="card-elevated-hover text-center">
                <CardHeader>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {category.age}
                  </div>
                  <CardTitle>{category.description}</CardTitle>
                  <CardDescription>{category.tournaments}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="card-elevated-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Program Features */}
      <section className="py-16 bg-muted/50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              What We Offer
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Tournaments & Events
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Annual Madalas National Championships</li>
                  <li>• Regional Madalas tournaments</li>
                  <li>• Monthly social round-robins</li>
                  <li>• Inter-club Madalas leagues</li>
                  <li>• Special invitational events</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Support & Resources
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Age-specific training programs</li>
                  <li>• Injury prevention workshops</li>
                  <li>• Fitness and conditioning guidance</li>
                  <li>• Access to qualified coaches</li>
                  <li>• Equipment advice and support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Never Too Late to Compete
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our Madalas program and discover the joy of competitive tennis
            with players your own age - perfect for veterans, retired professionals, and social players
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">Join Now</Button>
            <Button size="lg" variant="outline">View Tournament Schedule</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
