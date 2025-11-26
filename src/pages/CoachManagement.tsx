import { useState, useEffect } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, DollarSign, Clock, X, User } from 'lucide-react'
import { coachService, type Coach } from '@/services/coachService'
import { clubService, type Club } from '@/services/clubService'
import { CoachListingPaymentForm } from '@/components/CoachListingPaymentForm'
import { uploadService } from '@/services/uploadService'

export function CoachManagement() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null)
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterListingStatus, setFilterListingStatus] = useState<string>('all')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    club: '',
    itfLevel: 'ITF Level 1' as 'ITF Level 1' | 'ITF Level 2' | 'ITF Level 3' | 'Other',
    experience: '',
    specializations: '',
    bio: '',
    languages: '',
    preferredContactMethod: 'both' as 'email' | 'phone' | 'both',
    availableForBooking: true,
    status: 'active' as 'active' | 'inactive',
    profileImage: ''
  })

  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [coachesData, clubsData] = await Promise.all([
        coachService.getCoaches(),
        clubService.getClubs()
      ])
      setCoaches(coachesData)
      setClubs(clubsData.filter(c => c.status === 'active'))
    } catch (err: any) {
      alert(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCoach = () => {
    setEditingCoach(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      club: '',
      itfLevel: 'ITF Level 1',
      experience: '',
      specializations: '',
      bio: '',
      languages: '',
      preferredContactMethod: 'both',
      availableForBooking: true,
      status: 'active',
      profileImage: ''
    })
    setShowModal(true)
  }

  const handleEditCoach = (coach: Coach) => {
    setEditingCoach(coach)
    setFormData({
      firstName: coach.firstName,
      lastName: coach.lastName,
      email: coach.email,
      phone: coach.phone,
      club: coach.club._id,
      itfLevel: coach.itfLevel,
      experience: coach.experience.toString(),
      specializations: coach.specializations?.join(', ') || '',
      bio: coach.bio || '',
      languages: coach.languages?.join(', ') || '',
      preferredContactMethod: coach.preferredContactMethod,
      availableForBooking: coach.availableForBooking,
      status: coach.status,
      profileImage: coach.profileImage || ''
    })
    setShowModal(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      const imageUrl = await uploadService.uploadImage(file)
      setFormData({ ...formData, profileImage: imageUrl })
    } catch (error: any) {
      alert(error.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const coachData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        club: formData.club,
        itfLevel: formData.itfLevel,
        experience: parseInt(formData.experience),
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(Boolean),
        languages: formData.languages.split(',').map(l => l.trim()).filter(Boolean),
        bio: formData.bio,
        preferredContactMethod: formData.preferredContactMethod,
        availableForBooking: formData.availableForBooking,
        status: formData.status,
        profileImage: formData.profileImage
      }

      if (editingCoach) {
        await coachService.updateCoach(editingCoach._id, coachData)
        alert('Coach updated successfully!')
      } else {
        await coachService.createCoach(coachData)
        alert('Coach created successfully!')
      }

      setShowModal(false)
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to save coach')
    }
  }

  const handleDeleteCoach = async (coach: Coach) => {
    if (!confirm(`Are you sure you want to delete ${coach.firstName} ${coach.lastName}? This cannot be undone.`)) {
      return
    }

    try {
      await coachService.deleteCoach(coach._id)
      alert('Coach deleted successfully!')
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete coach')
    }
  }

  const handleVerifyClub = async (status: 'verified' | 'rejected', reason?: string) => {
    if (!selectedCoach) return

    try {
      await coachService.verifyClubAssociation(selectedCoach._id, status, reason)
      alert(`Coach club association ${status}!`)
      setShowVerifyModal(false)
      setSelectedCoach(null)
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status')
    }
  }

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch =
      coach.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.club.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || coach.status === filterStatus
    const matchesListingStatus = filterListingStatus === 'all' || coach.listingStatus === filterListingStatus

    return matchesSearch && matchesStatus && matchesListingStatus
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      inactive: { variant: 'secondary', label: 'Inactive' },
      pending: { variant: 'outline', label: 'Pending' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      expired: { variant: 'secondary', label: 'Expired' },
      verified: { variant: 'default', label: 'Verified' },
      rejected: { variant: 'destructive', label: 'Rejected' }
    }
    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Coach Management" description="Manage tennis coaches" gradient />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading coaches...</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero title="Coach Management" description="Create, edit, and manage tennis coaches" gradient />

      <section className="py-16">
        <div className="container-custom">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search coaches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleCreateCoach}>
                <Plus className="h-4 w-4 mr-2" />
                Add Coach
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterListingStatus} onValueChange={setFilterListingStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by listing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Listings</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{coaches.length}</div>
                <div className="text-sm text-muted-foreground">Total Coaches</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{coaches.filter(c => c.listingStatus === 'active').length}</div>
                <div className="text-sm text-muted-foreground">Active Listings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{coaches.filter(c => c.clubVerificationStatus === 'pending').length}</div>
                <div className="text-sm text-muted-foreground">Pending Verification</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{coaches.filter(c => c.listingExpiryDate && new Date(c.listingExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}</div>
                <div className="text-sm text-muted-foreground">Expiring Soon</div>
              </CardContent>
            </Card>
          </div>

          {/* Coaches Table */}
          {filteredCoaches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No coaches found. Add your first coach to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCoaches.map((coach) => (
                <Card key={coach._id} className="card-elevated-hover">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{coach.fullName || `${coach.firstName} ${coach.lastName}`}</h3>
                          {getStatusBadge(coach.status)}
                          {getStatusBadge(coach.listingStatus)}
                          {getStatusBadge(coach.clubVerificationStatus)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div><strong>Email:</strong> {coach.email}</div>
                          <div><strong>Phone:</strong> {coach.phone}</div>
                          <div><strong>Club:</strong> {coach.club.name}</div>
                          <div><strong>ITF Level:</strong> {coach.itfLevel}</div>
                          <div><strong>Experience:</strong> {coach.experience} years</div>
                          {coach.listingExpiryDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <strong>Expires:</strong> {new Date(coach.listingExpiryDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {coach.specializations && coach.specializations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {coach.specializations.map((spec, idx) => (
                              <Badge key={idx} variant="outline">{spec}</Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {coach.clubVerificationStatus === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCoach(coach)
                              setShowVerifyModal(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCoach(coach)
                            setShowPaymentModal(true)
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditCoach(coach)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCoach(coach)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoach ? 'Edit Coach' : 'Add New Coach'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="cursor-pointer"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground mt-1">Uploading image...</p>
                  )}
                </div>
                {formData.profileImage ? (
                  <div className="relative">
                    <img
                      src={formData.profileImage}
                      alt="Profile preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => setFormData({ ...formData, profileImage: '' })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="club">Club *</Label>
                <Select value={formData.club} onValueChange={(value: string) => setFormData({ ...formData, club: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club._id} value={club._id}>{club.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="itfLevel">ITF Level *</Label>
                <Select value={formData.itfLevel} onValueChange={(value: any) => setFormData({ ...formData, itfLevel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ITF Level 1">ITF Level 1</SelectItem>
                    <SelectItem value="ITF Level 2">ITF Level 2</SelectItem>
                    <SelectItem value="ITF Level 3">ITF Level 3</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="experience">Years of Experience *</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="specializations">Specializations (comma separated)</Label>
              <Input
                id="specializations"
                value={formData.specializations}
                onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                placeholder="High Performance, Junior Development, etc."
              />
            </div>

            <div>
              <Label htmlFor="languages">Languages (comma separated)</Label>
              <Input
                id="languages"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                placeholder="English, Spanish, etc."
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select value={formData.preferredContactMethod} onValueChange={(value: any) => setFormData({ ...formData, preferredContactMethod: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCoach ? 'Update Coach' : 'Create Coach'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verify Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Club Association</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Verify {selectedCoach?.fullName}'s association with {selectedCoach?.club.name}?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const reason = prompt('Enter rejection reason:')
                  if (reason) handleVerifyClub('rejected', reason)
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={() => handleVerifyClub('verified')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Listing Payment</DialogTitle>
          </DialogHeader>
          {selectedCoach && (
            <CoachListingPaymentForm
              coach={selectedCoach}
              onSuccess={() => {
                setShowPaymentModal(false)
                setSelectedCoach(null)
                fetchData()
              }}
              onCancel={() => {
                setShowPaymentModal(false)
                setSelectedCoach(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
