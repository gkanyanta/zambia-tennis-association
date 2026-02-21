import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntryManagement } from '@/components/EntryManagement'
import { DrawGeneration } from '@/components/DrawGeneration'
import { TournamentFinance } from '@/components/TournamentFinance'
import { MixerDrawView } from '@/components/MixerDrawView'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Users, Trophy, Grid3x3, Settings, Trash2, AlertTriangle, CheckCircle2, Lock, Radio } from 'lucide-react'
import type { Draw } from '@/types/tournament'
import { tournamentService, Tournament, TournamentCategory } from '@/services/tournamentService'
import { liveMatchService } from '@/services/liveMatchService'

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

  // Refetch single tournament for fresh data (draws, results, etc.)
  const refetchTournament = async () => {
    if (!tournamentId) return
    try {
      const fresh = await tournamentService.getTournament(tournamentId)
      setSelectedTournament(fresh as any)
      // Also update in the tournaments list
      setTournaments(prev => prev.map(t => t._id === tournamentId ? fresh as any : t))
    } catch (error) {
      console.error('Error refetching tournament:', error)
    }
  }

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
            <Button variant="outline" onClick={() => navigate(`/admin/tournaments/${selectedTournament._id}/edit`)}>
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
              <TabsTrigger value="finance">Finance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <TournamentOverview tournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="entries" className="space-y-6">
              <EntriesManagement tournament={selectedTournament} />
            </TabsContent>

            <TabsContent value="draws" className="space-y-6">
              <DrawsManagement tournament={selectedTournament} onRefresh={refetchTournament} />
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              <ResultsManagement tournament={selectedTournament} onRefresh={refetchTournament} />
            </TabsContent>

            <TabsContent value="finance" className="space-y-6">
              <TournamentFinance tournament={selectedTournament} onRefresh={refetchTournament} />
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

  const handleUpdateEntry = async (entryId: string, data: { status: string; seed?: number; rejectionReason?: string; waiveSurcharge?: boolean }) => {
    try {
      if (!selectedCategory) return
      await tournamentService.updateEntryStatus(
        tournament._id,
        selectedCategory._id,
        entryId,
        data
      )
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
      window.location.reload()
    } catch (error) {
      console.error('Error auto-seeding:', error)
      alert('Failed to auto-seed entries. Please try again.')
      throw error
    }
  }

  const handleBulkAction = async (entryIds: string[], action: 'APPROVE' | 'CONFIRM_PAYMENT' | 'WAIVE_PAYMENT' | 'WAIVE_SURCHARGE') => {
    if (!selectedCategory) throw new Error('No category selected')
    const result = await tournamentService.bulkEntryAction(
      tournament._id,
      selectedCategory._id,
      entryIds,
      action
    )
    // Reload after a brief delay to show the result toast
    setTimeout(() => window.location.reload(), 1500)
    return result
  }

  const handleBulkUpdateSeeds = async (seeds: Array<{ entryId: string; seedNumber: number }>) => {
    if (!selectedCategory) throw new Error('No category selected')
    await tournamentService.bulkUpdateSeeds(tournament._id, selectedCategory._id, seeds)
    window.location.reload()
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
        tournamentId={tournament._id}
        onUpdateEntry={handleUpdateEntry}
        onAutoSeed={handleAutoSeed}
        onBulkAction={handleBulkAction}
        onBulkUpdateSeeds={handleBulkUpdateSeeds}
      />
    </div>
  )
}

function DrawsManagement({ tournament, onRefresh }: { tournament: Tournament; onRefresh: () => Promise<void> }) {
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(
    tournament.categories[0] || null
  )

  const handleGenerateDraw = async (draw: Draw) => {
    try {
      if (!selectedCategory) return
      await tournamentService.generateDraw(tournament._id, selectedCategory._id, draw)
      // Refresh tournament data
      await onRefresh()
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
      await onRefresh()
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
        tournamentId={tournament._id}
        categoryId={(selectedCategory as any)?._id}
        onGenerateDraw={handleGenerateDraw}
        onUpdateMatch={handleUpdateMatch}
        onRefresh={onRefresh}
      />
    </div>
  )
}

function ResultsManagement({ tournament, onRefresh }: { tournament: Tournament; onRefresh: () => Promise<void> }) {
  const navigate = useNavigate()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => {
      const first = tournament.categories.find((c: any) => c.draw)
      return first ? first._id : null
    }
  )
  const [editingMatch, setEditingMatch] = useState<string | null>(null)
  const [scoreInput, setScoreInput] = useState('')
  const [winnerInput, setWinnerInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [liveMatches, setLiveMatches] = useState<Record<string, string>>({}) // matchId -> liveMatchId
  const [startingLive, setStartingLive] = useState<string | null>(null)
  const [liveScoreDialogOpen, setLiveScoreDialogOpen] = useState(false)
  const [liveScoreMatch, setLiveScoreMatch] = useState<any>(null)
  const [liveSettings, setLiveSettings] = useState({
    bestOf: 3 as 3 | 5,
    shortSets: false,
    superTiebreak: true,
    noAd: false,
    firstServer: 0 as 0 | 1,
    court: ''
  })

  // Fetch active live matches for this tournament
  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const data = await liveMatchService.getLiveMatchesByTournament(tournament._id)
        const mapping: Record<string, string> = {}
        data.data.forEach((lm: any) => {
          mapping[lm.matchId] = lm._id
        })
        setLiveMatches(mapping)
      } catch {}
    }
    fetchLiveMatches()
  }, [tournament._id])

  const openLiveScoreDialog = (match: any) => {
    const isU10 = selectedCategory?.ageGroup === 'U10'
    setLiveScoreMatch(match)
    setLiveSettings({
      bestOf: 3,
      shortSets: isU10,
      superTiebreak: true,
      noAd: false,
      firstServer: 0,
      court: match.court || ''
    })
    setLiveScoreDialogOpen(true)
  }

  const handleConfirmLiveScoring = async () => {
    if (!selectedCategory || !liveScoreMatch) return
    const match = liveScoreMatch
    setLiveScoreDialogOpen(false)
    setStartingLive(match._id || match.id)
    try {
      const data = await liveMatchService.startLiveMatch({
        tournamentId: tournament._id,
        categoryId: selectedCategory._id,
        matchId: match._id || match.id,
        settings: {
          bestOf: liveSettings.bestOf,
          tiebreakAt: liveSettings.shortSets ? 4 : 6,
          finalSetTiebreak: liveSettings.superTiebreak,
          finalSetTiebreakTo: 10,
          noAd: liveSettings.noAd
        },
        court: liveSettings.court || undefined,
        firstServer: liveSettings.firstServer
      })
      navigate(`/admin/tournaments/${tournament._id}/live-scoring/${data.data._id}`)
    } catch (error: any) {
      // If live match already exists, navigate to it
      if (error.message?.includes('already exists')) {
        const existing = await liveMatchService.getLiveMatchesByTournament(tournament._id)
        const lm = existing.data.find((l: any) => l.matchId === (match._id || match.id))
        if (lm) {
          navigate(`/admin/tournaments/${tournament._id}/live-scoring/${lm._id}`)
          return
        }
      }
      alert(error.message || 'Failed to start live scoring')
    } finally {
      setStartingLive(null)
    }
  }

  // Always derive selectedCategory from tournament data (so it refreshes)
  const selectedCategory = selectedCategoryId
    ? tournament.categories.find((c: any) => c._id === selectedCategoryId) || null
    : null

  const draw = (selectedCategory as any)?.draw

  const handleSaveResult = async (matchId: string) => {
    if (!selectedCategory || !winnerInput || !scoreInput) return
    setSaving(true)
    try {
      await tournamentService.updateMatchResult(
        tournament._id,
        selectedCategory._id,
        matchId,
        { winner: winnerInput, score: scoreInput }
      )
      setEditingMatch(null)
      setScoreInput('')
      setWinnerInput('')
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to save result')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!selectedCategory) return
    if (!confirm('Finalize results? This will lock all match results and compute standings.')) return

    setFinalizing(true)
    try {
      await tournamentService.finalizeResults(tournament._id, selectedCategory._id)
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Failed to finalize results')
    } finally {
      setFinalizing(false)
    }
  }

  const categoriesWithDraws = tournament.categories.filter((c: any) => c.draw)

  if (categoriesWithDraws.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No draws have been generated yet. Generate draws in the Draws tab first.
        </CardContent>
      </Card>
    )
  }

  // Group matches by round
  const matchesByRound: Record<number, any[]> = {}
  if (draw?.matches) {
    draw.matches.forEach((m: any) => {
      if (!matchesByRound[m.round]) matchesByRound[m.round] = []
      matchesByRound[m.round].push(m)
    })
  }

  const isFinalized = draw?.finalized

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      {categoriesWithDraws.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium mb-2 block">Select Category</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              {categoriesWithDraws.map((category: any) => (
                <option key={category._id} value={category._id}>
                  {category.name} {category.draw?.finalized ? '(Finalized)' : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Standings (if finalized) */}
      {isFinalized && draw.standings && (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Final Standings
              <Badge variant="default" className="ml-2 bg-green-600">
                <Lock className="h-3 w-3 mr-1" /> Finalized
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draw.standings.champion && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Champion</div>
                    <div className="font-bold text-lg">{draw.standings.champion.name}</div>
                  </div>
                </div>
              )}
              {draw.standings.runnerUp && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border">
                  <span className="text-2xl">🥈</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Runner-up</div>
                    <div className="font-semibold">{draw.standings.runnerUp.name}</div>
                  </div>
                </div>
              )}
              {draw.standings.semiFinalists?.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg border">
                  <span className="text-2xl">🥉</span>
                  <div>
                    <div className="text-sm text-muted-foreground">Semi-finalists</div>
                    <div className="font-medium">
                      {draw.standings.semiFinalists.map((p: any) => p.name).join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finalize Button */}
      {draw && !isFinalized && (
        <Card>
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <h4 className="font-medium">Finalize Results</h4>
              <p className="text-sm text-muted-foreground">Lock all results and compute final standings</p>
            </div>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? 'Finalizing...' : 'Finalize Results'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mixer Draw View */}
      {draw?.type === 'mixer' && (
        <MixerDrawView
          rounds={draw.mixerRounds || []}
          standings={draw.mixerStandings || []}
          finalized={isFinalized}
          finalStandings={draw.standings as any}
          onCourtResult={async (roundNumber, courtNumber, pair1GamesWon, pair2GamesWon) => {
            if (!selectedCategory) return
            await tournamentService.updateMixerCourtResult(
              tournament._id,
              selectedCategory._id,
              roundNumber,
              courtNumber,
              { pair1GamesWon, pair2GamesWon }
            )
            await onRefresh()
          }}
        />
      )}

      {/* Matches by Round (non-mixer) */}
      {draw?.type !== 'mixer' && Object.entries(matchesByRound)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([round, matches]) => (
          <Card key={round}>
            <CardHeader>
              <CardTitle className="text-lg">{matches[0]?.roundName || `Round ${round}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.map((match: any) => {
                  const isBye = match.player1?.isBye || match.player2?.isBye
                  const isEditing = editingMatch === match._id

                  return (
                    <div
                      key={match._id || match.id}
                      className={`p-4 border rounded-lg ${match.status === 'completed' ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className={`flex-1 ${match.winner === match.player1?.id ? 'font-bold' : ''}`}>
                              {match.player1?.name || 'TBD'}
                              {match.player1?.seed && <span className="text-xs text-muted-foreground ml-1">[{match.player1.seed}]</span>}
                              {match.winner === match.player1?.id && <CheckCircle2 className="h-4 w-4 inline ml-1 text-green-600" />}
                            </div>
                            <div className="text-sm text-muted-foreground">vs</div>
                            <div className={`flex-1 text-right ${match.winner === match.player2?.id ? 'font-bold' : ''}`}>
                              {match.player2?.name || 'TBD'}
                              {match.player2?.seed && <span className="text-xs text-muted-foreground ml-1">[{match.player2.seed}]</span>}
                              {match.winner === match.player2?.id && <CheckCircle2 className="h-4 w-4 inline ml-1 text-green-600" />}
                            </div>
                          </div>
                          {match.score && (
                            <div className="text-center text-sm font-mono mt-1">{match.score}</div>
                          )}
                        </div>

                        {!isFinalized && !isBye && match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye && (
                          <div className="ml-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <select
                                  className="border rounded p-1 text-sm"
                                  value={winnerInput}
                                  onChange={(e) => setWinnerInput(e.target.value)}
                                >
                                  <option value="">Winner</option>
                                  <option value={match.player1.id}>{match.player1.name}</option>
                                  <option value={match.player2.id}>{match.player2.name}</option>
                                </select>
                                <input
                                  type="text"
                                  placeholder="6-4 6-3"
                                  className="border rounded p-1 text-sm w-24"
                                  value={scoreInput}
                                  onChange={(e) => setScoreInput(e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveResult(match._id || match.id)}
                                  disabled={saving || !winnerInput || !scoreInput}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditingMatch(null); setScoreInput(''); setWinnerInput('') }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {match.status !== 'completed' && match.status !== 'live' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openLiveScoreDialog(match)}
                                    disabled={startingLive === (match._id || match.id)}
                                  >
                                    <Radio className="h-3 w-3 mr-1" />
                                    {startingLive === (match._id || match.id) ? 'Starting...' : 'Live Score'}
                                  </Button>
                                )}
                                {(match.status === 'live' || liveMatches[match._id || match.id]) && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => navigate(`/admin/tournaments/${tournament._id}/live-scoring/${liveMatches[match._id || match.id]}`)}
                                  >
                                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                                    Continue
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingMatch(match._id || match.id)
                                    setWinnerInput(match.winner || '')
                                    setScoreInput(match.score || '')
                                  }}
                                >
                                  {match.status === 'completed' ? 'Edit' : 'Enter Score'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {isBye && (
                          <Badge variant="secondary" className="ml-4">BYE</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}

      {/* Round Robin Group Standings */}
      {draw?.type === 'round_robin' && draw.roundRobinGroups?.map((group: any) => (
        <Card key={group.groupName}>
          <CardHeader>
            <CardTitle>{group.groupName} Standings</CardTitle>
          </CardHeader>
          <CardContent>
            {group.standings ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Player</th>
                    <th className="text-center py-2">P</th>
                    <th className="text-center py-2">W</th>
                    <th className="text-center py-2">L</th>
                    <th className="text-center py-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.standings.map((s: any, idx: number) => (
                    <tr key={s.playerId} className="border-b">
                      <td className="py-2">{idx + 1}</td>
                      <td className="py-2 font-medium">{s.playerName}</td>
                      <td className="text-center py-2">{s.played}</td>
                      <td className="text-center py-2">{s.won}</td>
                      <td className="text-center py-2">{s.lost}</td>
                      <td className="text-center py-2 font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground text-sm">Complete all matches and finalize to see standings</p>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Live Scoring Settings Dialog */}
      <Dialog open={liveScoreDialogOpen} onOpenChange={setLiveScoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Match Settings</DialogTitle>
          </DialogHeader>
          {liveScoreMatch && (
            <div className="space-y-5 py-2">
              <div className="text-sm text-center text-muted-foreground">
                {liveScoreMatch.player1?.name} vs {liveScoreMatch.player2?.name}
              </div>

              <div className="space-y-1">
                <Label>Best of</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={liveSettings.bestOf}
                  onChange={(e) => setLiveSettings({ ...liveSettings, bestOf: Number(e.target.value) as 3 | 5 })}
                >
                  <option value={3}>3 sets</option>
                  <option value={5}>5 sets</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Short sets (first to 4)</Label>
                  <p className="text-xs text-muted-foreground">For U10 categories</p>
                </div>
                <Switch
                  checked={liveSettings.shortSets}
                  onCheckedChange={(checked) => setLiveSettings({ ...liveSettings, shortSets: checked })}
                />
              </div>

              <div className="space-y-1">
                <Label>Deciding set format</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={liveSettings.superTiebreak ? 'super' : 'full'}
                  onChange={(e) => setLiveSettings({ ...liveSettings, superTiebreak: e.target.value === 'super' })}
                >
                  <option value="super">Super Tiebreak (first to 10)</option>
                  <option value="full">Full Set</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>No-Ad scoring</Label>
                  <p className="text-xs text-muted-foreground">Sudden death at deuce</p>
                </div>
                <Switch
                  checked={liveSettings.noAd}
                  onCheckedChange={(checked) => setLiveSettings({ ...liveSettings, noAd: checked })}
                />
              </div>

              <div className="space-y-1">
                <Label>First Server</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={liveSettings.firstServer}
                  onChange={(e) => setLiveSettings({ ...liveSettings, firstServer: Number(e.target.value) as 0 | 1 })}
                >
                  <option value={0}>{liveScoreMatch.player1?.name || 'Player 1'}</option>
                  <option value={1}>{liveScoreMatch.player2?.name || 'Player 2'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label>Court</Label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g. Court 1"
                  value={liveSettings.court}
                  onChange={(e) => setLiveSettings({ ...liveSettings, court: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiveScoreDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmLiveScoring}>Start Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
