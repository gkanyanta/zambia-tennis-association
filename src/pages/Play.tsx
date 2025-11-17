import { Hero } from '@/components/Hero'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Clock, Users } from 'lucide-react'

const clubs = [
  {
    name: 'Lusaka Tennis Club',
    location: 'Lusaka',
    courts: 8,
    phone: '+260 211 123 456',
    hours: 'Mon-Sun: 6:00 AM - 9:00 PM',
    facilities: ['Hard Courts', 'Clubhouse', 'Pro Shop', 'Coaching'],
  },
  {
    name: 'Olympic Youth Development Centre',
    location: 'Lusaka',
    courts: 6,
    phone: '+260 211 234 567',
    hours: 'Mon-Sun: 7:00 AM - 8:00 PM',
    facilities: ['Hard Courts', 'Junior Programs', 'Coaching', 'Fitness Center'],
  },
  {
    name: 'Ndola Sports Complex',
    location: 'Ndola',
    courts: 6,
    phone: '+260 212 345 678',
    hours: 'Mon-Sun: 6:00 AM - 9:00 PM',
    facilities: ['Hard Courts', 'Clubhouse', 'Coaching', 'Equipment Rental'],
  },
  {
    name: 'Kitwe Tennis Centre',
    location: 'Kitwe',
    courts: 4,
    phone: '+260 212 456 789',
    hours: 'Mon-Sat: 7:00 AM - 8:00 PM',
    facilities: ['Hard Courts', 'Coaching', 'Junior Programs'],
  },
  {
    name: 'Livingstone Sports Complex',
    location: 'Livingstone',
    courts: 4,
    phone: '+260 213 567 890',
    hours: 'Mon-Sun: 6:00 AM - 8:00 PM',
    facilities: ['Hard Courts', 'Clubhouse', 'Coaching'],
  },
]

const services = [
  {
    icon: MapPin,
    title: 'Find a Club',
    description: 'Discover tennis clubs and facilities across Zambia',
  },
  {
    icon: Clock,
    title: 'Club Information',
    description: 'View operating hours and contact information for facilities',
  },
  {
    icon: Users,
    title: 'Get Coaching',
    description: 'Connect with certified coaches for private or group lessons',
  },
]

export function Play() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Play Tennis"
        description="Find clubs, view facilities, and get coaching across Zambia"
        gradient
      />

      {/* Services */}
      <section className="py-16 bg-muted/50">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Clubs */}
      <section className="py-16">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Tennis Clubs & Facilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club, index) => (
              <Card key={index} className="card-elevated-hover">
                <CardHeader>
                  <CardTitle>{club.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {club.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{club.courts} Courts</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{club.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{club.hours}</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        {club.facilities.map((facility, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button className="flex-1">Contact Club</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
