import { useState } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Building2, DollarSign, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react'
import { clubs } from '@/data/playerData'
import type { Club, PaymentStatus } from '@/types/player'

const getStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
    case 'overdue':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Overdue</Badge>
  }
}

const getAffiliationBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>
  }
}

export function Clubs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<'all' | 'Lusaka' | 'Copperbelt'>('all')
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)

  const filteredClubs = clubs.filter(club => {
    const matchesSearch =
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.executives.chairman.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.executives.secretary.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesProvince = selectedProvince === 'all' || club.province === selectedProvince

    return matchesSearch && matchesProvince
  })

  const getAffiliationSummary = () => {
    const summary = {
      totalClubs: clubs.length,
      activeClubs: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      totalRevenue: 0,
    }

    clubs.forEach(club => {
      if (club.affiliationStatus === 'active') {
        summary.activeClubs++
      }

      const currentYearFee = club.affiliationFees.find(f => f.year === 2025)
      if (currentYearFee) {
        if (currentYearFee.status === 'paid') {
          summary.paidCount++
          summary.totalRevenue += currentYearFee.amount
        } else if (currentYearFee.status === 'pending') {
          summary.pendingCount++
        } else {
          summary.overdueCount++
        }
      }
    })

    return summary
  }

  const summary = getAffiliationSummary()

  return (
    <div className="flex flex-col">
      <Hero
        title="Tennis Clubs"
        description="Manage affiliated tennis clubs and track affiliation fee payments"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Affiliation Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Clubs</p>
                    <p className="text-3xl font-bold">{summary.totalClubs}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Fees Paid (2025)</p>
                    <p className="text-3xl font-bold text-primary">{summary.paidCount}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-3xl font-bold text-secondary">{summary.pendingCount}</p>
                  </div>
                  <Clock className="h-12 w-12 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-3xl font-bold text-destructive">{summary.overdueCount}</p>
                  </div>
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by club name, city, chairman, or secretary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedProvince === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedProvince('all')}
              >
                All
              </Button>
              <Button
                variant={selectedProvince === 'Lusaka' ? 'default' : 'outline'}
                onClick={() => setSelectedProvince('Lusaka')}
              >
                Lusaka
              </Button>
              <Button
                variant={selectedProvince === 'Copperbelt' ? 'default' : 'outline'}
                onClick={() => setSelectedProvince('Copperbelt')}
              >
                Copperbelt
              </Button>
            </div>
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              Add Club
            </Button>
          </div>

          {/* Clubs Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Club Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Officials</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Courts</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Members</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">2025 Fee</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredClubs.map((club) => {
                      const currentFee = club.affiliationFees.find(f => f.year === 2025)
                      return (
                        <tr key={club.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium">{club.name}</div>
                              <div className="text-sm text-muted-foreground">{club.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="text-sm">
                                <div className="font-medium">{club.city}</div>
                                <div className="text-muted-foreground">{club.province}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>
                              <div><span className="font-medium">Chair:</span> {club.executives.chairman}</div>
                              <div className="text-muted-foreground"><span className="font-medium">Sec:</span> {club.executives.secretary}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-medium">{club.facilities.playableCourts}/{club.facilities.totalCourts}</div>
                            <div className="text-xs text-muted-foreground">playable</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">{club.numberOfMembers}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {getAffiliationBadge(club.affiliationStatus)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {currentFee ? (
                              <div className="flex flex-col items-center gap-1">
                                {getStatusBadge(currentFee.status)}
                                <span className="text-xs text-muted-foreground">
                                  K{currentFee.amount.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline">Not Set</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedClub(club)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredClubs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No clubs found matching your search criteria
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Club Details Modal */}
      {selectedClub && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedClub(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedClub.name}</span>
                {getAffiliationBadge(selectedClub.affiliationStatus)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Club Info */}
              <div>
                <h4 className="font-semibold mb-3">Club Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{selectedClub.city}, {selectedClub.province}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <p className="font-medium">{selectedClub.address}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedClub.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedClub.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Number of Members:</span>
                    <p className="font-medium">{selectedClub.numberOfMembers}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registration Date:</span>
                    <p className="font-medium">{new Date(selectedClub.registrationDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Affiliation Status:</span>
                    <p className="font-medium capitalize">{selectedClub.affiliationStatus}</p>
                  </div>
                </div>
              </div>

              {/* Club Executives */}
              <div>
                <h4 className="font-semibold mb-3">Club Executives</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Chairman:</span>
                    <p className="font-medium">{selectedClub.executives.chairman}</p>
                  </div>
                  {selectedClub.executives.viceChairman && (
                    <div>
                      <span className="text-muted-foreground">Vice Chairman:</span>
                      <p className="font-medium">{selectedClub.executives.viceChairman}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Secretary:</span>
                    <p className="font-medium">{selectedClub.executives.secretary}</p>
                  </div>
                  {selectedClub.executives.treasurer && (
                    <div>
                      <span className="text-muted-foreground">Treasurer:</span>
                      <p className="font-medium">{selectedClub.executives.treasurer}</p>
                    </div>
                  )}
                  {selectedClub.executives.clubCaptain && (
                    <div>
                      <span className="text-muted-foreground">Club Captain:</span>
                      <p className="font-medium">{selectedClub.executives.clubCaptain}</p>
                    </div>
                  )}
                </div>
                {selectedClub.executives.committeeMembers && selectedClub.executives.committeeMembers.length > 0 && (
                  <div className="mt-3">
                    <span className="text-muted-foreground text-sm">Committee Members:</span>
                    <div className="mt-2 space-y-1">
                      {selectedClub.executives.committeeMembers.map((member, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-muted-foreground"> - {member.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Facilities & Courts */}
              <div>
                <h4 className="font-semibold mb-3">Facilities & Courts</h4>
                <div className="mb-3">
                  <span className="text-muted-foreground text-sm">Courts:</span>
                  <p className="font-medium text-lg">{selectedClub.facilities.playableCourts} of {selectedClub.facilities.totalCourts} courts playable</p>
                </div>
                <div className="space-y-2">
                  {selectedClub.facilities.courts.map((court) => (
                    <div
                      key={court.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        court.isPlayable ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-sm">Court {court.id}</span>
                        <span className="text-muted-foreground text-sm"> - {court.type}</span>
                        <div className="text-xs text-muted-foreground">
                          {court.condition.join(', ')}
                        </div>
                        {court.notes && (
                          <div className="text-xs text-muted-foreground italic">
                            {court.notes}
                          </div>
                        )}
                      </div>
                      <Badge variant={court.isPlayable ? 'default' : 'destructive'}>
                        {court.isPlayable ? 'Playable' : 'Not Playable'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Amenities:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedClub.facilities.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Affiliation Fee History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Affiliation Fee History
                </h4>
                <div className="space-y-2">
                  {selectedClub.affiliationFees
                    .sort((a, b) => b.year - a.year)
                    .map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">Year {fee.year}</div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(fee.dueDate).toLocaleDateString()}
                            {fee.paidDate && ` | Paid: ${new Date(fee.paidDate).toLocaleDateString()}`}
                          </div>
                          {fee.receiptNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              Receipt: {fee.receiptNumber}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">K{fee.amount.toLocaleString()}</div>
                          {getStatusBadge(fee.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button variant="outline" onClick={() => setSelectedClub(null)}>
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
