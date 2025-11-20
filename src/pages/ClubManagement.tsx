import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Users, RefreshCw } from 'lucide-react'
import { clubService, type Club } from '@/services/clubService'

export function ClubManagement() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    province: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    established: '',
    description: '',
    website: '',
    status: 'active' as 'active' | 'inactive'
  })

  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const data = await clubService.getClubs()
      setClubs(data)
    } catch (err: any) {
      alert(err.message || 'Failed to load clubs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClub = () => {
    setEditingClub(null)
    setFormData({
      name: '',
      city: '',
      province: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      established: '',
      description: '',
      website: '',
      status: 'active'
    })
    setShowModal(true)
  }

  const handleEditClub = (club: Club) => {
    setEditingClub(club)
    setFormData({
      name: club.name,
      city: club.city || '',
      province: club.province || '',
      contactPerson: club.contactPerson || '',
      email: club.email || '',
      phone: club.phone || '',
      address: club.address || '',
      established: club.established?.toString() || '',
      description: club.description || '',
      website: club.website || '',
      status: club.status
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const clubData = {
        ...formData,
        established: formData.established ? parseInt(formData.established) : undefined
      }

      if (editingClub) {
        await clubService.updateClub(editingClub._id, clubData)
        alert('Club updated successfully!')
      } else {
        await clubService.createClub(clubData)
        alert('Club created successfully!')
      }

      setShowModal(false)
      fetchClubs()
    } catch (err: any) {
      alert(err.message || 'Failed to save club')
    }
  }

  const handleDeleteClub = async (club: Club) => {
    if (!confirm(`Are you sure you want to delete ${club.name}? This cannot be undone.`)) {
      return
    }

    try {
      await clubService.deleteClub(club._id)
      alert('Club deleted successfully!')
      fetchClubs()
    } catch (err: any) {
      alert(err.message || 'Failed to delete club')
    }
  }

  const handleSyncMemberCounts = async () => {
    if (!confirm('This will update member counts for all clubs. Continue?')) {
      return
    }

    try {
      setSyncing(true)
      // Update count for each club
      for (const club of clubs) {
        await clubService.updateMemberCount(club._id)
      }
      alert('Member counts synchronized successfully!')
      fetchClubs()
    } catch (err: any) {
      alert(err.message || 'Failed to sync member counts')
    } finally {
      setSyncing(false)
    }
  }

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.province?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Club Management" description="Manage tennis clubs" gradient />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading clubs...</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero title="Club Management" description="Create, edit, and manage tennis clubs" gradient />

      <section className="py-16">
        <div className="container-custom">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSyncMemberCounts}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Counts'}
              </Button>
              <Button onClick={handleCreateClub}>
                <Plus className="h-4 w-4 mr-2" />
                Create Club
              </Button>
            </div>
          </div>

          {/* Clubs Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Members</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredClubs.map((club) => (
                      <tr key={club._id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{club.name}</td>
                        <td className="px-4 py-3 text-sm">
                          {[club.city, club.province].filter(Boolean).join(', ') || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {club.email || club.phone || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{club.memberCount}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={club.status === 'active' ? 'default' : 'secondary'}>
                            {club.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClub(club)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteClub(club)}
                              disabled={club.memberCount > 0}
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

              {filteredClubs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No clubs found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <Card
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{editingClub ? 'Edit Club' : 'Create New Club'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Club Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    <Label htmlFor="established">Year Established</Label>
                    <Input
                      id="established"
                      type="number"
                      value={formData.established}
                      onChange={(e) => setFormData({ ...formData, established: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingClub ? 'Update Club' : 'Create Club'}
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
