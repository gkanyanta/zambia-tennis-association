import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Calendar, PlayCircle, Trophy, CheckCircle, XCircle, ClipboardList, Loader2, List, Pencil, CalendarClock, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  fetchLeagues,
  createLeague,
  updateLeague,
  deleteLeague,
  generateLeagueTies,
  fetchLeagueRegistrations,
  reviewLeagueRegistration,
  generatePlayoffs,
  fetchLeagueTies,
  createTie as createTieApi,
  updateTie as updateTieApi,
  recordWalkover as recordWalkoverApi,
  League,
  LeagueRegistration,
  Tie,
  FORMAT_LABELS
} from '@/services/leagueService'
import { clubService, Club } from '@/services/clubService'

export function LeagueManagement() {
  const { toast } = useToast()
  const [leagues, setLeagues] = useState<League[]>([])
  const [searchLeague, setSearchLeague] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [loading, setLoading] = useState(true)
  const [clubs, setClubs] = useState<Club[]>([])

  const defaultForm: {
    name: string; season: string; year: number;
    region: 'northern' | 'southern'; gender: 'men' | 'women';
    description: string; startDate: string; endDate: string;
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    teams: string[];
    settings: { pointsForWin: number; pointsForDraw: number; pointsForLoss: number; matchFormat: string; numberOfRounds: number; bestOfSets: number; matchTiebreak: boolean; noAdScoring: boolean };
    organizer: string; contactEmail: string; contactPhone: string;
  } = {
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
      matchFormat: '2s1d',
      numberOfRounds: 1,
      bestOfSets: 3,
      matchTiebreak: true,
      noAdScoring: false
    },
    organizer: '',
    contactEmail: '',
    contactPhone: ''
  }

  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    loadLeagues()
    loadClubs()
  }, [])

  const loadLeagues = async () => {
    try {
      setLoading(true)
      const response = await fetchLeagues()
      setLeagues(response.data)
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to load leagues', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadClubs = async () => {
    try {
      const data = await clubService.getClubs()
      setClubs(data)
    } catch (err: any) {
      console.error('Failed to load clubs:', err)
    }
  }

  const handleCreate = () => {
    setEditingLeague(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const handleEdit = (league: League) => {
    setEditingLeague(league)
    setForm({
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
        pointsForWin: league.settings.pointsForWin,
        pointsForDraw: league.settings.pointsForDraw,
        pointsForLoss: league.settings.pointsForLoss,
        matchFormat: league.settings.matchFormat,
        numberOfRounds: league.settings.numberOfRounds,
        bestOfSets: league.settings.bestOfSets || 3,
        matchTiebreak: league.settings.matchTiebreak ?? true,
        noAdScoring: league.settings.noAdScoring ?? false
      },
      organizer: league.organizer || '',
      contactEmail: league.contactEmail || '',
      contactPhone: league.contactPhone || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.teams.length < 2) {
      toast({ title: 'Validation', description: 'Please select at least 2 clubs', variant: 'destructive' })
      return
    }
    try {
      if (editingLeague) {
        await updateLeague(editingLeague._id, form as any)
        toast({ title: 'Success', description: 'League updated' })
      } else {
        await createLeague(form as any)
        toast({ title: 'Success', description: 'League created' })
      }
      setShowModal(false)
      loadLeagues()
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to save league', variant: 'destructive' })
    }
  }

  const handleDelete = async (league: League) => {
    if (!confirm(`Delete "${league.name}"? This also deletes all ties and results.`)) return
    try {
      await deleteLeague(league._id)
      toast({ title: 'Success', description: 'League deleted' })
      loadLeagues()
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to delete', variant: 'destructive' })
    }
  }

  const handleGenerateTies = async (league: League) => {
    if (!confirm(`Generate round-robin ties for "${league.name}"? Make sure league match days are set on the calendar.`)) return
    try {
      const response = await generateLeagueTies(league._id, { startDate: league.startDate })
      toast({ title: 'Success', description: `Generated ${response.count} ties` })
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to generate ties', variant: 'destructive' })
    }
  }

  // Registrations
  const [registrations, setRegistrations] = useState<LeagueRegistration[]>([])
  const [showRegistrations, setShowRegistrations] = useState<string | null>(null)
  const [loadingRegistrations, setLoadingRegistrations] = useState(false)

  const handleViewRegistrations = async (leagueId: string) => {
    if (showRegistrations === leagueId) {
      setShowRegistrations(null)
      return
    }
    setLoadingRegistrations(true)
    try {
      const response = await fetchLeagueRegistrations(leagueId)
      setRegistrations(response.data)
      setShowRegistrations(leagueId)
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to load registrations', variant: 'destructive' })
    } finally {
      setLoadingRegistrations(false)
    }
  }

  const handleReviewRegistration = async (leagueId: string, registrationId: string, status: 'approved' | 'rejected') => {
    try {
      await reviewLeagueRegistration(leagueId, registrationId, { status })
      toast({ title: 'Success', description: `Registration ${status}` })
      handleViewRegistrations(leagueId)
      loadLeagues()
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to review registration', variant: 'destructive' })
    }
  }

  // Fixtures
  const [fixtures, setFixtures] = useState<Tie[]>([])
  const [showFixtures, setShowFixtures] = useState<string | null>(null)
  const [loadingFixtures, setLoadingFixtures] = useState(false)
  const [fixtureRoundFilter, setFixtureRoundFilter] = useState<number | null>(null)

  // Fixture modals
  const [showCreateFixture, setShowCreateFixture] = useState<League | null>(null)
  const [showEditFixture, setShowEditFixture] = useState<{ tie: Tie; league: League; mode: 'edit' | 'reschedule' } | null>(null)
  const [showWalkoverModal, setShowWalkoverModal] = useState<{ tie: Tie; league: League } | null>(null)

  const [createFixtureForm, setCreateFixtureForm] = useState({
    homeTeam: '', awayTeam: '', round: 1, roundName: '', scheduledDate: '', scheduledTime: '', venue: '', venueAddress: ''
  })
  const [editFixtureForm, setEditFixtureForm] = useState({
    scheduledDate: '', scheduledTime: '', venue: '', venueAddress: '', postponementReason: ''
  })
  const [walkoverForm, setWalkoverForm] = useState({ walkoverTeam: '', reason: '' })

  const handleViewFixtures = async (leagueId: string) => {
    if (showFixtures === leagueId) {
      setShowFixtures(null)
      return
    }
    setLoadingFixtures(true)
    setFixtureRoundFilter(null)
    try {
      const response = await fetchLeagueTies(leagueId)
      setFixtures(response.data)
      setShowFixtures(leagueId)
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to load fixtures', variant: 'destructive' })
    } finally {
      setLoadingFixtures(false)
    }
  }

  const handleCreateFixture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showCreateFixture) return
    try {
      await createTieApi(showCreateFixture._id, {
        ...createFixtureForm,
        roundName: createFixtureForm.roundName || `Round ${createFixtureForm.round}`
      })
      toast({ title: 'Success', description: 'Fixture created' })
      setShowCreateFixture(null)
      handleViewFixtures(showCreateFixture._id)
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to create fixture', variant: 'destructive' })
    }
  }

  const handleEditFixture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEditFixture) return
    const { tie, league, mode } = showEditFixture
    try {
      const data: any = {
        scheduledDate: editFixtureForm.scheduledDate,
        scheduledTime: editFixtureForm.scheduledTime,
        venue: editFixtureForm.venue,
        venueAddress: editFixtureForm.venueAddress
      }
      if (mode === 'reschedule') {
        data.status = 'postponed'
        data.postponementReason = editFixtureForm.postponementReason
      }
      await updateTieApi(league._id, tie._id, data)
      toast({ title: 'Success', description: mode === 'reschedule' ? 'Fixture rescheduled' : 'Fixture updated' })
      setShowEditFixture(null)
      handleViewFixtures(league._id)
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to update fixture', variant: 'destructive' })
    }
  }

  const openEditFixture = (tie: Tie, league: League, mode: 'edit' | 'reschedule') => {
    setEditFixtureForm({
      scheduledDate: tie.scheduledDate?.split('T')[0] || '',
      scheduledTime: tie.scheduledTime || '',
      venue: tie.venue || '',
      venueAddress: tie.venueAddress || '',
      postponementReason: ''
    })
    setShowEditFixture({ tie, league, mode })
  }

  const handleWalkover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showWalkoverModal) return
    const { tie, league } = showWalkoverModal
    if (!walkoverForm.walkoverTeam) {
      toast({ title: 'Validation', description: 'Select the team that forfeits', variant: 'destructive' })
      return
    }
    try {
      await recordWalkoverApi(league._id, tie._id, {
        walkoverTeam: walkoverForm.walkoverTeam,
        reason: walkoverForm.reason || undefined
      })
      toast({ title: 'Success', description: 'Walkover recorded' })
      setShowWalkoverModal(null)
      handleViewFixtures(league._id)
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to record walkover', variant: 'destructive' })
    }
  }

  const getFixtureRounds = () => {
    const rounds = [...new Set(fixtures.map(f => f.round))].sort((a, b) => a - b)
    return rounds
  }

  const filteredFixtures = fixtureRoundFilter
    ? fixtures.filter(f => f.round === fixtureRoundFilter)
    : fixtures

  const statusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'secondary'
      case 'in_progress': return 'default'
      case 'completed': return 'default'
      case 'postponed': return 'outline'
      case 'walkover': return 'destructive'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  // Playoffs
  const handleGeneratePlayoffs = async (league: League) => {
    if (!confirm(`Generate playoff bracket for "${league.name}"? This picks the top 2 teams from each region.`)) return
    try {
      const response = await generatePlayoffs(league._id)
      toast({ title: 'Playoffs Generated', description: `Created ${response.count} playoff ties` })
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to generate playoffs', variant: 'destructive' })
    }
  }

  const filtered = leagues.filter(l =>
    l.name.toLowerCase().includes(searchLeague.toLowerCase()) ||
    l.season.toLowerCase().includes(searchLeague.toLowerCase())
  )

  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

  return (
    <div className="flex flex-col">
      <Hero title="League Management" description="Create and manage tennis leagues" gradient />

      <section className="py-16">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-6 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leagues..." value={searchLeague} onChange={e => setSearchLeague(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />Create League</Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading leagues...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(league => (
                <Card key={league._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span className="flex-1">{league.name}</span>
                      <Badge variant={league.status === 'active' ? 'default' : 'secondary'}>{league.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{league.season} {league.year}</span>
                      </div>
                      <div>
                        <Badge variant="outline" className="mr-2 capitalize">{league.region}</Badge>
                        <Badge variant="outline" className="mr-2 capitalize">{league.gender}</Badge>
                        <Badge variant="outline">{FORMAT_LABELS[league.settings.matchFormat] || league.settings.matchFormat}</Badge>
                      </div>
                      <div className="text-muted-foreground">Teams: <span className="font-semibold">{league.teams.length}</span></div>
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(league)}>
                        <Edit className="h-4 w-4 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleViewFixtures(league._id)} title="View Fixtures">
                        <List className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleViewRegistrations(league._id)} title="View Registrations">
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleGenerateTies(league)} title="Generate Ties">
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleGeneratePlayoffs(league)} title="Generate Playoffs">
                        <Trophy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(league)} title="Delete League">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Fixtures Panel */}
                    {showFixtures === league._id && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm">Fixtures ({fixtures.length})</h4>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            setCreateFixtureForm({ homeTeam: '', awayTeam: '', round: 1, roundName: '', scheduledDate: '', scheduledTime: '', venue: '', venueAddress: '' })
                            setShowCreateFixture(league)
                          }}>
                            <Plus className="h-3 w-3 mr-1" />Add Fixture
                          </Button>
                        </div>
                        {/* Round filters */}
                        {getFixtureRounds().length > 1 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            <Button size="sm" variant={fixtureRoundFilter === null ? 'default' : 'outline'} className="h-6 text-xs px-2"
                              onClick={() => setFixtureRoundFilter(null)}>All</Button>
                            {getFixtureRounds().map(r => (
                              <Button key={r} size="sm" variant={fixtureRoundFilter === r ? 'default' : 'outline'} className="h-6 text-xs px-2"
                                onClick={() => setFixtureRoundFilter(r)}>R{r}</Button>
                            ))}
                          </div>
                        )}
                        {loadingFixtures ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : filteredFixtures.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No fixtures{fixtureRoundFilter ? ' for this round' : ''}</p>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {filteredFixtures.map(tie => (
                              <div key={tie._id} className="p-2 bg-muted/30 rounded text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs shrink-0">R{tie.round}</Badge>
                                  <Badge variant={statusColor(tie.status) as any} className="text-xs shrink-0">{tie.status}</Badge>
                                  <span className="font-medium truncate">{tie.homeTeam?.name || 'TBD'}</span>
                                  <span className="text-muted-foreground">vs</span>
                                  <span className="font-medium truncate">{tie.awayTeam?.name || 'TBD'}</span>
                                  {tie.status === 'completed' && (
                                    <span className="text-xs font-semibold ml-auto shrink-0">{tie.score?.home} - {tie.score?.away}</span>
                                  )}
                                  {tie.status === 'walkover' && (
                                    <span className="text-xs font-semibold ml-auto shrink-0">W/O</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-muted-foreground">
                                    {tie.scheduledDate && new Date(tie.scheduledDate).toLocaleDateString()}
                                    {tie.scheduledTime && ` ${tie.scheduledTime}`}
                                    {tie.venue && ` · ${tie.venue}`}
                                  </div>
                                  {!['completed', 'walkover'].includes(tie.status) && (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Edit"
                                        onClick={() => openEditFixture(tie, league, 'edit')}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Reschedule"
                                        onClick={() => openEditFixture(tie, league, 'reschedule')}>
                                        <CalendarClock className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Walkover"
                                        onClick={() => {
                                          setWalkoverForm({ walkoverTeam: '', reason: '' })
                                          setShowWalkoverModal({ tie, league })
                                        }}>
                                        <AlertTriangle className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Registration Review Panel */}
                    {showRegistrations === league._id && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold text-sm mb-3">Club Registrations</h4>
                        {loadingRegistrations ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : registrations.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No registrations yet</p>
                        ) : (
                          <div className="space-y-2">
                            {registrations.map(reg => (
                              <div key={reg._id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                                <div>
                                  <span className="font-medium">{reg.club.name}</span>
                                  {reg.club.city && <span className="text-muted-foreground"> ({reg.club.city})</span>}
                                  <div className="text-xs text-muted-foreground">
                                    By {reg.registeredBy.firstName} {reg.registeredBy.lastName} - {new Date(reg.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {reg.status === 'pending' ? (
                                    <>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => handleReviewRegistration(league._id, reg._id, 'approved')}>
                                        <CheckCircle className="h-3 w-3 mr-1" />Approve
                                      </Button>
                                      <Button size="sm" variant="outline" className="h-7 text-xs"
                                        onClick={() => handleReviewRegistration(league._id, reg._id, 'rejected')}>
                                        <XCircle className="h-3 w-3 mr-1" />Reject
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge variant={reg.status === 'approved' ? 'default' : 'destructive'}>{reg.status}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No leagues found</div>
          )}
        </div>
      </section>

      {/* Create/Edit League Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{editingLeague ? 'Edit League' : 'Create New League'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>League Name *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>

                  <div>
                    <Label>Season</Label>
                    <Input value={form.season} onChange={e => setForm({ ...form, season: e.target.value })} placeholder="e.g., Spring, Summer" />
                  </div>
                  <div>
                    <Label>Year *</Label>
                    <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} required />
                  </div>

                  <div>
                    <Label>Region *</Label>
                    <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value as any })} className={selectClass} required>
                      <option value="northern">Northern</option>
                      <option value="southern">Southern</option>
                    </select>
                  </div>
                  <div>
                    <Label>Gender *</Label>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as any })} className={selectClass} required>
                      <option value="men">Men</option>
                      <option value="women">Women</option>
                    </select>
                  </div>

                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                  </div>

                  <div>
                    <Label>Status</Label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={selectClass}>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <Label>Rounds</Label>
                    <Input type="number" min={1} max={4} value={form.settings.numberOfRounds}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, numberOfRounds: parseInt(e.target.value) || 1 } })} />
                  </div>

                  {/* Match Settings */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-semibold mb-3">Match Settings</h3>
                  </div>

                  <div>
                    <Label>Match Format *</Label>
                    <select value={form.settings.matchFormat}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, matchFormat: e.target.value } })} className={selectClass}>
                      {Object.entries(FORMAT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Best of Sets</Label>
                    <select value={form.settings.bestOfSets}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, bestOfSets: parseInt(e.target.value) } })} className={selectClass}>
                      <option value={3}>Best of 3</option>
                      <option value={5}>Best of 5</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="matchTiebreak" checked={form.settings.matchTiebreak}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, matchTiebreak: e.target.checked } })} className="h-4 w-4" />
                    <Label htmlFor="matchTiebreak" className="mb-0">Match tiebreak (10-point) in lieu of deciding set</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="noAd" checked={form.settings.noAdScoring}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, noAdScoring: e.target.checked } })} className="h-4 w-4" />
                    <Label htmlFor="noAd" className="mb-0">No-ad scoring (deciding point at deuce)</Label>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-semibold mb-3">Points System</h3>
                  </div>
                  <div>
                    <Label>Win</Label>
                    <Input type="number" min={0} value={form.settings.pointsForWin}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, pointsForWin: parseInt(e.target.value) || 0 } })} />
                  </div>
                  <div>
                    <Label>Draw</Label>
                    <Input type="number" min={0} value={form.settings.pointsForDraw}
                      onChange={e => setForm({ ...form, settings: { ...form.settings, pointsForDraw: parseInt(e.target.value) || 0 } })} />
                  </div>

                  {/* Club Selection */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <Label>Select Clubs (Teams) *</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {clubs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No clubs available</div>
                      ) : (
                        clubs.map(club => (
                          <label key={club._id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                            <input type="checkbox" checked={form.teams.includes(club._id)}
                              onChange={e => {
                                setForm({
                                  ...form,
                                  teams: e.target.checked
                                    ? [...form.teams, club._id]
                                    : form.teams.filter(id => id !== club._id)
                                })
                              }} className="h-4 w-4" />
                            <span className="text-sm">
                              {club.name}{club.city && <span className="text-muted-foreground"> ({club.city})</span>}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit">{editingLeague ? 'Update' : 'Create'} League</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Fixture Modal */}
      {showCreateFixture && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreateFixture(null)}>
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Create Fixture</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFixture} className="space-y-4">
                <div>
                  <Label>Home Team *</Label>
                  <select value={createFixtureForm.homeTeam}
                    onChange={e => setCreateFixtureForm({ ...createFixtureForm, homeTeam: e.target.value })} className={selectClass} required>
                    <option value="">Select home team</option>
                    {showCreateFixture.teams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Away Team *</Label>
                  <select value={createFixtureForm.awayTeam}
                    onChange={e => setCreateFixtureForm({ ...createFixtureForm, awayTeam: e.target.value })} className={selectClass} required>
                    <option value="">Select away team</option>
                    {showCreateFixture.teams
                      .filter(t => t._id !== createFixtureForm.homeTeam)
                      .map(team => (
                        <option key={team._id} value={team._id}>{team.name}</option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Round Number</Label>
                    <Input type="number" min={1} value={createFixtureForm.round}
                      onChange={e => setCreateFixtureForm({ ...createFixtureForm, round: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div>
                    <Label>Round Name</Label>
                    <Input value={createFixtureForm.roundName}
                      onChange={e => setCreateFixtureForm({ ...createFixtureForm, roundName: e.target.value })}
                      placeholder={`Round ${createFixtureForm.round}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={createFixtureForm.scheduledDate}
                      onChange={e => setCreateFixtureForm({ ...createFixtureForm, scheduledDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" value={createFixtureForm.scheduledTime}
                      onChange={e => setCreateFixtureForm({ ...createFixtureForm, scheduledTime: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input value={createFixtureForm.venue}
                    onChange={e => setCreateFixtureForm({ ...createFixtureForm, venue: e.target.value })} placeholder="Venue name" />
                </div>
                <div>
                  <Label>Venue Address</Label>
                  <Input value={createFixtureForm.venueAddress}
                    onChange={e => setCreateFixtureForm({ ...createFixtureForm, venueAddress: e.target.value })} placeholder="Address" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateFixture(null)}>Cancel</Button>
                  <Button type="submit">Create Fixture</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit / Reschedule Fixture Modal */}
      {showEditFixture && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEditFixture(null)}>
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>
                {showEditFixture.mode === 'reschedule' ? 'Reschedule Fixture' : 'Edit Fixture'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {showEditFixture.tie.homeTeam?.name} vs {showEditFixture.tie.awayTeam?.name}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditFixture} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={editFixtureForm.scheduledDate}
                      onChange={e => setEditFixtureForm({ ...editFixtureForm, scheduledDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" value={editFixtureForm.scheduledTime}
                      onChange={e => setEditFixtureForm({ ...editFixtureForm, scheduledTime: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input value={editFixtureForm.venue}
                    onChange={e => setEditFixtureForm({ ...editFixtureForm, venue: e.target.value })} />
                </div>
                <div>
                  <Label>Venue Address</Label>
                  <Input value={editFixtureForm.venueAddress}
                    onChange={e => setEditFixtureForm({ ...editFixtureForm, venueAddress: e.target.value })} />
                </div>
                {showEditFixture.mode === 'reschedule' && (
                  <div>
                    <Label>Reason for Rescheduling</Label>
                    <textarea value={editFixtureForm.postponementReason}
                      onChange={e => setEditFixtureForm({ ...editFixtureForm, postponementReason: e.target.value })}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter reason for rescheduling..." />
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditFixture(null)}>Cancel</Button>
                  <Button type="submit">{showEditFixture.mode === 'reschedule' ? 'Reschedule' : 'Update'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Walkover Modal */}
      {showWalkoverModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowWalkoverModal(null)}>
          <Card className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Record Walkover</CardTitle>
              <p className="text-sm text-muted-foreground">
                {showWalkoverModal.tie.homeTeam?.name} vs {showWalkoverModal.tie.awayTeam?.name}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWalkover} className="space-y-4">
                <div>
                  <Label>Team that Forfeits *</Label>
                  <select value={walkoverForm.walkoverTeam}
                    onChange={e => setWalkoverForm({ ...walkoverForm, walkoverTeam: e.target.value })} className={selectClass} required>
                    <option value="">Select team</option>
                    <option value={showWalkoverModal.tie.homeTeam?._id}>
                      {showWalkoverModal.tie.homeTeam?.name} (Home)
                    </option>
                    <option value={showWalkoverModal.tie.awayTeam?._id}>
                      {showWalkoverModal.tie.awayTeam?.name} (Away)
                    </option>
                  </select>
                </div>
                <div>
                  <Label>Reason (optional)</Label>
                  <textarea value={walkoverForm.reason}
                    onChange={e => setWalkoverForm({ ...walkoverForm, reason: e.target.value })}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Reason for walkover..." />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowWalkoverModal(null)}>Cancel</Button>
                  <Button type="submit" variant="destructive">Record Walkover</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
