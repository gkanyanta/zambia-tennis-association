import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntryManagement } from '@/components/EntryManagement'
import { DrawGeneration } from '@/components/DrawGeneration'
import { Plus, Users, Trophy, Grid3x3, Settings, Trash2, AlertTriangle } from 'lucide-react'
import type { Draw } from '@/types/tournament'
import { tournamentService, Tournament, TournamentCategory } from '@/services/tournamentService'

export function TournamentAdmin() {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  useEffect(() => {
    if (tournamentId && tournaments.length > 0) {
      const tournament = tournaments.find(t => t._id === tournamentId)
      setSelectedTournament(tournament || null)
    }
  }, [tournamentId, tournaments])

  const fetchTournaments = async () => {
    try {
      const data = await tournamentService.getTournaments()
      setTournaments(data as any)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      alert('Failed to load tournaments. Please try again.')
    }
  }

  if (!selectedTournament) {
    return <TournamentList tournaments={tournaments} onSelect={(id) => navigate(`/admin/tournaments/${id}`)} />
  }

  return (
    <div className="flex flex-col">
      <Hero
        title={selectedTournament.name}
        description="Manage tournament entries and draws"
        gradient
      />

      <section className="py-8">
        <div className="container-custom">
          <div className="flex gap-4 mb-6">
            <Button variant="outline" onClick={() => navigate('/admin/tournaments')}>
              ← Back to Tournaments
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Edit Tournament
            </Button>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="entries">Entries</TabsTrigger>
              <TabsTrigger value="draws">Draws</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <TournamentOverview tournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="entries" className="space-y-6">
              <EntriesManagement tournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="draws" className="space-y-6">
              <DrawsManagement tournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <ResultsManagement tournament={selectedTournament} />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}

function TournamentList({ tournaments, onSelect }: { tournaments: Tournament[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (tournamentId: string) => {
    setDeleting(true)
    try {
      await tournamentService.deleteTournament(tournamentId)
      window.location.reload()
    } catch (error: any) {
      console.error('Error deleting tournament:', error)
      alert(error.message || 'Failed to delete tournament')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Tournament Management"
        description="Create and manage tournaments"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">All Tournaments</h2>
            <Button onClick={() => navigate('/admin/tournaments/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </Button>
          </div>

          {tournaments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tournaments found. Create your first tournament to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Card key={tournament._id} className="card-elevated-hover relative">
                  {/* Delete Confirmation Overlay */}
                  {deleteConfirm === tournament._id && (
                    <div className="absolute inset-0 bg-background/95 z-10 flex flex-col items-center justify-center p-4 rounded-lg">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-semibold text-center mb-2">Delete Tournament?</p>
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        This will permanently delete "{tournament.name}" and all its data.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(tournament._id)}
                          disabled={deleting}
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <CardHeader className="cursor-pointer" onClick={() => onSelect(tournament._id)}>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{tournament.name}</CardTitle>
                      <Badge variant={tournament.status === 'entries_open' ? 'default' : 'secondary'}>
                        {tournament.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm cursor-pointer" onClick={() => onSelect(tournament._id)}>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dates:</span>
                        <span>{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categories:</span>
                        <span>{tournament.categories?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Entries:</span>
                        <span>{tournament.categories?.reduce((sum, cat) => sum + (cat.entries?.length || 0), 0) || 0}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(tournament._id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function TournamentOverview({ tournament }: { tournament: Tournament }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tournament.categories.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tournament.categories.reduce((sum, cat) => sum + cat.entries.length, 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tournament.categories.reduce((sum, cat) => sum + cat.entries.filter(e => e.status === 'accepted').length, 0)} accepted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Draws Generated</CardTitle>
          <Grid3x3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tournament.categories?.filter((cat: any) => cat.draw).length || 0} / {tournament.categories?.length || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Tournament Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tournament.categories?.map((category) => (
              <div key={category._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {category.type} • {category.gender} • {category.ageGroup || 'Open'} • {category.drawType.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {category.entries?.filter((e: any) => e.status === 'accepted').length || 0} / {category.maxEntries} entries
                  </Badge>
                  {(category as any).draw && (
                    <Badge variant="default">Draw Generated</Badge>
                  )}
                </div>
              </div>
            )) || []}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EntriesManagement({ tournament }: { tournament: Tournament }) {
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(
    tournament.categories[0] || null
  )

  const handleUpdateEntry = async (entryId: string, data: { status: string; seed?: number; rejectionReason?: string }) => {
    try {
      if (!selectedCategory) return
      await tournamentService.updateEntryStatus(
        tournament._id,
        selectedCategory._id,
        entryId,
        data
      )
      // Refresh tournament data
      window.location.reload()
    } catch (error) {
      console.error('Error updating entry:', error)
      alert('Failed to update entry. Please try again.')
      throw error
    }
  }

  const handleAutoSeed = async () => {
    try {
      if (!selectedCategory) return
      await tournamentService.autoSeedCategory(tournament._id, selectedCategory._id)
      // Refresh tournament data
      window.location.reload()
    } catch (error) {
      console.error('Error auto-seeding:', error)
      alert('Failed to auto-seed entries. Please try again.')
      throw error
    }
  }

  if (!selectedCategory) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No categories available. Create a category first.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      {tournament.categories && tournament.categories.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Select Category</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedCategory._id}
              onChange={(e) => {
                const category = tournament.categories.find((c: any) => c._id === e.target.value)
                setSelectedCategory(category || null)
              }}
            >
              {tournament.categories.map((category: any) => (
                <option key={category._id} value={category._id}>
                  {category.name} - {category.type} {category.gender} {category.ageGroup || 'Open'}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <EntryManagement
        category={selectedCategory as any}
        onUpdateEntry={handleUpdateEntry}
        onAutoSeed={handleAutoSeed}
      />
    </div>
  )
}

function DrawsManagement({ tournament }: { tournament: Tournament }) {
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(
    tournament.categories[0] || null
  )

  const handleGenerateDraw = async (draw: Draw) => {
    try {
      if (!selectedCategory) return
      await tournamentService.generateDraw(tournament._id, selectedCategory._id, draw)
      // Refresh tournament data
      window.location.reload()
    } catch (error) {
      console.error('Error generating draw:', error)
      alert('Failed to generate draw. Please try again.')
      throw error
    }
  }

  const handleUpdateMatch = async (matchId: string, result: { winner: string; score: string }) => {
    try {
      if (!selectedCategory) return
      await tournamentService.updateMatchResult(
        tournament._id,
        selectedCategory._id,
        matchId,
        result
      )
      // Refresh tournament data
      window.location.reload()
    } catch (error) {
      console.error('Error updating match:', error)
      alert('Failed to update match result. Please try again.')
      throw error
    }
  }

  if (!selectedCategory) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No categories available. Create a category first.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      {tournament.categories && tournament.categories.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Select Category</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedCategory._id}
              onChange={(e) => {
                const category = tournament.categories.find((c: any) => c._id === e.target.value)
                setSelectedCategory(category || null)
              }}
            >
              {tournament.categories.map((category: any) => (
                <option key={category._id} value={category._id}>
                  {category.name} - {category.type} {category.gender} {category.ageGroup || 'Open'}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <DrawGeneration
        category={selectedCategory as any}
        onGenerateDraw={handleGenerateDraw}
        onUpdateMatch={handleUpdateMatch}
      />
    </div>
  )
}

function ResultsManagement({ }: { tournament: Tournament }) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Enter Results</h3>
      <p className="text-muted-foreground mb-6">Enter match results and update draws</p>
      {/* Results management interface will be added here */}
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Results management interface coming soon
        </CardContent>
      </Card>
    </div>
  )
}
