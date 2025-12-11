import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Calendar, PlayCircle } from 'lucide-react'
import {
  fetchLeagues,
  createLeague,
  updateLeague,
  deleteLeague,
  generateLeagueFixtures,
  League
} from '@/services/leagueService'
import { clubService, Club } from '@/services/clubService'

export function LeagueManagement() {

  // Leagues state
  const [leagues, setLeagues] = useState<League[]>([])
  const [searchLeague, setSearchLeague] = useState('')
  const [showLeagueModal, setShowLeagueModal] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [loadingLeagues, setLoadingLeagues] = useState(true)

  // Clubs state (for league selection)
  const [clubs, setClubs] = useState<Club[]>([])

  // League form data
  const [leagueFormData, setLeagueFormData] = useState({
    name: '',
    season: '',
    year: new Date().getFullYear(),
    region: 'northern' as 'northern' | 'southern',
    gender: 'men' as 'men' | 'women',
    description: '',
    startDate: '',
    endDate: '',
    status: 'upcoming' as 'upcoming' | 'active' | 'completed' | 'cancelled',
    teams: [] as string[],
    settings: {
      pointsForWin: 3,
      pointsForDraw: 1,
      pointsForLoss: 0,
      matchFormat: '2singles_1doubles' as '2singles_1doubles' | '3singles_2doubles' | 'custom',
      numberOfRounds: 1
    },
    organizer: '',
    contactEmail: '',
    contactPhone: ''
  })

  useEffect(() => {
    loadLeagues()
    loadClubs()
  }, [])

  const loadLeagues = async () => {
    try {
      setLoadingLeagues(true)
      const response = await fetchLeagues()
      setLeagues(response.data)
    } catch (err: any) {
      alert(err.message || 'Failed to load leagues')
    } finally {
      setLoadingLeagues(false)
    }
  }

  const loadClubs = async () => {
    try {
      const clubsData = await clubService.getClubs()
      setClubs(clubsData)
    } catch (err: any) {
      console.error('Failed to load clubs:', err)
    }
  }

  // League handlers
  const handleCreateLeague = () => {
    setEditingLeague(null)
    setLeagueFormData({
      name: '',
      season: '',
      year: new Date().getFullYear(),
      region: 'northern',
      gender: 'men',
      description: '',
      startDate: '',
      endDate: '',
      status: 'upcoming',
      teams: [],
      settings: {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        matchFormat: '2singles_1doubles',
        numberOfRounds: 1
      },
      organizer: '',
      contactEmail: '',
      contactPhone: ''
    })
    setShowLeagueModal(true)
  }

  const handleEditLeague = (league: League) => {
    setEditingLeague(league)
    setLeagueFormData({
      name: league.name,
      season: league.season,
      year: league.year,
      region: league.region,
      gender: league.gender,
      description: league.description || '',
      startDate: league.startDate.split('T')[0],
      endDate: league.endDate.split('T')[0],
      status: league.status,
      teams: league.teams.map(t => t._id),
      settings: {
        ...league.settings,
        matchFormat: league.settings.matchFormat as '2singles_1doubles' | '3singles_2doubles' | 'custom'
      },
      organizer: league.organizer || '',
      contactEmail: league.contactEmail || '',
      contactPhone: league.contactPhone || ''
    })
    setShowLeagueModal(true)
  }

  const handleSubmitLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (leagueFormData.teams.length < 2) {
        alert('Please select at least 2 clubs for the league')
        return
      }

      // Send as any to avoid type conflict - backend expects club IDs
      const payload = leagueFormData as any

      if (editingLeague) {
        await updateLeague(editingLeague._id, payload)
        alert('League updated successfully!')
      } else {
        await createLeague(payload)
        alert('League created successfully!')
      }
      setShowLeagueModal(false)
      loadLeagues()
    } catch (err: any) {
      alert(err.message || 'Failed to save league')
    }
  }

  const handleDeleteLeague = async (league: League) => {
    if (!confirm(`Are you sure you want to delete "${league.name}"? This cannot be undone.`)) {
      return
    }
    try {
      await deleteLeague(league._id)
      alert('League deleted successfully!')
      loadLeagues()
    } catch (err: any) {
      alert(err.message || 'Failed to delete league')
    }
  }

  const handleGenerateFixtures = async (league: League) => {
    if (!confirm(`Generate fixtures for "${league.name}"? This will create a round-robin schedule.`)) {
      return
    }
    try {
      const response = await generateLeagueFixtures(league._id, {
        startDate: league.startDate
      })
      alert(`Successfully generated ${response.count} fixtures!`)
    } catch (err: any) {
      alert(err.message || 'Failed to generate fixtures')
    }
  }

  const filteredLeagues = leagues.filter(league =>
    league.name.toLowerCase().includes(searchLeague.toLowerCase()) ||
    league.season.toLowerCase().includes(searchLeague.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      <Hero title="League Management" description="Manage leagues and fixtures using clubs as teams" gradient />

      <section className="py-16">
        <div className="container-custom">
              <div className="flex justify-between items-center mb-6 gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leagues..."
                    value={searchLeague}
                    onChange={(e) => setSearchLeague(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleCreateLeague}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create League
                </Button>
              </div>

              {loadingLeagues ? (
                <div className="text-center py-12 text-muted-foreground">Loading leagues...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLeagues.map((league) => (
                    <Card key={league._id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-start justify-between">
                          <span className="flex-1">{league.name}</span>
                          <Badge variant={league.status === 'active' ? 'default' : 'secondary'}>
                            {league.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{league.season} {league.year}</span>
                          </div>
                          <div>
                            <Badge variant="outline" className="mr-2">{league.region}</Badge>
                            <Badge variant="outline">{league.gender}</Badge>
                          </div>
                          <div className="text-muted-foreground">
                            Teams: <span className="font-semibold">{league.teams.length}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleEditLeague(league)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateFixtures(league)}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteLeague(league)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loadingLeagues && filteredLeagues.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No leagues found
                </div>
              )}
        </div>
      </section>

      {/* League Create/Edit Modal */}
      {showLeagueModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowLeagueModal(false)}
        >
          <Card
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{editingLeague ? 'Edit League' : 'Create New League'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitLeague} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">League Name *</Label>
                    <Input
                      id="name"
                      value={leagueFormData.name}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="season">Season</Label>
                    <Input
                      id="season"
                      value={leagueFormData.season}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, season: e.target.value })}
                      placeholder="e.g., Spring, Summer"
                    />
                  </div>

                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={leagueFormData.year}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, year: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="region">Region *</Label>
                    <select
                      id="region"
                      value={leagueFormData.region}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, region: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="northern">Northern</option>
                      <option value="southern">Southern</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <select
                      id="gender"
                      value={leagueFormData.gender}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, gender: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={leagueFormData.startDate}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={leagueFormData.endDate}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, endDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={leagueFormData.status}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, status: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="clubs">Select Clubs (Teams) *</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {clubs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No clubs available</div>
                      ) : (
                        clubs.map((club) => (
                          <label key={club._id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={leagueFormData.teams.includes(club._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setLeagueFormData({
                                    ...leagueFormData,
                                    teams: [...leagueFormData.teams, club._id]
                                  })
                                } else {
                                  setLeagueFormData({
                                    ...leagueFormData,
                                    teams: leagueFormData.teams.filter(id => id !== club._id)
                                  })
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">
                              {club.name}
                              {club.city && <span className="text-muted-foreground"> ({club.city})</span>}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select clubs to participate in this {leagueFormData.gender === 'men' ? "men's" : "women's"} league
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={leagueFormData.description}
                      onChange={(e) => setLeagueFormData({ ...leagueFormData, description: e.target.value })}
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowLeagueModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingLeague ? 'Update League' : 'Create League'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
