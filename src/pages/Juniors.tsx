import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Target, Users, BookOpen } from 'lucide-react'

const programs = [
  {
    icon: Target,
    title: 'Mini Tennis (Ages 5-8)',
    description: 'Introduction to tennis fundamentals through fun games and activities',
    features: [
      'Modified equipment and court sizes',
      'Focus on coordination and motor skills',
      '1-hour sessions, twice weekly',
      'Small group instruction (max 8 players)',
    ],
  },
  {
    icon: Trophy,
    title: 'Development Program (Ages 9-12)',
    description: 'Building technical skills and competitive mindset',
    features: [
      'Stroke development and technique',
      'Introduction to match play',
      'Regional tournament participation',
      'Physical conditioning basics',
    ],
  },
  {
    icon: Users,
    title: 'Competitive Program (Ages 13-18)',
    description: 'Elite training for aspiring national and international players',
    features: [
      'Advanced technical and tactical training',
      'National tournament circuit',
      'Strength and conditioning program',
      'Mental skills development',
    ],
  },
  {
    icon: BookOpen,
    title: 'Schools Partnership',
    description: 'Bringing tennis to schools across Zambia',
    features: [
      'In-school coaching programs',
      'Inter-school competitions',
      'Equipment provision',
      'Teacher training workshops',
    ],
  },
]

export function Juniors() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Junior Tennis Programs"
        description="Developing the next generation of Zambian tennis champions"
        primaryCta={{
          text: 'Register Your Child',
          href: '/membership',
        }}
        gradient
      />

      {/* Programs */}
      <section className="py-16">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Our Programs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Age-appropriate programs designed to develop skills, build confidence,
              and foster a love for tennis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {programs.map((program, index) => (
              <Card key={index} className="card-elevated-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <program.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{program.title}</CardTitle>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {program.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Benefits */}
          <div className="bg-muted/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
              Why Junior Tennis?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-2">💪</div>
                <h4 className="font-semibold text-foreground mb-2">Physical Development</h4>
                <p className="text-sm text-muted-foreground">
                  Improves coordination, agility, and overall fitness
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🧠</div>
                <h4 className="font-semibold text-foreground mb-2">Mental Growth</h4>
                <p className="text-sm text-muted-foreground">
                  Develops focus, discipline, and problem-solving skills
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🤝</div>
                <h4 className="font-semibold text-foreground mb-2">Social Skills</h4>
                <p className="text-sm text-muted-foreground">
                  Builds teamwork, sportsmanship, and lasting friendships
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
            Get Your Child Started Today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our junior programs and give your child the opportunity to develop skills,
            make friends, and reach their tennis potential
          </p>
          <Button size="lg">Contact Us for Registration</Button>
        </div>
      </section>
    </div>
  )
}
