import { Calendar, MapPin, Trophy, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TournamentCardProps {
  name: string
  description: string
  date: string
  location: string
  category: string
  status: 'upcoming' | 'registration-open' | 'in-progress' | 'completed'
  participants?: number
  maxParticipants?: number
  onRegister?: () => void
}

const statusConfig = {
  'upcoming': { label: 'Upcoming', variant: 'default' as const },
  'registration-open': { label: 'Registration Open', variant: 'success' as const },
  'in-progress': { label: 'In Progress', variant: 'warning' as const },
  'completed': { label: 'Completed', variant: 'secondary' as const },
}

export function TournamentCard({
  name,
  description,
  date,
  location,
  category,
  status,
  participants,
  maxParticipants,
  onRegister,
}: TournamentCardProps) {
  const statusInfo = statusConfig[status]

  return (
    <Card className="card-elevated-hover h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Badge variant="outline">{category}</Badge>
        </div>
        <CardTitle className="line-clamp-2">{name}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          {participants !== undefined && maxParticipants !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{participants} / {maxParticipants} registered</span>
            </div>
          )}
        </div>
      </CardContent>
      {status === 'registration-open' && onRegister && (
        <CardFooter>
          <Button className="w-full" onClick={onRegister}>
            <Trophy className="h-4 w-4 mr-2" />
            Register Now
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
