import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, CheckCircle, XCircle, Clock } from 'lucide-react'
import { userService, type User } from '@/services/userService'
import { PlayerMatchHistory } from '@/components/PlayerMatchHistory'
import { rankingService, type Ranking } from '@/services/rankingService'

const getMembershipBadge = (status?: string | null) => {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>
    case 'pending':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>
    case 'expired':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Expired</Badge>
    default:
      return <Badge variant="outline">N/A</Badge>
  }
}

export function Players() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'junior' | 'adult'>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [playerRankings, setPlayerRankings] = useState<Ranking[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(false)
  const [players, setPlayers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const openPlayer = async (player: User) => {
    setSelectedPlayer(player)
    setPlayerRankings([])
    if (player._id) {
      setRankingsLoading(true)
      try {
        const data = await rankingService.getPlayerRankings(player._id, (player as any).zpin)
        setPlayerRankings(data)
      } catch {
        setPlayerRankings([])
      } finally {
        setRankingsLoading(false)
      }
    }
  }

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const data = await userService.getPlayers()
      setPlayers(data)
    } catch (err: any) {
      console.error('Failed to fetch players:', err)
      setError(err.message || 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter(player => {
    const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const matchesSearch = tokens.length === 0 || tokens.every(t =>
      player.firstName.toLowerCase().includes(t) ||
      player.lastName.toLowerCase().includes(t) ||
      (player.zpin?.toLowerCase() || '').includes(t) ||
      (player.email?.toLowerCase() || '').includes(t)
    )
    const matchesCategory = selectedCategory === 'all' || player.membershipType === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getSummary = () => {
    const summary = {
      totalPlayers: players.length,
      activeCount: players.filter(p => p.membershipStatus === 'active').length,
      juniorCount: players.filter(p => p.membershipType === 'junior').length,
      seniorCount: players.filter(p => p.membershipType === 'adult').length,
    }
    return summary
  }

  const summary = getSummary()

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero
          title="Player Database"
          description="Manage player registrations and ZPIN (Zambia Player Identification Number)"
          gradient
        />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading players...</p>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <Hero
          title="Player Database"
          description="Manage player registrations and ZPIN (Zambia Player Identification Number)"
          gradient
        />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchPlayers} className="mt-4">Try Again</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Player Database"
        description="Manage player registrations and ZPIN (Zambia Player Identification Number) payments"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Players</p>
                    <p className="text-3xl font-bold">{summary.totalPlayers}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-3xl font-bold text-primary">{summary.activeCount}</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Juniors</p>
                    <p className="text-3xl font-bold text-secondary">{summary.juniorCount}</p>
                  </div>
                  <UserPlus className="h-12 w-12 text-secondary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Seniors</p>
                    <p className="text-3xl font-bold">{summary.seniorCount}</p>
                  </div>
                  <UserPlus className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ZPIN, or club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'junior' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('junior')}
              >
                Juniors
              </Button>
              <Button
                variant={selectedCategory === 'adult' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('adult')}
              >
                Seniors
              </Button>
            </div>
          </div>

          {/* Players Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ZPIN</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Club</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Membership</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlayers.map((player) => (
                      <tr key={player._id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {player.hasActiveSubscription ? (
                            <span className="font-mono text-sm font-medium">{player.zpin || 'N/A'}</span>
                          ) : (
                            <span className="font-mono text-sm italic text-muted-foreground">••••••••</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{player.firstName} {player.lastName}</div>
                            <div className="text-sm text-muted-foreground">{player.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {player.membershipType || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{player.club || 'N/A'}</td>
                        <td className="px-4 py-3 text-center">
                          {getMembershipBadge(player.membershipStatus)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPlayer(player)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredPlayers.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No players found matching your search criteria
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Player Details Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
                <Badge className="capitalize">{selectedPlayer.membershipType || 'N/A'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">ZPIN:</span>
                    {selectedPlayer.hasActiveSubscription ? (
                      <p className="font-mono font-medium">{selectedPlayer.zpin || 'N/A'}</p>
                    ) : (
                      <p className="font-mono font-medium italic text-muted-foreground">
                        •••••••• (pay ZPIN to reveal)
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedPlayer.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Club:</span>
                    <p className="font-medium">{selectedPlayer.club || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <p className="font-medium capitalize">{selectedPlayer.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Membership Type:</span>
                    <p className="font-medium capitalize">{selectedPlayer.membershipType || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Membership Status:</span>
                    <div>{getMembershipBadge(selectedPlayer.membershipStatus)}</div>
                  </div>
                  {selectedPlayer.membershipExpiry && (
                    <div>
                      <span className="text-muted-foreground">Membership Expiry:</span>
                      <p className="font-medium">{new Date(selectedPlayer.membershipExpiry).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Joined:</span>
                    <p className="font-medium">{new Date(selectedPlayer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Rankings */}
              <div>
                <h4 className="font-semibold mb-3">Rankings</h4>
                {rankingsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading rankings…</p>
                ) : playerRankings.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No ranking records found.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {playerRankings.map(r => (
                      <div key={r._id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{rankingService.getCategoryLabel(r.category)}</span>
                        <div className="text-right">
                          <span className="font-semibold">#{r.rank}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({r.totalPoints} pts)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Match history & head-to-head */}
              <div>
                <h4 className="font-semibold mb-3">Match history & head-to-head</h4>
                <PlayerMatchHistory
                  playerId={selectedPlayer._id}
                  playerName={`${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedPlayer(null)} className="flex-1">
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
