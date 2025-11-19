import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Users, Phone, Mail, Globe, Calendar } from 'lucide-react'
import { clubService, type Club, type ClubWithMembers } from '@/services/clubService'

export function Clubs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClub, setSelectedClub] = useState<ClubWithMembers | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingClub, setLoadingClub] = useState(false)

  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const data = await clubService.getClubs()
      setClubs(data.filter(club => club.status === 'active'))
    } catch (err: any) {
      console.error('Failed to fetch clubs:', err)
      setError(err.message || 'Failed to load clubs')
    } finally {
      setLoading(false)
    }
  }

  const handleViewClub = async (clubId: string) => {
    try {
      setLoadingClub(true)
      const clubDetails = await clubService.getClub(clubId)
      setSelectedClub(clubDetails)
    } catch (err: any) {
      console.error('Failed to fetch club details:', err)
      alert(err.message || 'Failed to load club details')
    } finally {
      setLoadingClub(false)
    }
  }

  const filteredClubs = clubs.filter(club => {
    const matchesSearch =
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (club.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (club.province?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero
          title="Tennis Clubs"
          description="Discover tennis clubs across Zambia"
          gradient
        />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading clubs...</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <Hero
          title="Tennis Clubs"
          description="Discover tennis clubs across Zambia"
          gradient
        />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchClubs} className="mt-4">Try Again</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Tennis Clubs"
        description="Discover tennis clubs across Zambia and join our vibrant tennis community"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Clubs</p>
                    <p className="text-3xl font-bold">{clubs.length}</p>
                  </div>
                  <Users className="h-12 w-12 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                    <p className="text-3xl font-bold text-primary">
                      {clubs.reduce((sum, club) => sum + club.memberCount, 0)}
                    </p>
                  </div>
                  <Users className="h-12 w-12 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Provinces</p>
                    <p className="text-3xl font-bold text-secondary">
                      {new Set(clubs.map(c => c.province).filter(Boolean)).size}
                    </p>
                  </div>
                  <MapPin className="h-12 w-12 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs by name, city, or province..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Clubs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <Card key={club._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="flex-1">{club.name}</span>
                    <Badge variant={club.status === 'active' ? 'default' : 'secondary'}>
                      {club.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(club.city || club.province) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{[club.city, club.province].filter(Boolean).join(', ')}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{club.memberCount} members</span>
                  </div>

                  {club.established && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Established {club.established}</span>
                    </div>
                  )}

                  {club.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {club.description}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleViewClub(club._id)}
                    disabled={loadingClub}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredClubs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No clubs found matching your search</p>
            </div>
          )}
        </div>
      </section>

      {/* Club Details Modal */}
      {selectedClub && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedClub(null)}
        >
          <Card
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedClub.name}</span>
                <Badge variant={selectedClub.status === 'active' ? 'default' : 'secondary'}>
                  {selectedClub.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Club Information */}
              <div>
                <h4 className="font-semibold mb-3">Club Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedClub.contactPerson && (
                    <div>
                      <span className="text-muted-foreground">Contact Person:</span>
                      <p className="font-medium">{selectedClub.contactPerson}</p>
                    </div>
                  )}

                  {selectedClub.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedClub.email}`} className="font-medium text-primary hover:underline">
                        {selectedClub.email}
                      </a>
                    </div>
                  )}

                  {selectedClub.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedClub.phone}`} className="font-medium">
                        {selectedClub.phone}
                      </a>
                    </div>
                  )}

                  {selectedClub.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={selectedClub.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        Visit Website
                      </a>
                    </div>
                  )}

                  {selectedClub.address && (
                    <div className="col-span-full">
                      <span className="text-muted-foreground">Address:</span>
                      <p className="font-medium">{selectedClub.address}</p>
                    </div>
                  )}

                  {(selectedClub.city || selectedClub.province) && (
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{[selectedClub.city, selectedClub.province].filter(Boolean).join(', ')}</p>
                    </div>
                  )}

                  {selectedClub.established && (
                    <div>
                      <span className="text-muted-foreground">Established:</span>
                      <p className="font-medium">{selectedClub.established}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-muted-foreground">Members:</span>
                    <p className="font-medium">{selectedClub.memberCount}</p>
                  </div>
                </div>
              </div>

              {selectedClub.description && (
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedClub.description}</p>
                </div>
              )}

              {selectedClub.facilities && selectedClub.facilities.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Facilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedClub.facilities.map((facility, index) => (
                      <Badge key={index} variant="outline">{facility}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedClub.members && selectedClub.members.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Members ({selectedClub.members.length})</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">ZPIN</th>
                          <th className="px-3 py-2 text-left">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedClub.members.map((member: any) => (
                          <tr key={member._id} className="hover:bg-muted/50">
                            <td className="px-3 py-2">{member.firstName} {member.lastName}</td>
                            <td className="px-3 py-2 font-mono">{member.zpin || 'N/A'}</td>
                            <td className="px-3 py-2 capitalize">{member.membershipType || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedClub(null)} className="flex-1">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
