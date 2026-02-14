import { useState, useEffect } from 'react'
import axios from 'axios'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Search, Edit, Trash2, Download, Plus, Eye, CheckCircle2, XCircle,
  CreditCard, Loader2, FileText, ExternalLink
} from 'lucide-react'
import { userService, type User } from '@/services/userService'
import { clubService, type Club } from '@/services/clubService'
import {
  playerRegistrationService,
  type PlayerRegistration,
  type RegistrationsListResponse
} from '@/services/playerRegistrationService'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function PlayerManagement() {
  const [players, setPlayers] = useState<User[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'junior' | 'adult'>('all')
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('edit')
  const [editingPlayer, setEditingPlayer] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    club: '',
    gender: '',
    dateOfBirth: '',
    membershipType: '',
    membershipStatus: '',
    zpin: '',
    parentGuardianName: '',
    parentGuardianPhone: '',
    parentGuardianEmail: ''
  })
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null)
  const [suggestedMembershipType, setSuggestedMembershipType] = useState<string>('')

  // Applications tab state
  const [appData, setAppData] = useState<RegistrationsListResponse | null>(null)
  const [appLoading, setAppLoading] = useState(false)
  const [appSearch, setAppSearch] = useState('')
  const [appStatusFilter, setAppStatusFilter] = useState('')
  const [appPage, setAppPage] = useState(1)
  const [viewingApp, setViewingApp] = useState<PlayerRegistration | null>(null)
  const [editingApp, setEditingApp] = useState<PlayerRegistration | null>(null)
  const [editAppData, setEditAppData] = useState<any>({})
  const [showApproveDialog, setShowApproveDialog] = useState<PlayerRegistration | null>(null)
  const [approveNotes, setApproveNotes] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState<PlayerRegistration | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showPaymentDialog, setShowPaymentDialog] = useState<PlayerRegistration | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

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

  // Fetch applications
  const fetchApplications = async (page = 1) => {
    try {
      setAppLoading(true)
      const data = await playerRegistrationService.getRegistrations({
        page,
        limit: 20,
        status: appStatusFilter || undefined,
        search: appSearch || undefined,
      })
      setAppData(data)
      setAppPage(page)
    } catch (err: any) {
      console.error('Failed to fetch applications:', err)
    } finally {
      setAppLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications(1)
  }, [appStatusFilter])

  const handleAppSearch = () => {
    fetchApplications(1)
  }

  // Auto-fetch next ZPIN when membership type changes in create mode
  useEffect(() => {
    const fetchNextZpin = async () => {
      if (mode === 'create' && formData.membershipType) {
        try {
          const user = localStorage.getItem('user')
          const token = user ? JSON.parse(user).token : null

          if (!token) return

          const response = await axios.get(
            `${API_URL}/api/players/next-zpin/${formData.membershipType}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )

          if (response.data.success) {
            setFormData(prev => ({ ...prev, zpin: response.data.data.zpin }))
          }
        } catch (error) {
          console.error('Failed to fetch next ZPIN:', error)
        }
      } else if (mode === 'create' && !formData.membershipType) {
        setFormData(prev => ({ ...prev, zpin: '' }))
      }
    }

    fetchNextZpin()
  }, [mode, formData.membershipType])

  // Calculate age and suggest membership type when DOB changes
  useEffect(() => {
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      setCalculatedAge(age)

      const suggested = age < 18 ? 'junior' : 'adult'
      setSuggestedMembershipType(suggested)

      if (mode === 'create' && !formData.membershipType) {
        setFormData(prev => ({ ...prev, membershipType: suggested }))
      }
    } else {
      setCalculatedAge(null)
      setSuggestedMembershipType('')
    }
  }, [formData.dateOfBirth, mode])

  const handleAddNewPlayer = () => {
    setMode('create')
    setEditingPlayer(null)
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      club: '',
      gender: '',
      dateOfBirth: '',
      membershipType: '',
      membershipStatus: '',
      zpin: '',
      parentGuardianName: '',
      parentGuardianPhone: '',
      parentGuardianEmail: ''
    })
    setCalculatedAge(null)
    setSuggestedMembershipType('')
    setShowModal(true)
  }

  const handleEditPlayer = (player: User) => {
    setMode('edit')
    setEditingPlayer(player)
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email && !player.email.includes('@noemail.zambiatennis.local')
        ? player.email
        : '',
      password: '',
      phone: player.phone || '',
      club: player.club || '',
      gender: player.gender || '',
      dateOfBirth: player.dateOfBirth ? player.dateOfBirth.split('T')[0] : '',
      membershipType: player.membershipType || '',
      membershipStatus: player.membershipStatus || '',
      zpin: player.zpin || '',
      parentGuardianName: player.parentGuardianName || '',
      parentGuardianPhone: player.parentGuardianPhone || '',
      parentGuardianEmail: player.parentGuardianEmail || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email && !formData.phone) {
      alert('Please provide at least one contact method (email or phone)')
      return
    }

    if (calculatedAge !== null && calculatedAge < 18) {
      if (!formData.parentGuardianName || !formData.parentGuardianPhone) {
        alert('Parent/guardian name and phone are required for players under 18 years old')
        return
      }
    }

    try {
      if (mode === 'create') {
        if (formData.password && formData.password.length < 6) {
          alert('Password must be at least 6 characters')
          return
        }

        const createData = {
          ...formData,
          password: formData.password || undefined,
          role: 'player',
          membershipType: formData.membershipType || null,
          membershipStatus: formData.membershipStatus || null,
          gender: formData.gender || undefined,
          phone: formData.phone || undefined,
          club: formData.club || undefined
        }

        await userService.createUser(createData as any)

        if (formData.club) {
          const club = clubs.find(c => c.name === formData.club)
          if (club) {
            await clubService.updateMemberCount(club._id).catch(err => {
              console.error('Failed to update club count:', err)
              return null
            })
          }
        }

        alert('Player created successfully!')
        setShowModal(false)
        fetchData()
      } else {
        if (!editingPlayer) return
      const { password: _password, ...formDataWithoutPassword } = formData
      const updateData = {
        ...formDataWithoutPassword,
        membershipType: formData.membershipType || null,
        membershipStatus: formData.membershipStatus || null,
        gender: formData.gender || undefined,
        phone: formData.phone || undefined,
        club: formData.club || undefined
      }

      const clubChanged = editingPlayer.club !== formData.club

      await userService.updateUser(editingPlayer._id, updateData as any)

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

        await Promise.all(countUpdatePromises)
      }

        alert('Player updated successfully! Note: If club counts don\'t update, use the "Sync Counts" button on the Club Management page.')
        setShowModal(false)
        fetchData()
      }
    } catch (err: any) {
      console.error(mode === 'create' ? 'Create player error:' : 'Update player error:', err)
      alert(err.message || (mode === 'create' ? 'Failed to create player' : 'Failed to update player'))
    }
  }

  const handleDeletePlayer = async (player: User) => {
    if (!confirm(`Are you sure you want to delete ${player.firstName} ${player.lastName}? This cannot be undone.`)) {
      return
    }

    try {
      await userService.deleteUser(player._id)

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

  const handleExportToExcel = async () => {
    try {
      setExporting(true)

      const API_URL = import.meta.env.VITE_API_URL || 'https://zta-backend-y10h.onrender.com'
      const user = localStorage.getItem('user')
      const token = user ? JSON.parse(user).token : null

      if (!token) {
        alert('You must be logged in to export players')
        return
      }

      const response = await fetch(`${API_URL}/api/players/export/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to export players')
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ZTA_Players_Export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)

      alert('Players exported successfully!')
    } catch (err: any) {
      console.error('Export error:', err)
      alert(err.message || 'Failed to export players to Excel')
    } finally {
      setExporting(false)
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

  // === Application actions ===
  const handleViewApp = async (app: PlayerRegistration) => {
    try {
      const full = await playerRegistrationService.getRegistration(app._id)
      setViewingApp(full)
    } catch {
      setViewingApp(app)
    }
  }

  const handleEditApp = (app: PlayerRegistration) => {
    setEditingApp(app)
    setEditAppData({
      firstName: app.firstName,
      lastName: app.lastName,
      dateOfBirth: app.dateOfBirth ? app.dateOfBirth.split('T')[0] : '',
      gender: app.gender,
      phone: app.phone,
      email: app.email || '',
      club: app.club || '',
      isInternational: app.isInternational,
      parentGuardianName: app.parentGuardianName || '',
      parentGuardianPhone: app.parentGuardianPhone || '',
      parentGuardianEmail: app.parentGuardianEmail || '',
      adminNotes: app.adminNotes || '',
    })
  }

  const handleSaveEditApp = async () => {
    if (!editingApp) return
    try {
      setActionLoading(true)
      await playerRegistrationService.updateRegistration(editingApp._id, editAppData)
      alert('Application updated successfully')
      setEditingApp(null)
      fetchApplications(appPage)
    } catch (err: any) {
      alert(err.message || 'Failed to update application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!showApproveDialog) return
    try {
      setActionLoading(true)
      const result = await playerRegistrationService.approveRegistration(showApproveDialog._id, approveNotes)
      alert(`Approved! ZPIN: ${result.user.zpin}`)
      setShowApproveDialog(null)
      setApproveNotes('')
      fetchApplications(appPage)
      fetchData() // Refresh players list
    } catch (err: any) {
      alert(err.message || 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!showRejectDialog || !rejectReason.trim()) {
      alert('Rejection reason is required')
      return
    }
    try {
      setActionLoading(true)
      await playerRegistrationService.rejectRegistration(showRejectDialog._id, rejectReason)
      alert('Application rejected')
      setShowRejectDialog(null)
      setRejectReason('')
      fetchApplications(appPage)
    } catch (err: any) {
      alert(err.message || 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!showPaymentDialog) return
    try {
      setActionLoading(true)
      await playerRegistrationService.recordManualPayment(showPaymentDialog._id, {
        paymentMethod,
        paymentReference: paymentRef || undefined,
        adminNotes: paymentNotes || undefined,
      })
      alert('Payment recorded. Application is now pending approval.')
      setShowPaymentDialog(null)
      setPaymentMethod('cash')
      setPaymentRef('')
      setPaymentNotes('')
      fetchApplications(appPage)
    } catch (err: any) {
      alert(err.message || 'Failed to record payment')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending Payment</Badge>
      case 'pending_approval':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Pending Approval</Badge>
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const calcAge = (dob: string) => {
    if (!dob) return null
    const birth = new Date(dob)
    return Math.floor((new Date().getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

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
      <Hero title="Player Management" description="Edit players and manage registration applications" gradient />

      <section className="py-16">
        <div className="container-custom">
          <Tabs defaultValue="players">
            <TabsList className="mb-6">
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="applications">
                Applications
                {appData?.statusCounts && (appData.statusCounts.pending_payment + appData.statusCounts.pending_approval) > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs rounded-full px-2 py-0.5">
                    {appData.statusCounts.pending_payment + appData.statusCounts.pending_approval}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ==================== PLAYERS TAB ==================== */}
            <TabsContent value="players">
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
                <div className="flex gap-2 flex-wrap">
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
                  <Button
                    onClick={handleAddNewPlayer}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Player
                  </Button>
                  <Button
                    onClick={handleExportToExcel}
                    disabled={exporting || players.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'Exporting...' : 'Export to Excel'}
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
                                <div className="text-sm text-muted-foreground">
                                  {player.email && !player.email.includes('@noemail.zambiatennis.local')
                                    ? player.email
                                    : player.phone || 'No contact info'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{player.club || 'N/A'}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className="capitalize">
                                {player.membershipType || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant={player.membershipStatus === 'active' ? 'default' : 'secondary'}
                                className={
                                  player.membershipStatus === 'active' ? 'bg-green-600' :
                                  player.membershipStatus === 'inactive' ? 'text-orange-600' :
                                  player.membershipStatus === 'expired' ? 'text-red-600' : ''
                                }
                              >
                                {(player.membershipStatus || 'inactive').toUpperCase()}
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
            </TabsContent>

            {/* ==================== APPLICATIONS TAB ==================== */}
            <TabsContent value="applications">
              {/* Status Filter Buttons with Counts */}
              {appData?.statusCounts && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    { key: '', label: 'All', count: Object.values(appData.statusCounts).reduce((a, b) => a + b, 0) },
                    { key: 'pending_payment', label: 'Pending Payment', count: appData.statusCounts.pending_payment },
                    { key: 'pending_approval', label: 'Pending Approval', count: appData.statusCounts.pending_approval },
                    { key: 'approved', label: 'Approved', count: appData.statusCounts.approved },
                    { key: 'rejected', label: 'Rejected', count: appData.statusCounts.rejected },
                  ].map(item => (
                    <Button
                      key={item.key}
                      variant={appStatusFilter === item.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAppStatusFilter(item.key)}
                    >
                      {item.label}
                      <span className="ml-1.5 text-xs opacity-75">({item.count})</span>
                    </Button>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or reference..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAppSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleAppSearch}>Search</Button>
              </div>

              {/* Applications Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold">Reference</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold">Name</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">DOB / Age</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">Gender</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold">Club</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">Type</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">Amount</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">Status</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">Date</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {appLoading ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </td>
                          </tr>
                        ) : appData?.registrations?.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-muted-foreground">
                              No applications found
                            </td>
                          </tr>
                        ) : (
                          appData?.registrations?.map(app => {
                            const age = calcAge(app.dateOfBirth)
                            return (
                              <tr key={app._id} className="hover:bg-muted/50">
                                <td className="px-3 py-2 font-mono text-xs">{app.referenceNumber}</td>
                                <td className="px-3 py-2">
                                  <div className="font-medium text-sm">{app.firstName} {app.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{app.phone}</div>
                                </td>
                                <td className="px-3 py-2 text-center text-xs">
                                  {app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                  {age !== null && <span className="text-muted-foreground ml-1">({age})</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-xs capitalize">{app.gender}</td>
                                <td className="px-3 py-2 text-xs">{app.club || '-'}</td>
                                <td className="px-3 py-2 text-center">
                                  <Badge variant="outline" className="text-xs">{app.membershipTypeName}</Badge>
                                </td>
                                <td className="px-3 py-2 text-center text-xs font-medium">K{app.paymentAmount}</td>
                                <td className="px-3 py-2 text-center">{getStatusBadge(app.status)}</td>
                                <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                                  {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="sm" variant="ghost" title="View" onClick={() => handleViewApp(app)}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" title="Edit" onClick={() => handleEditApp(app)}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    {app.status === 'pending_payment' && (
                                      <Button size="sm" variant="ghost" title="Record Payment" onClick={() => setShowPaymentDialog(app)}>
                                        <CreditCard className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    {app.status === 'pending_approval' && (
                                      <>
                                        <Button size="sm" variant="ghost" title="Approve" className="text-green-600" onClick={() => setShowApproveDialog(app)}>
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" title="Reject" className="text-red-600" onClick={() => setShowRejectDialog(app)}>
                                          <XCircle className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Pagination */}
              {appData && appData.pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={appPage <= 1}
                    onClick={() => fetchApplications(appPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {appPage} of {appData.pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={appPage >= appData.pagination.pages}
                    onClick={() => fetchApplications(appPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ==================== MODALS ==================== */}

      {/* Create/Edit Player Modal */}
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
              <CardTitle>
                {mode === 'create'
                  ? 'Add New Player'
                  : `Edit Player: ${editingPlayer?.firstName} ${editingPlayer?.lastName}`
                }
              </CardTitle>
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
                    <Label htmlFor="dateOfBirth">
                      Date of Birth *
                      {calculatedAge !== null && (
                        <span className="text-muted-foreground ml-2">
                          (Age: {calculatedAge})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      required={mode === 'create'}
                    />
                    {suggestedMembershipType && mode === 'create' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Suggested: {suggestedMembershipType === 'junior' ? 'Junior' : 'Senior/Adult'}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">
                      Email
                      {!formData.phone && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required={!formData.phone}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required if no phone number provided
                    </p>
                  </div>

                  {mode === 'create' && (
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Optional - only if player needs login access"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank if player doesn't need to log in
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="phone">
                      Phone
                      {!formData.email && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required={!formData.email}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required if no email provided
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="zpin">ZPIN</Label>
                    <Input
                      id="zpin"
                      value={formData.zpin}
                      onChange={(e) => setFormData({ ...formData, zpin: e.target.value })}
                      disabled={mode === 'edit'}
                      className={mode === 'edit' ? 'bg-muted' : ''}
                      placeholder={mode === 'create' ? 'Optional' : ''}
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
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  {(formData.membershipType === 'junior' || (calculatedAge !== null && calculatedAge < 18)) && (
                    <>
                      <div className="col-span-2 pt-4 border-t">
                        <h3 className="text-sm font-semibold mb-3">Parent/Guardian Information</h3>
                      </div>

                      <div>
                        <Label htmlFor="parentGuardianName">
                          Parent/Guardian Name
                          {calculatedAge !== null && calculatedAge < 18 && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                          id="parentGuardianName"
                          value={formData.parentGuardianName}
                          onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
                          required={calculatedAge !== null && calculatedAge < 18}
                        />
                      </div>

                      <div>
                        <Label htmlFor="parentGuardianPhone">
                          Parent/Guardian Phone
                          {calculatedAge !== null && calculatedAge < 18 && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                          id="parentGuardianPhone"
                          value={formData.parentGuardianPhone}
                          onChange={(e) => setFormData({ ...formData, parentGuardianPhone: e.target.value })}
                          required={calculatedAge !== null && calculatedAge < 18}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label htmlFor="parentGuardianEmail">Parent/Guardian Email</Label>
                        <Input
                          id="parentGuardianEmail"
                          type="email"
                          value={formData.parentGuardianEmail}
                          onChange={(e) => setFormData({ ...formData, parentGuardianEmail: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {mode === 'create' ? 'Create Player' : 'Update Player'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Application Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewingApp(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Application Details</CardTitle>
                {getStatusBadge(viewingApp.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-mono font-medium">{viewingApp.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{viewingApp.firstName} {viewingApp.lastName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {viewingApp.dateOfBirth ? new Date(viewingApp.dateOfBirth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    {(() => { const a = calcAge(viewingApp.dateOfBirth); return a !== null ? ` (Age: ${a})` : ''; })()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{viewingApp.gender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{viewingApp.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingApp.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Club</p>
                  <p className="font-medium">{viewingApp.club || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">International</p>
                  <p className="font-medium">{viewingApp.isInternational ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Membership Type</p>
                  <p className="font-medium">{viewingApp.membershipTypeName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold">K{viewingApp.paymentAmount}</p>
                </div>
                {viewingApp.paymentMethod && (
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{viewingApp.paymentMethod.replace('_', ' ')}</p>
                  </div>
                )}
                {viewingApp.paymentDate && (
                  <div>
                    <p className="text-muted-foreground">Payment Date</p>
                    <p className="font-medium">{new Date(viewingApp.paymentDate).toLocaleDateString('en-GB')}</p>
                  </div>
                )}
              </div>

              {/* Guardian Info */}
              {viewingApp.parentGuardianName && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Parent/Guardian</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{viewingApp.parentGuardianName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{viewingApp.parentGuardianPhone}</p>
                    </div>
                    {viewingApp.parentGuardianEmail && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{viewingApp.parentGuardianEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proof of Age */}
              {viewingApp.proofOfAgeDocument?.url && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Proof of Age Document</h4>
                  {viewingApp.proofOfAgeDocument.fileType === 'pdf' ? (
                    <a
                      href={viewingApp.proofOfAgeDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="h-5 w-5" />
                      {viewingApp.proofOfAgeDocument.originalName || 'View PDF'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <a href={viewingApp.proofOfAgeDocument.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={viewingApp.proofOfAgeDocument.url}
                        alt="Proof of age"
                        className="max-w-sm rounded-lg border cursor-pointer hover:opacity-90"
                      />
                    </a>
                  )}
                </div>
              )}

              {/* Rejection reason */}
              {viewingApp.rejectionReason && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-1 text-red-600">Rejection Reason</h4>
                  <p className="text-sm">{viewingApp.rejectionReason}</p>
                </div>
              )}

              {/* Admin notes */}
              {viewingApp.adminNotes && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-1">Admin Notes</h4>
                  <p className="text-sm">{viewingApp.adminNotes}</p>
                </div>
              )}

              {/* Created user */}
              {viewingApp.createdUserId && typeof viewingApp.createdUserId === 'object' && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-1 text-green-600">Created Player</h4>
                  <p className="text-sm">
                    {viewingApp.createdUserId.firstName} {viewingApp.createdUserId.lastName} — ZPIN: {viewingApp.createdUserId.zpin}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setViewingApp(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Application Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingApp(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Edit Application: {editingApp.referenceNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={editAppData.firstName} onChange={(e) => setEditAppData({ ...editAppData, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={editAppData.lastName} onChange={(e) => setEditAppData({ ...editAppData, lastName: e.target.value })} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editAppData.dateOfBirth} onChange={(e) => setEditAppData({ ...editAppData, dateOfBirth: e.target.value })} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select value={editAppData.gender} onChange={(e) => setEditAppData({ ...editAppData, gender: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={editAppData.phone} onChange={(e) => setEditAppData({ ...editAppData, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editAppData.email} onChange={(e) => setEditAppData({ ...editAppData, email: e.target.value })} />
                </div>
                <div>
                  <Label>Club</Label>
                  <select value={editAppData.club} onChange={(e) => setEditAppData({ ...editAppData, club: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">No Club</option>
                    {clubs.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="editIntl" checked={editAppData.isInternational} onChange={(e) => setEditAppData({ ...editAppData, isInternational: e.target.checked })} className="h-4 w-4" />
                  <Label htmlFor="editIntl" className="mb-0">International</Label>
                </div>
                <div>
                  <Label>Guardian Name</Label>
                  <Input value={editAppData.parentGuardianName} onChange={(e) => setEditAppData({ ...editAppData, parentGuardianName: e.target.value })} />
                </div>
                <div>
                  <Label>Guardian Phone</Label>
                  <Input value={editAppData.parentGuardianPhone} onChange={(e) => setEditAppData({ ...editAppData, parentGuardianPhone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Guardian Email</Label>
                  <Input type="email" value={editAppData.parentGuardianEmail} onChange={(e) => setEditAppData({ ...editAppData, parentGuardianEmail: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Admin Notes</Label>
                  <textarea value={editAppData.adminNotes} onChange={(e) => setEditAppData({ ...editAppData, adminNotes: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditingApp(null)}>Cancel</Button>
                <Button onClick={handleSaveEditApp} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approve Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowApproveDialog(null)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Approve Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Approve <strong>{showApproveDialog.firstName} {showApproveDialog.lastName}</strong>'s registration?
                This will create a new player with an assigned ZPIN.
              </p>
              <div>
                <Label>Admin Notes (optional)</Label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowApproveDialog(null)}>Cancel</Button>
                <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRejectDialog(null)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                Reject Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Reject <strong>{showRejectDialog.firstName} {showRejectDialog.lastName}</strong>'s registration?
              </p>
              <div>
                <Label>Rejection Reason *</Label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRejectDialog(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPaymentDialog(null)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Record Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Record offline payment for <strong>{showPaymentDialog.firstName} {showPaymentDialog.lastName}</strong> — K{showPaymentDialog.paymentAmount}
              </p>
              <div>
                <Label>Payment Method *</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Payment Reference (optional)</Label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. receipt number, transfer ref..."
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPaymentDialog(null)}>Cancel</Button>
                <Button onClick={handleRecordPayment} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Record Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
