import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Users, Building2, CreditCard, ArrowRight } from 'lucide-react'
import { clubService, type Club } from '@/services/clubService'

type Region = 'northern' | 'southern' | 'all'

const REGIONS = {
  northern: {
    name: 'Northern Region',
    description: 'Copperbelt and surrounding areas',
    provinces: ['Copperbelt', 'Northern', 'Luapula', 'Muchinga']
  },
  southern: {
    name: 'Southern Region',
    description: 'Lusaka and surrounding areas',
    provinces: ['Lusaka', 'Southern', 'Central', 'Eastern', 'Western']
  }
}

export function Membership() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<Region>('all')

  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const data = await clubService.getClubs()
      setClubs(data.filter(club => club.status === 'active'))
    } catch (err: any) {
      console.error('Failed to load clubs:', err)
    } finally {
      setLoading(false)
    }
  }

  const getClubRegion = (club: Club): Region => {
    if (!club.province) return 'southern' // Default to southern

    const province = club.province.toLowerCase()
    if (REGIONS.northern.provinces.some(p => p.toLowerCase() === province)) {
      return 'northern'
    }
    return 'southern'
  }

  const filteredClubs = clubs.filter(club => {
    if (selectedRegion === 'all') return true
    return getClubRegion(club) === selectedRegion
  })

  const clubsByRegion = {
    northern: clubs.filter(club => getClubRegion(club) === 'northern'),
    southern: clubs.filter(club => getClubRegion(club) === 'southern')
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Join a Tennis Club"
        description="ZTA membership is through affiliated clubs. Choose your region to find a club near you."
        gradient
      />

      {/* ZPIN Registration CTA */}
      <section className="py-12 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4">Player Registration</Badge>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Get Your ZPIN Today
              </h2>
              <p className="text-muted-foreground mb-6">
                Your ZPIN (Zambia Player Identification Number) is your unique identifier in Zambian tennis.
                It's required for tournament participation, official rankings, and league play.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate('/register-zpin')}>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Register for ZPIN
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/club-affiliation')}>
                  <Building2 className="h-5 w-5 mr-2" />
                  Club Affiliation
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-primary">K100</p>
                  <p className="text-sm text-muted-foreground">Junior ZPIN</p>
                  <p className="text-xs text-muted-foreground mt-1">Under 18</p>
                </CardContent>
              </Card>
              <Card className="text-center border-primary">
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-primary">K250</p>
                  <p className="text-sm text-muted-foreground">Senior ZPIN</p>
                  <p className="text-xs text-muted-foreground mt-1">18+ years</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-primary">K500</p>
                  <p className="text-sm text-muted-foreground">International</p>
                  <p className="text-xs text-muted-foreground mt-1">Foreign players</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-custom">
          {/* Introduction */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Join a Tennis Club
            </h2>
            <p className="text-muted-foreground mb-6">
              The Zambia Tennis Association operates through a network of affiliated clubs across the country.
              To become a ZTA member, you need to register with one of our member clubs in your region.
            </p>
            <div className="bg-primary/10 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-foreground mb-3">Membership Benefits:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Access to all ZTA tournaments and competitions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Eligibility for national rankings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Access to coaching and development programs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Official ZTA membership recognition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Access to club facilities and activities</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Region Selection */}
          <div className="flex justify-center gap-4 mb-12">
            <Button
              variant={selectedRegion === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedRegion('all')}
              size="lg"
            >
              All Regions ({clubs.length})
            </Button>
            <Button
              variant={selectedRegion === 'northern' ? 'default' : 'outline'}
              onClick={() => setSelectedRegion('northern')}
              size="lg"
            >
              Northern Region ({clubsByRegion.northern.length})
            </Button>
            <Button
              variant={selectedRegion === 'southern' ? 'default' : 'outline'}
              onClick={() => setSelectedRegion('southern')}
              size="lg"
            >
              Southern Region ({clubsByRegion.southern.length})
            </Button>
          </div>

          {/* Region Info */}
          {selectedRegion !== 'all' && (
            <div className="mb-8 bg-muted/50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {REGIONS[selectedRegion].name}
              </h3>
              <p className="text-muted-foreground">
                {REGIONS[selectedRegion].description}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Covers: {REGIONS[selectedRegion].provinces.join(', ')}
              </p>
            </div>
          )}

          {/* Clubs List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading clubs...</p>
            </div>
          ) : filteredClubs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No clubs found in this region.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club) => (
                <Card key={club._id} className="card-elevated-hover">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{club.name}</CardTitle>
                        <Badge variant="secondary" className="mb-2">
                          {getClubRegion(club) === 'northern' ? 'Northern Region' : 'Southern Region'}
                        </Badge>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Location */}
                    {(club.city || club.province) && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {[club.city, club.province].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Contact Person */}
                    {club.contactPerson && (
                      <div className="flex items-start gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Contact Person</div>
                          <div className="font-medium">{club.contactPerson}</div>
                        </div>
                      </div>
                    )}

                    {/* Contact Details */}
                    <div className="space-y-2 pt-2 border-t">
                      {club.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${club.phone}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {club.phone}
                          </a>
                        </div>
                      )}
                      {club.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${club.email}`}
                            className="text-sm text-primary hover:underline truncate"
                          >
                            {club.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Member Count */}
                    {club.memberCount > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">Current Members</div>
                        <div className="text-lg font-semibold text-foreground">{club.memberCount}</div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button className="w-full" variant="default">
                      Contact Club
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-16 bg-muted/50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
              Next Steps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Choose a Club</h4>
                <p className="text-sm text-muted-foreground">
                  Select a club in your region from the list above
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Contact the Club</h4>
                <p className="text-sm text-muted-foreground">
                  Reach out using the contact details provided
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h4 className="font-semibold text-foreground mb-2">Register & Play</h4>
                <p className="text-sm text-muted-foreground">
                  Complete your club registration and start playing
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
