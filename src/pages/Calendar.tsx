import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, MapPin, Loader2 } from 'lucide-react'
import { calendarService, CalendarEvent } from '@/services/calendarService'

const typeColors: Record<string, string> = {
  tournament: 'bg-blue-500',
  education: 'bg-green-500',
  meeting: 'bg-purple-500',
  social: 'bg-orange-500',
  other: 'bg-gray-500',
}

const typeLabels: Record<string, string> = {
  tournament: 'Tournament',
  education: 'Education',
  meeting: 'Meeting',
  social: 'Social',
  other: 'Other',
}

export function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await calendarService.getEvents({ upcoming: true })
      setEvents(data)
    } catch (err: any) {
      console.error('Failed to fetch events:', err)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    const startDay = startDate.getDate()
    const endDay = endDate.getDate()
    const month = startDate.toLocaleDateString('en-GB', { month: 'short' })

    if (startDate.toDateString() === endDate.toDateString()) {
      return `${month} ${startDay}`
    }

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${month} ${startDay}-${endDay}`
    }

    const endMonth = endDate.toLocaleDateString('en-GB', { month: 'short' })
    return `${month} ${startDay} - ${endMonth} ${endDay}`
  }

  const getMonthName = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', { month: 'long' })
  }

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

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">{error}</p>
                  </CardContent>
                </Card>
              ) : events.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No upcoming events scheduled</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <Card key={event._id} className="card-elevated-hover">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className="text-3xl font-bold text-primary">
                              {new Date(event.startDate).getDate()}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase">
                              {getMonthName(event.startDate).slice(0, 3)}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-foreground">
                                {event.title}
                              </h3>
                              <Badge className={`${typeColors[event.type]} text-white`}>
                                {typeLabels[event.type]}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{formatDateRange(event.startDate, event.endDate)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500 text-white">Tournament</Badge>
                    <span className="text-sm text-muted-foreground">
                      Competitive Events
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white">Education</Badge>
                    <span className="text-sm text-muted-foreground">
                      Training & Workshops
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500 text-white">Meeting</Badge>
                    <span className="text-sm text-muted-foreground">
                      Official Meetings
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500 text-white">Social</Badge>
                    <span className="text-sm text-muted-foreground">
                      Social Events
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stay Updated</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Follow us on social media for event updates and announcements
                  </p>
                  <a
                    href="https://web.facebook.com/profile.php?id=61553884656266"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full inline-block text-center"
                  >
                    Follow on Facebook
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
