import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Edit, Trash2 } from 'lucide-react'
import { userService, type User } from '@/services/userService'
import { clubService, type Club } from '@/services/clubService'

export function PlayerManagement() {
  const [players, setPlayers] = useState<User[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'junior' | 'adult'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    club: '',
    gender: '',
    membershipType: '',
    membershipStatus: '',
    zpin: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [playersData, clubsData] = await Promise.all([
        userService.getPlayers(),
        clubService.getClubs()
      ])
      setPlayers(playersData)
      setClubs(clubsData)
    } catch (err: any) {
      alert(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPlayer = (player: User) => {
    setEditingPlayer(player)
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email,
      phone: player.phone || '',
      club: player.club || '',
      gender: player.gender || '',
      membershipType: player.membershipType || '',
      membershipStatus: player.membershipStatus || '',
      zpin: player.zpin || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer) return

    try {
      const updateData = {
        ...formData,
        membershipType: formData.membershipType || null,
        membershipStatus: formData.membershipStatus || null,
        gender: formData.gender || undefined,
        phone: formData.phone || undefined,
        club: formData.club || undefined
      }

      // Check if club changed
      const clubChanged = editingPlayer.club !== formData.club

      await userService.updateUser(editingPlayer._id, updateData as any)

      // If club changed, update member counts for both old and new clubs
      if (clubChanged) {
        const oldClub = clubs.find(c => c.name === editingPlayer.club)
        const newClub = clubs.find(c => c.name === formData.club)

        const countUpdatePromises = []
        if (oldClub) {
          countUpdatePromises.push(
            clubService.updateMemberCount(oldClub._id).catch(err => {
              console.error('Failed to update old club count:', err)
              return null
            })
          )
        }
        if (newClub) {
          countUpdatePromises.push(
            clubService.updateMemberCount(newClub._id).catch(err => {
              console.error('Failed to update new club count:', err)
              return null
            })
          )
        }

        // Wait for count updates but don't fail if they error
        await Promise.all(countUpdatePromises)
      }

      alert('Player updated successfully! Note: If club counts don\'t update, use the "Sync Counts" button on the Club Management page.')
      setShowModal(false)
      fetchData()
    } catch (err: any) {
      console.error('Update player error:', err)
      alert(err.message || 'Failed to update player')
    }
  }

  const handleDeletePlayer = async (player: User) => {
    if (!confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}? This cannot be undone.`)) {
      return
    }

    try {
      await userService.deleteUser(player._id)

      // Update member count for the player's club
      if (player.club) {
        const club = clubs.find(c => c.name === player.club)
        if (club) {
          await clubService.updateMemberCount(club._id).catch(err => {
            console.error('Failed to update club count:', err)
            return null
          })
        }
      }

      alert('Player deleted successfully! Note: If club count doesn\'t update, use the "Sync Counts" button on the Club Management page.')
      fetchData()
    } catch (err: any) {
      console.error('Delete player error:', err)
      alert(err.message || 'Failed to delete player')
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch =
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.zpin?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (player.club?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' || player.membershipType === filterType

    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Player Management" description="Manage players" gradient />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading players...</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero title="Player Management" description="Edit players and move them between clubs" gradient />

      <section className="py-16">
        <div className="container-custom">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{players.length}</p>
                  <p className="text-sm text-muted-foreground">Total Players</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {players.filter(p => p.membershipType === 'junior').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Juniors</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-secondary">
                    {players.filter(p => p.membershipType === 'adult').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Seniors</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
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
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'junior' ? 'default' : 'outline'}
                onClick={() => setFilterType('junior')}
              >
                Juniors
              </Button>
              <Button
                variant={filterType === 'adult' ? 'default' : 'outline'}
                onClick={() => setFilterType('adult')}
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
                      <th className="px-4 py-3 text-left text-sm font-semibold">Club</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Type</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlayers.map((player) => (
                      <tr key={player._id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-sm">{player.zpin || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{player.firstName} {player.lastName}</div>
                            <div className="text-sm text-muted-foreground">{player.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{player.club || 'N/A'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="capitalize">
                            {player.membershipType || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={player.membershipStatus === 'active' ? 'default' : 'secondary'}>
                            {player.membershipStatus || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPlayer(player)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePlayer(player)}
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

              {filteredPlayers.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No players found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Edit Modal */}
      {showModal && editingPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Edit Player: {editingPlayer.firstName} {editingPlayer.lastName}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="zpin">ZPIN</Label>
                    <Input
                      id="zpin"
                      value={formData.zpin}
                      onChange={(e) => setFormData({ ...formData, zpin: e.target.value })}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="club">Club</Label>
                    <select
                      id="club"
                      value={formData.club}
                      onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">No Club</option>
                      {clubs.map((club) => (
                        <option key={club._id} value={club.name}>
                          {club.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="membershipType">Membership Type</Label>
                    <select
                      id="membershipType"
                      value={formData.membershipType}
                      onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select Type</option>
                      <option value="junior">Junior</option>
                      <option value="adult">Senior/Adult</option>
                      <option value="family">Family</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="membershipStatus">Membership Status</Label>
                    <select
                      id="membershipStatus"
                      value={formData.membershipStatus}
                      onChange={(e) => setFormData({ ...formData, membershipStatus: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update Player
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
