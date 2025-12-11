import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Edit, Trash2, Trophy, Users, Calendar, PlayCircle } from 'lucide-react'
import {
  fetchLeagues,
  fetchLeagueTeams,
  createLeague,
  updateLeague,
  deleteLeague,
  createLeagueTeam,
  updateLeagueTeam,
  deleteLeagueTeam,
  generateLeagueFixtures,
  League,
  LeagueTeam
} from '@/services/leagueService'

export function LeagueManagement() {
  const [activeTab, setActiveTab] = useState<'leagues' | 'teams'>('leagues')

  // Leagues state
  const [leagues, setLeagues] = useState<League[]>([])
  const [searchLeague, setSearchLeague] = useState('')
  const [showLeagueModal, setShowLeagueModal] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [loadingLeagues, setLoadingLeagues] = useState(true)

  // Teams state
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [searchTeam, setSearchTeam] = useState('')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<LeagueTeam | null>(null)
  const [loadingTeams, setLoadingTeams] = useState(true)

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
      matchFormat: '2 Singles + 1 Doubles',
      numberOfRounds: 1
    },
    organizer: '',
    contactEmail: '',
    contactPhone: ''
  })

  // Team form data
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    shortName: '',
    region: 'northern' as 'northern' | 'southern',
    city: '',
    province: '',
    homeVenue: {
      name: '',
      address: undefined as string | undefined,
      numberOfCourts: undefined as number | undefined,
      courtSurface: undefined as string | undefined
    },
    captain: {
      name: undefined as string | undefined,
      email: undefined as string | undefined,
      phone: undefined as string | undefined
    },
    coach: {
      name: undefined as string | undefined,
      email: undefined as string | undefined,
      phone: undefined as string | undefined
    },
    contactEmail: '',
    contactPhone: '',
    colors: {
      primary: undefined as string | undefined,
      secondary: undefined as string | undefined
    },
    isActive: true
  })

  useEffect(() => {
    if (activeTab === 'leagues') {
      loadLeagues()
    } else {
      loadTeams()
    }
  }, [activeTab])

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

  const loadTeams = async () => {
    try {
      setLoadingTeams(true)
      const response = await fetchLeagueTeams()
      setTeams(response.data)
    } catch (err: any) {
      alert(err.message || 'Failed to load teams')
    } finally {
      setLoadingTeams(false)
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
        matchFormat: '2 Singles + 1 Doubles',
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
      settings: league.settings,
      organizer: league.organizer || '',
      contactEmail: league.contactEmail || '',
      contactPhone: league.contactPhone || ''
    })
    setShowLeagueModal(true)
  }

  const handleSubmitLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { teams, ...leagueData } = leagueFormData
      if (editingLeague) {
        await updateLeague(editingLeague._id, leagueData)
        alert('League updated successfully!')
      } else {
        await createLeague(leagueData)
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

  // Team handlers
  const handleCreateTeam = () => {
    setEditingTeam(null)
    setTeamFormData({
      name: '',
      shortName: '',
      region: 'northern',
      city: '',
      province: '',
      homeVenue: {
        name: '',
        address: undefined,
        numberOfCourts: undefined,
        courtSurface: undefined
      },
      captain: {
        name: undefined,
        email: undefined,
        phone: undefined
      },
      coach: {
        name: undefined,
        email: undefined,
        phone: undefined
      },
      contactEmail: '',
      contactPhone: '',
      colors: {
        primary: undefined,
        secondary: undefined
      },
      isActive: true
    })
    setShowTeamModal(true)
  }

  const handleEditTeam = (team: LeagueTeam) => {
    setEditingTeam(team)
    setTeamFormData({
      name: team.name,
      shortName: team.shortName,
      region: team.region,
      city: team.city || '',
      province: team.province || '',
      homeVenue: {
        name: team.homeVenue?.name || '',
        address: team.homeVenue?.address || undefined,
        numberOfCourts: team.homeVenue?.numberOfCourts || undefined,
        courtSurface: team.homeVenue?.courtSurface || undefined
      },
      captain: {
        name: team.captain?.name || undefined,
        email: team.captain?.email || undefined,
        phone: team.captain?.phone || undefined
      },
      coach: {
        name: team.coach?.name || undefined,
        email: team.coach?.email || undefined,
        phone: team.coach?.phone || undefined
      },
      contactEmail: team.contactEmail || '',
      contactPhone: team.contactPhone || '',
      colors: {
        primary: team.colors?.primary || undefined,
        secondary: team.colors?.secondary || undefined
      },
      isActive: team.isActive
    })
    setShowTeamModal(true)
  }

  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTeam) {
        await updateLeagueTeam(editingTeam._id, teamFormData)
        alert('Team updated successfully!')
      } else {
        await createLeagueTeam(teamFormData)
        alert('Team created successfully!')
      }
      setShowTeamModal(false)
      loadTeams()
    } catch (err: any) {
      alert(err.message || 'Failed to save team')
    }
  }

  const handleDeleteTeam = async (team: LeagueTeam) => {
    if (!confirm(`Are you sure you want to delete "${team.name}"? This cannot be undone.`)) {
      return
    }
    try {
      await deleteLeagueTeam(team._id)
      alert('Team deleted successfully!')
      loadTeams()
    } catch (err: any) {
      alert(err.message || 'Failed to delete team')
    }
  }

  const filteredLeagues = leagues.filter(league =>
    league.name.toLowerCase().includes(searchLeague.toLowerCase()) ||
    league.season.toLowerCase().includes(searchLeague.toLowerCase())
  )

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTeam.toLowerCase()) ||
    team.city?.toLowerCase().includes(searchTeam.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      <Hero title="League Management" description="Manage leagues, teams, and fixtures" gradient />

      <section className="py-16">
        <div className="container-custom">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-6">
              <TabsTrigger value="leagues">
                <Trophy className="h-4 w-4 mr-2" />
                Leagues
              </TabsTrigger>
              <TabsTrigger value="teams">
                <Users className="h-4 w-4 mr-2" />
                Teams
              </TabsTrigger>
            </TabsList>

            {/* Leagues Tab */}
            <TabsContent value="leagues">
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
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams">
              <div className="flex justify-between items-center mb-6 gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTeam}
                    onChange={(e) => setSearchTeam(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleCreateTeam}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </div>

              {loadingTeams ? (
                <div className="text-center py-12 text-muted-foreground">Loading teams...</div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Region</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Venue</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredTeams.map((team) => (
                            <tr key={team._id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">{team.name}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline">{team.region}</Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {team.city && team.province
                                  ? `${team.city}, ${team.province}`
                                  : team.city || team.province || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm">{team.homeVenue?.name || 'N/A'}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant={team.isActive ? 'default' : 'secondary'}>
                                  {team.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditTeam(team)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteTeam(team)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {filteredTeams.length === 0 && (
                      <div className="py-12 text-center text-muted-foreground">
                        No teams found
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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

      {/* Team Create/Edit Modal */}
      {showTeamModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowTeamModal(false)}
        >
          <Card
            className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTeam} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="teamName">Team Name *</Label>
                    <Input
                      id="teamName"
                      value={teamFormData.name}
                      onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="shortName">Short Name *</Label>
                    <Input
                      id="shortName"
                      value={teamFormData.shortName}
                      onChange={(e) => setTeamFormData({ ...teamFormData, shortName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="teamRegion">Region *</Label>
                    <select
                      id="teamRegion"
                      value={teamFormData.region}
                      onChange={(e) => setTeamFormData({ ...teamFormData, region: e.target.value as any })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="northern">Northern</option>
                      <option value="southern">Southern</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="teamCity">City</Label>
                    <Input
                      id="teamCity"
                      value={teamFormData.city}
                      onChange={(e) => setTeamFormData({ ...teamFormData, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="teamProvince">Province</Label>
                    <Input
                      id="teamProvince"
                      value={teamFormData.province}
                      onChange={(e) => setTeamFormData({ ...teamFormData, province: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="venueName">Home Venue Name</Label>
                    <Input
                      id="venueName"
                      value={teamFormData.homeVenue.name}
                      onChange={(e) => setTeamFormData({
                        ...teamFormData,
                        homeVenue: { ...teamFormData.homeVenue, name: e.target.value }
                      })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="venueAddress">Venue Address</Label>
                    <Input
                      id="venueAddress"
                      value={teamFormData.homeVenue.address || ''}
                      onChange={(e) => setTeamFormData({
                        ...teamFormData,
                        homeVenue: { ...teamFormData.homeVenue, address: e.target.value || undefined }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="captainName">Captain Name</Label>
                    <Input
                      id="captainName"
                      value={teamFormData.captain.name || ''}
                      onChange={(e) => setTeamFormData({
                        ...teamFormData,
                        captain: { ...teamFormData.captain, name: e.target.value || undefined }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="captainEmail">Captain Email</Label>
                    <Input
                      id="captainEmail"
                      type="email"
                      value={teamFormData.captain.email || ''}
                      onChange={(e) => setTeamFormData({
                        ...teamFormData,
                        captain: { ...teamFormData.captain, email: e.target.value || undefined }
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="isActive">Status</Label>
                    <select
                      id="isActive"
                      value={teamFormData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setTeamFormData({ ...teamFormData, isActive: e.target.value === 'active' })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowTeamModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTeam ? 'Update Team' : 'Create Team'}
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
