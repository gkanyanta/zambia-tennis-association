import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Users, MapPin, TrendingUp } from 'lucide-react'

const initiatives = [
  {
    icon: Users,
    title: 'Grassroots Development',
    description: 'Expanding tennis access to communities across Zambia',
    goals: [
      'Establish tennis programs in 20 new schools by 2026',
      'Train 100 community coaches',
      'Provide equipment to underserved areas',
      'Create regional development centers',
    ],
  },
  {
    icon: MapPin,
    title: 'Infrastructure Growth',
    description: 'Building world-class tennis facilities nationwide',
    goals: [
      'Construct 10 new tennis courts in provincial centers',
      'Upgrade existing facilities to international standards',
      'Establish a national tennis academy',
      'Improve accessibility for all players',
    ],
  },
  {
    icon: Target,
    title: 'High Performance',
    description: 'Developing internationally competitive players',
    goals: [
      'Create elite player development pathway',
      'Secure international tournament participation',
      'Attract top-level coaching expertise',
      'Establish sports science support',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Organizational Excellence',
    description: 'Strengthening ZTA governance and operations',
    goals: [
      'Implement transparent governance structures',
      'Secure sustainable funding partnerships',
      'Enhance digital presence and member services',
      'Achieve ITF development program accreditation',
    ],
  },
]

export function Transformation() {
  return (
    <div className="flex flex-col">
      <Hero
        title="ZTA Transformation"
        description="Building a sustainable future for Zambian tennis through strategic development"
        gradient
      />

      {/* Vision & Mission */}
      <section className="py-16">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-2xl">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To be the leading tennis nation in Southern Africa, producing world-class
                  players and providing tennis opportunities for all Zambians.
                </p>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To promote, develop, and govern tennis in Zambia through inclusive programs,
                  excellent facilities, and transparent administration.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Strategic Pillars */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Strategic Pillars
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {initiatives.map((initiative, index) => (
                <Card key={index} className="card-elevated-hover">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <initiative.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{initiative.title}</CardTitle>
                    <CardDescription>{initiative.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold text-foreground mb-3">Key Goals:</h4>
                    <ul className="space-y-2">
                      {initiative.goals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">✓</span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-muted/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
              2025-2028 Roadmap
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 font-bold text-primary">2025</div>
                <div className="flex-1">
                  <p className="text-muted-foreground">
                    Launch grassroots programs in 5 provinces • Complete national
                    facility audit • Establish player development framework
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 font-bold text-primary">2026</div>
                <div className="flex-1">
                  <p className="text-muted-foreground">
                    Open 5 new regional tennis centers • Implement coach education
                    program • Launch digital member platform
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 font-bold text-primary">2027</div>
                <div className="flex-1">
                  <p className="text-muted-foreground">
                    Break ground on national tennis academy • Send first players to
                    ITF junior circuit • Achieve 5,000 active members
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-20 font-bold text-primary">2028</div>
                <div className="flex-1">
                  <p className="text-muted-foreground">
                    Host international tournament • Complete academy construction •
                    Establish Zambia as regional tennis hub
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
