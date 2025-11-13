import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Eye, Award, Users } from 'lucide-react'

const leadership = [
  {
    name: 'Dr. John Mwanza',
    position: 'President',
    bio: 'Leading ZTA\'s transformation and development initiatives',
  },
  {
    name: 'Grace Tembo',
    position: 'Vice President',
    bio: 'Overseeing junior development and women\'s tennis programs',
  },
  {
    name: 'Michael Phiri',
    position: 'Secretary General',
    bio: 'Managing day-to-day operations and member services',
  },
  {
    name: 'Patricia Banda',
    position: 'Treasurer',
    bio: 'Financial management and fundraising initiatives',
  },
]

const milestones = [
  { year: '1989', event: 'ZTA officially established' },
  { year: '1995', event: 'Joined International Tennis Federation' },
  { year: '2005', event: 'Hosted first international tournament' },
  { year: '2010', event: 'Launched national junior program' },
  { year: '2018', event: 'Opened Olympic Youth Development Centre' },
  { year: '2025', event: 'Initiated transformation strategy' },
]

export function About() {
  return (
    <div className="flex flex-col">
      <Hero
        title="About ZTA"
        description="The official governing body for tennis in Zambia since 1989"
        gradient
      />

      {/* Mission, Vision, Values */}
      <section className="py-16">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="card-elevated text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  To promote, develop, and govern tennis in Zambia through inclusive
                  programs, excellent facilities, and transparent administration.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  To be the leading tennis nation in Southern Africa, producing
                  world-class players and providing opportunities for all Zambians.
                </p>
              </CardContent>
            </Card>

            <Card className="card-elevated text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Our Values</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Excellence, Integrity, Inclusion, Development, and Community
                  guide everything we do.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Our History
            </h2>
            <Card className="card-elevated">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-6">
                  The Zambia Tennis Association was founded in 1989 to organize and
                  promote tennis throughout the country. Since then, we have grown
                  from a small group of enthusiasts to a nationwide organization
                  serving thousands of players.
                </p>
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-4 items-center">
                      <div className="flex-shrink-0 w-16 font-bold text-primary">
                        {milestone.year}
                      </div>
                      <div className="flex-1 border-l-2 border-primary pl-4 py-2">
                        <p className="text-muted-foreground">{milestone.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leadership */}
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Leadership Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {leadership.map((leader, index) => (
                <Card key={index} className="card-elevated-hover text-center">
                  <CardHeader>
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                      <Users className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{leader.name}</CardTitle>
                    <CardDescription className="font-semibold text-primary">
                      {leader.position}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{leader.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Affiliations */}
      <section className="py-16 bg-muted/50">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Affiliations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>ITF</CardTitle>
                <CardDescription>International Tennis Federation</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle>CAT</CardTitle>
                <CardDescription>Confederation of African Tennis</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle>NSCZ</CardTitle>
                <CardDescription>National Sports Council of Zambia</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
