import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, MapPin } from 'lucide-react'

const events = [
  {
    date: 'Jan 20-22',
    month: 'January',
    title: 'ZTA Circuit Tournament #1',
    location: 'Various Clubs',
    type: 'Tournament',
  },
  {
    date: 'Feb 10-14',
    month: 'February',
    title: 'Junior Open Championship',
    location: 'Lusaka Tennis Club',
    type: 'Tournament',
  },
  {
    date: 'Feb 25-27',
    month: 'February',
    title: 'Madalas Invitational',
    location: 'Ndola Sports Complex',
    type: 'Tournament',
  },
  {
    date: 'Mar 5',
    month: 'March',
    title: 'Coaching Certification Workshop',
    location: 'Olympic Youth Development Centre',
    type: 'Education',
  },
  {
    date: 'Mar 15-20',
    month: 'March',
    title: 'National Championships 2025',
    location: 'Olympic Youth Development Centre, Lusaka',
    type: 'Tournament',
  },
  {
    date: 'Apr 5-8',
    month: 'April',
    title: 'Copperbelt Regional Open',
    location: 'Kitwe Tennis Centre',
    type: 'Tournament',
  },
  {
    date: 'Apr 18',
    month: 'April',
    title: 'ZTA Annual General Meeting',
    location: 'Lusaka',
    type: 'Meeting',
  },
  {
    date: 'May 12-15',
    month: 'May',
    title: 'Southern Province Championships',
    location: 'Livingstone Sports Complex',
    type: 'Tournament',
  },
]

const typeColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  Tournament: 'default',
  Education: 'secondary',
  Meeting: 'outline',
}

export function Calendar() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Events Calendar"
        description="Stay up-to-date with tournaments, training sessions, and ZTA events"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Events List */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Upcoming Events
              </h2>
              <div className="space-y-4">
                {events.map((event, index) => (
                  <Card key={index} className="card-elevated-hover">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-16 text-center">
                          <div className="text-3xl font-bold text-primary">
                            {event.date.split(' ')[0].split('-')[0]}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {event.month.slice(0, 3)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {event.title}
                            </h3>
                            <Badge variant={typeColors[event.type]}>
                              {event.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{event.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Tournament</Badge>
                    <span className="text-sm text-muted-foreground">
                      Competitive Events
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Education</Badge>
                    <span className="text-sm text-muted-foreground">
                      Training & Workshops
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Meeting</Badge>
                    <span className="text-sm text-muted-foreground">
                      Official Meetings
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscribe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get event reminders and updates delivered to your email
                  </p>
                  <button className="btn-primary w-full">
                    Subscribe to Calendar
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
