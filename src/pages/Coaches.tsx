import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Award, BookOpen, Users, GraduationCap } from 'lucide-react'

const coaches = [
  {
    name: 'Michael Banda',
    level: 'ITF Level 3',
    specialization: 'High Performance',
    location: 'Lusaka Tennis Club',
    experience: '15 years',
  },
  {
    name: 'Sarah Tembo',
    level: 'ITF Level 2',
    specialization: 'Junior Development',
    location: 'Olympic Youth Development Centre',
    experience: '10 years',
  },
  {
    name: 'Patrick Mwale',
    level: 'ITF Level 2',
    specialization: 'Adult Programs',
    location: 'Ndola Sports Complex',
    experience: '12 years',
  },
  {
    name: 'Grace Phiri',
    level: 'ITF Level 1',
    specialization: 'Beginner & Intermediate',
    location: 'Kitwe Tennis Centre',
    experience: '7 years',
  },
]

const certificationLevels = [
  {
    level: 'Level 1 - Club Coach',
    description: 'Introduction to coaching fundamentals',
    content: [
      'Basic coaching principles',
      'Stroke technique fundamentals',
      'Group management skills',
      'Safety and first aid',
    ],
  },
  {
    level: 'Level 2 - Advanced Coach',
    description: 'Intermediate coaching techniques',
    content: [
      'Advanced stroke mechanics',
      'Tactical development',
      'Player assessment',
      'Program planning',
    ],
  },
  {
    level: 'Level 3 - Master Coach',
    description: 'Elite coaching certification',
    content: [
      'High-performance training',
      'Periodization and planning',
      'Sports science integration',
      'Coach mentoring',
    ],
  },
]

export function Coaches() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Coaches & Education"
        description="Developing world-class coaches to grow Zambian tennis"
        gradient
      />

      {/* Coach Directory */}
      <section className="py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Find a Coach
              </h2>
              <p className="text-muted-foreground">
                Connect with certified coaches across Zambia
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {coaches.map((coach, index) => (
              <Card key={index} className="card-elevated-hover">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-center">{coach.name}</CardTitle>
                  <div className="flex justify-center">
                    <Badge variant="default">{coach.level}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Specialization:</strong> {coach.specialization}</p>
                    <p><strong>Location:</strong> {coach.location}</p>
                    <p><strong>Experience:</strong> {coach.experience}</p>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    Contact Coach
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Certification Levels */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              Coaching Certification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {certificationLevels.map((cert, index) => (
                <Card key={index} className="card-elevated-hover">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{cert.level}</CardTitle>
                    <CardDescription>{cert.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {cert.content.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-muted/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
              Why Get Certified?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Recognition</h4>
                <p className="text-sm text-muted-foreground">
                  ITF-recognized certification
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Education</h4>
                <p className="text-sm text-muted-foreground">
                  World-class coaching methods
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Network</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with coaches nationwide
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Growth</h4>
                <p className="text-sm text-muted-foreground">
                  Continuous development path
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/50">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Become a Certified Coach
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our next coaching certification course and start your journey
            to becoming a qualified tennis coach
          </p>
          <Button size="lg">Register for Next Course</Button>
        </div>
      </section>
    </div>
  )
}
