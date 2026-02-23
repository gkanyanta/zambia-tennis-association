import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Award, BookOpen, Users, GraduationCap, MapPin, Mail, Phone } from 'lucide-react'
import { coachService, type Coach } from '@/services/coachService'

const certificationLevels = [
  {
    level: 'Play Tennis Course',
    description: 'Entry-level introduction to coaching tennis',
    content: [
      'Introduction to teaching tennis',
      'Basic rally and scoring knowledge',
      'Organizing beginner group sessions',
      'Safety awareness on court',
      'Ideal for parents, teachers & volunteers',
    ],
  },
  {
    level: 'ITF Level 1 - CBI',
    description: 'Coaching Beginner & Intermediate players',
    content: [
      'Fundamental stroke technique & correction',
      'Lesson planning for beginners & intermediates',
      'On-court communication & demonstration',
      'Managing groups and class programs',
      'Introduction to physical development',
    ],
  },
  {
    level: 'ITF Level 2 - CAP',
    description: 'Coaching Advanced Players',
    content: [
      'Advanced stroke mechanics & tactics',
      'Developing competitive match play',
      'Periodization & tournament planning',
      'Player assessment & individual programs',
      'Sports science fundamentals (fitness, nutrition, psychology)',
    ],
  },
  {
    level: 'ITF Level 3 - HP',
    description: 'High Performance coaching',
    content: [
      'Elite player development pathways',
      'Advanced periodization & peaking',
      'Biomechanics & performance analysis',
      'Sports psychology & mental conditioning',
      'Coach mentoring & leadership',
    ],
  },
]

export function Coaches() {
  const navigate = useNavigate()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterClub, setFilterClub] = useState<string>('all')

  useEffect(() => {
    fetchCoaches()
  }, [])

  const fetchCoaches = async () => {
    try {
      setLoading(true)
      const data = await coachService.getActiveCoaches()
      setCoaches(data)
    } catch (err: any) {
      console.error('Failed to load coaches:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCoaches = coaches.filter(coach => {
    const matchesLevel = filterLevel === 'all' || coach.itfLevel === filterLevel
    const matchesClub = filterClub === 'all' || coach.club._id === filterClub
    return matchesLevel && matchesClub
  })

  const uniqueClubs = Array.from(new Set(coaches.map(c => c.club._id)))
    .map(id => coaches.find(c => c.club._id === id)?.club)
    .filter(Boolean) as Array<{ _id: string; name: string }>

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Find a Coach
              </h2>
              <p className="text-muted-foreground">
                Connect with certified coaches across Zambia
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ITF Level 1">ITF Level 1</SelectItem>
                  <SelectItem value="ITF Level 2">ITF Level 2</SelectItem>
                  <SelectItem value="ITF Level 3">ITF Level 3</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterClub} onValueChange={setFilterClub}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {uniqueClubs.map((club) => (
                    <SelectItem key={club._id} value={club._id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading coaches...</p>
            </div>
          ) : filteredCoaches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No coaches found. {filterLevel !== 'all' || filterClub !== 'all' ? 'Try adjusting your filters.' : 'Check back soon!'}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {filteredCoaches.map((coach) => (
                <Card
                  key={coach._id}
                  className="card-elevated-hover cursor-pointer"
                  onClick={() => navigate(`/coaches/${coach._id}`)}
                >
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full mb-4 mx-auto overflow-hidden border-2 border-border">
                      {coach.profileImage ? (
                        <img
                          src={coach.profileImage}
                          alt={`${coach.firstName} ${coach.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-center">{coach.fullName || `${coach.firstName} ${coach.lastName}`}</CardTitle>
                    <div className="flex justify-center">
                      <Badge variant="default">{coach.itfLevel}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {coach.specializations && coach.specializations.length > 0 && (
                        <p><strong>Specialization:</strong> {coach.specializations[0]}</p>
                      )}
                      <p className="flex items-center justify-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {coach.club.name}
                      </p>
                      <p><strong>Experience:</strong> {coach.experience} years</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {coach.preferredContactMethod !== 'phone' && (
                        <Button
                          className="flex-1"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `mailto:${coach.email}`
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {coach.preferredContactMethod !== 'email' && (
                        <Button
                          className="flex-1"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `tel:${coach.phone}`
                          }}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Certification Levels */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              ITF Coaching Pathway
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
