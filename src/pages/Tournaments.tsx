import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  DollarSign,
  Search
} from 'lucide-react'
import { tournamentService, Tournament } from '@/services/tournamentService'

export function Tournaments() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const data = await tournamentService.getTournaments()
      setTournaments(data)
    } catch (err) {
      console.error('Failed to load tournaments:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesFilter = filter === 'all' || tournament.status === filter
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.location?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500'
      case 'ongoing':
        return 'bg-green-500'
      case 'completed':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Tournaments"
        description="View upcoming and ongoing tennis tournaments across Zambia"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  onClick={() => setFilter('upcoming')}
                  size="sm"
                >
                  Upcoming
                </Button>
                <Button
                  variant={filter === 'ongoing' ? 'default' : 'outline'}
                  onClick={() => setFilter('ongoing')}
                  size="sm"
                >
                  Ongoing
                </Button>
                <Button
                  variant={filter === 'completed' ? 'default' : 'outline'}
                  onClick={() => setFilter('completed')}
                  size="sm"
                >
                  Completed
                </Button>
              </div>
            </div>
          </div>

          {/* Tournament List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tournaments...</p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? 'No tournaments found matching your search.' : 'No tournaments available.'}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTournaments.map((tournament) => (
                <Card key={tournament._id} className="card-elevated-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{tournament.name}</CardTitle>
                      <Badge className={`${getStatusColor(tournament.status)} text-white`}>
                        {getStatusText(tournament.status)}
                      </Badge>
                    </div>
                    {tournament.category && (
                      <Badge variant="secondary">{tournament.category}</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Description */}
                    {tournament.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {tournament.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-2">
                      {tournament.date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(tournament.date).toLocaleDateString()}</span>
                        </div>
                      )}

                      {tournament.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{tournament.location}</span>
                        </div>
                      )}

                      {tournament.maxParticipants && tournament.maxParticipants > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Max Participants: {tournament.maxParticipants}</span>
                        </div>
                      )}

                      {tournament.entryFee > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>Entry Fee: K{tournament.entryFee}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {tournament.status === 'upcoming' && (
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => navigate(`/tournaments/${tournament._id}`)}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Register
                      </Button>
                    )}
                    {tournament.status === 'ongoing' && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => navigate(`/tournaments/${tournament._id}`)}
                      >
                        View Details
                      </Button>
                    )}
                    {tournament.status === 'completed' && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => navigate(`/tournaments/${tournament._id}`)}
                      >
                        View Results
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-12 bg-muted/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Want to participate?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              To register for tournaments, you need to be a member of ZTA through an affiliated club.
              Contact your club or reach out to us for more information.
            </p>
            <div className="flex gap-4">
              <Button variant="default" onClick={() => window.location.href = '/membership'}>
                Find a Club
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/contact'}>
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
