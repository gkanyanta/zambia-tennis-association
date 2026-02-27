import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CreditCard,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  Building2,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Banknote,
  FileDown,
  Mail
} from 'lucide-react'
import debounce from 'lodash/debounce'
import { useAuth } from '@/context/AuthContext'
import {
  membershipService,
  MembershipType,
  MembershipSubscription,
  SubscriptionStats,
  ClubSearchResult,
  PlayerSearchResult
} from '@/services/membershipService'
import { lencoPaymentService } from '@/services/lencoPaymentService'

export function MembershipAdmin() {
  const navigate = useNavigate()
  const { isAdmin, isAuthenticated } = useAuth()

  // State
  const [activeTab, setActiveTab] = useState('subscriptions')
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [subscriptions, setSubscriptions] = useState<MembershipSubscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEntityType, setFilterEntityType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Dialogs
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<MembershipType | null>(null)
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    category: 'player' as 'player' | 'club',
    amount: '',
    minAge: '',
    maxAge: '',
    benefits: ''
  })
  const [savingType, setSavingType] = useState(false)

  // Confirm payment dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmingSub, setConfirmingSub] = useState<MembershipSubscription | null>(null)
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState('bank_transfer')
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null)

  // Manual payment dialog
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false)
  const [manualEntityType, setManualEntityType] = useState<'player' | 'club'>('club')
  const [entitySearchQuery, setEntitySearchQuery] = useState('')
  const [entitySearchResults, setEntitySearchResults] = useState<(ClubSearchResult | PlayerSearchResult)[]>([])
  const [entitySearching, setEntitySearching] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<{ _id: string; name: string } | null>(null)
  const [manualMembershipTypeId, setManualMembershipTypeId] = useState('')
  const [manualYear, setManualYear] = useState(new Date().getFullYear().toString())
  const [manualPaymentMethod, setManualPaymentMethod] = useState('bank_transfer')
  const [manualTransactionRef, setManualTransactionRef] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [savingManualPayment, setSavingManualPayment] = useState(false)
  const [manualPaymentSuccess, setManualPaymentSuccess] = useState<string | null>(null)

  // Send receipt dialog
  const [sendReceiptOpen, setSendReceiptOpen] = useState(false)
  const [sendReceiptSub, setSendReceiptSub] = useState<MembershipSubscription | null>(null)
  const [sendReceiptEmail, setSendReceiptEmail] = useState('')
  const [sendingReceipt, setSendingReceipt] = useState(false)
  const [sendReceiptResult, setSendReceiptResult] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else if (!isAdmin) {
      navigate('/')
    }
  }, [isAuthenticated, isAdmin, navigate])

  // Fetch data
  useEffect(() => {
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin, currentPage, filterEntityType, filterStatus, searchTerm])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [typesData, statsData] = await Promise.all([
        membershipService.getMembershipTypes({ activeOnly: false }),
        membershipService.getStats()
      ])

      setMembershipTypes(typesData)
      setStats(statsData)

      // Fetch subscriptions with filters
      const subsData = await membershipService.getSubscriptions({
        page: currentPage,
        limit: 20,
        entityType: filterEntityType !== 'all' ? filterEntityType as 'player' | 'club' : undefined,
        status: filterStatus !== 'all' ? filterStatus as any : undefined,
        search: searchTerm || undefined
      })

      setSubscriptions(subsData.subscriptions)
      setTotalPages(subsData.pagination.pages)
    } catch (err: any) {
      console.error('Failed to fetch membership data:', err)
      setError(err.message || 'Failed to load membership data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenTypeDialog = (type?: MembershipType) => {
    if (type) {
      setEditingType(type)
      setTypeForm({
        name: type.name,
        code: type.code,
        description: type.description || '',
        category: type.category,
        amount: type.amount.toString(),
        minAge: type.minAge?.toString() || '',
        maxAge: type.maxAge?.toString() || '',
        benefits: type.benefits.join('\n')
      })
    } else {
      setEditingType(null)
      setTypeForm({
        name: '',
        code: '',
        description: '',
        category: 'player',
        amount: '',
        minAge: '',
        maxAge: '',
        benefits: ''
      })
    }
    setTypeDialogOpen(true)
  }

  const handleSaveType = async () => {
    try {
      setSavingType(true)
      setError(null)

      const data = {
        name: typeForm.name,
        code: typeForm.code,
        description: typeForm.description,
        category: typeForm.category,
        amount: parseFloat(typeForm.amount),
        minAge: typeForm.minAge ? parseInt(typeForm.minAge) : null,
        maxAge: typeForm.maxAge ? parseInt(typeForm.maxAge) : null,
        benefits: typeForm.benefits.split('\n').filter(b => b.trim())
      }

      if (editingType) {
        await membershipService.updateMembershipType(editingType._id, data)
      } else {
        await membershipService.createMembershipType(data)
      }

      setTypeDialogOpen(false)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to save membership type')
    } finally {
      setSavingType(false)
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this membership type?')) return

    try {
      await membershipService.deleteMembershipType(id)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete membership type')
    }
  }

  const handleConfirmPayment = async () => {
    if (!confirmingSub) return
    try {
      setConfirmingPayment(true)
      setConfirmError(null)
      setConfirmSuccess(null)
      const result = await membershipService.confirmSubscription(confirmingSub._id, confirmPaymentMethod)
      setConfirmSuccess(
        `Activated ${confirmingSub.entityName}${result.zpin ? ` (ZPIN: ${result.zpin})` : ''}. Receipt: ${result.transaction?.receiptNumber || 'N/A'}`
      )
      fetchData()
    } catch (err: any) {
      setConfirmError(err.message || 'Failed to confirm payment')
    } finally {
      setConfirmingPayment(false)
    }
  }

  // Download receipt
  const handleDownloadReceipt = (receiptNumber: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    window.open(`${apiUrl}/api/lenco/receipt/${receiptNumber}`, '_blank')
  }

  // Send receipt to email
  const handleSendReceipt = async () => {
    if (!sendReceiptSub?.receiptNumber || !sendReceiptEmail.trim()) return
    setSendingReceipt(true)
    setSendReceiptResult(null)
    try {
      await lencoPaymentService.resendReceipt(sendReceiptSub.receiptNumber, sendReceiptEmail.trim())
      setSendReceiptResult(`Receipt sent to ${sendReceiptEmail.trim()}`)
    } catch (err: any) {
      setSendReceiptResult(`Failed: ${err.message || 'Could not send receipt'}`)
    } finally {
      setSendingReceipt(false)
    }
  }

  // Manual payment entity search
  const debouncedEntitySearch = useCallback(
    debounce(async (query: string, entityType: 'player' | 'club') => {
      if (!query || query.length < 2) {
        setEntitySearchResults([])
        setEntitySearching(false)
        return
      }
      try {
        setEntitySearching(true)
        if (entityType === 'club') {
          const results = await membershipService.searchClubs(query)
          setEntitySearchResults(results)
        } else {
          const results = await membershipService.searchPlayers(query)
          setEntitySearchResults(results)
        }
      } catch (err) {
        console.error('Entity search failed:', err)
      } finally {
        setEntitySearching(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    if (manualPaymentOpen) {
      debouncedEntitySearch(entitySearchQuery, manualEntityType)
    }
    return () => debouncedEntitySearch.cancel()
  }, [entitySearchQuery, manualEntityType, manualPaymentOpen, debouncedEntitySearch])

  const handleOpenManualPayment = () => {
    setManualEntityType('club')
    setEntitySearchQuery('')
    setEntitySearchResults([])
    setSelectedEntity(null)
    setManualMembershipTypeId('')
    setManualYear(new Date().getFullYear().toString())
    setManualPaymentMethod('bank_transfer')
    setManualTransactionRef('')
    setManualAmount('')
    setManualNotes('')
    setManualPaymentSuccess(null)
    setManualPaymentOpen(true)
  }

  const handleSelectEntity = (entity: ClubSearchResult | PlayerSearchResult) => {
    const name = 'firstName' in entity ? `${entity.firstName} ${entity.lastName}` : entity.name
    setSelectedEntity({ _id: entity._id, name })
    setEntitySearchQuery('')
    setEntitySearchResults([])

    // Auto-select first matching membership type
    const category = manualEntityType === 'club' ? 'club' : 'player'
    const matchingType = membershipTypes.find(t => t.category === category && t.isActive)
    if (matchingType) {
      setManualMembershipTypeId(matchingType._id)
      setManualAmount(matchingType.amount.toString())
    }
  }

  const handleManualPaymentSubmit = async () => {
    if (!selectedEntity) {
      setError('Please select a club or player')
      return
    }
    if (!manualMembershipTypeId) {
      setError('Please select a membership type')
      return
    }

    try {
      setSavingManualPayment(true)
      setError(null)

      const result = await membershipService.recordManualPayment({
        entityType: manualEntityType,
        entityId: selectedEntity._id,
        membershipTypeId: manualMembershipTypeId,
        year: parseInt(manualYear, 10),
        amount: manualAmount ? parseFloat(manualAmount) : undefined,
        paymentMethod: manualPaymentMethod as any,
        transactionReference: manualTransactionRef || undefined,
        notes: manualNotes || undefined,
      })

      setManualPaymentSuccess(
        `Payment recorded for ${selectedEntity.name} (${manualYear}). Receipt: ${result.transaction?.receiptNumber || 'N/A'}${result.zpin ? `, ZPIN: ${result.zpin}` : ''}`
      )
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setSavingManualPayment(false)
    }
  }

  const EARLIEST_PAYABLE_YEAR = 2024

  if (!isAdmin) {
    return null
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="flex flex-col">
      <Hero
        title="Membership Management"
        description="Manage ZPIN memberships, club affiliations, and pricing"
        gradient
      />

      <section className="py-8">
        <div className="container-custom">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Players</p>
                      <p className="text-3xl font-bold">{stats.activePlayers}</p>
                    </div>
                    <User className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Clubs</p>
                      <p className="text-3xl font-bold">{stats.activeClubs}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue ({currentYear})</p>
                      <p className="text-3xl font-bold">K{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Membership Types</p>
                      <p className="text-3xl font-bold">{membershipTypes.filter(t => t.isActive).length}</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-orange-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="types">Membership Types</TabsTrigger>
            </TabsList>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle>Active Subscriptions</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, ZPIN..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 w-[200px]"
                        />
                      </div>
                      <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="player">Players</SelectItem>
                          <SelectItem value="club">Clubs</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleOpenManualPayment}>
                        <Banknote className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : subscriptions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No subscriptions found
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Entity</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Membership</TableHead>
                            <TableHead>ZPIN</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subscriptions.map((sub) => (
                            <TableRow key={sub._id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {sub.entityType === 'player' ? (
                                    <User className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <Building2 className="h-4 w-4 text-purple-500" />
                                  )}
                                  <span className="font-medium">{sub.entityName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {sub.entityType}
                                </Badge>
                              </TableCell>
                              <TableCell>{sub.membershipTypeName}</TableCell>
                              <TableCell>
                                {sub.zpin ? (
                                  <span className="font-mono text-sm">{sub.zpin}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  sub.status === 'active' ? 'default' :
                                  sub.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }>
                                  {sub.status}
                                </Badge>
                              </TableCell>
                              <TableCell>K{sub.amount}</TableCell>
                              <TableCell>
                                {new Date(sub.endDate).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {sub.status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => {
                                        setConfirmingSub(sub)
                                        setConfirmPaymentMethod('bank_transfer')
                                        setConfirmError(null)
                                        setConfirmSuccess(null)
                                        setConfirmDialogOpen(true)
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Confirm
                                    </Button>
                                  )}
                                  {sub.receiptNumber && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Download Receipt"
                                        onClick={() => handleDownloadReceipt(sub.receiptNumber!)}
                                      >
                                        <FileDown className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Send Receipt to Email"
                                        onClick={() => {
                                          setSendReceiptSub(sub)
                                          setSendReceiptEmail('')
                                          setSendReceiptResult(null)
                                          setSendReceiptOpen(true)
                                        }}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Membership Types Tab */}
            <TabsContent value="types">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Membership Types & Pricing</CardTitle>
                    <Button onClick={() => handleOpenTypeDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Type
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Player Memberships */}
                      <div>
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-500" />
                          Player ZPIN Memberships
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {membershipTypes
                            .filter(t => t.category === 'player')
                            .map((type) => (
                              <Card key={type._id} className={!type.isActive ? 'opacity-50' : ''}>
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h4 className="font-semibold">{type.name}</h4>
                                      <p className="text-sm text-muted-foreground">{type.code}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenTypeDialog(type)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      {type.isActive && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteType(type._id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-2xl font-bold text-primary mb-2">
                                    K{type.amount}
                                  </p>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {type.description}
                                  </p>
                                  <div className="flex gap-2">
                                    {type.minAge !== null && (
                                      <Badge variant="outline">{type.minAge}+ years</Badge>
                                    )}
                                    {type.maxAge !== null && (
                                      <Badge variant="outline">Under {type.maxAge + 1}</Badge>
                                    )}
                                    {!type.isActive && (
                                      <Badge variant="secondary">Inactive</Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>

                      {/* Club Affiliations */}
                      <div>
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-purple-500" />
                          Club Affiliations
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {membershipTypes
                            .filter(t => t.category === 'club')
                            .map((type) => (
                              <Card key={type._id} className={!type.isActive ? 'opacity-50' : ''}>
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div>
                                      <h4 className="font-semibold">{type.name}</h4>
                                      <p className="text-sm text-muted-foreground">{type.code}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenTypeDialog(type)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      {type.isActive && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteType(type._id)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-2xl font-bold text-primary mb-2">
                                    K{type.amount}
                                  </p>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {type.description}
                                  </p>
                                  {!type.isActive && (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Membership Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Membership Type' : 'Create Membership Type'}
            </DialogTitle>
            <DialogDescription>
              Configure membership type details and pricing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Junior ZPIN"
                />
              </div>
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  placeholder="zpin_junior"
                  disabled={!!editingType}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={typeForm.category}
                  onValueChange={(v: 'player' | 'club') => setTypeForm({ ...typeForm, category: v })}
                  disabled={!!editingType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player (ZPIN)</SelectItem>
                    <SelectItem value="club">Club Affiliation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (ZMW) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={typeForm.amount}
                  onChange={(e) => setTypeForm({ ...typeForm, amount: e.target.value })}
                  placeholder="250"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Annual registration for..."
              />
            </div>

            {typeForm.category === 'player' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minAge">Minimum Age</Label>
                  <Input
                    id="minAge"
                    type="number"
                    value={typeForm.minAge}
                    onChange={(e) => setTypeForm({ ...typeForm, minAge: e.target.value })}
                    placeholder="18"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAge">Maximum Age</Label>
                  <Input
                    id="maxAge"
                    type="number"
                    value={typeForm.maxAge}
                    onChange={(e) => setTypeForm({ ...typeForm, maxAge: e.target.value })}
                    placeholder="17"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="benefits">Benefits (one per line)</Label>
              <textarea
                id="benefits"
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={typeForm.benefits}
                onChange={(e) => setTypeForm({ ...typeForm, benefits: e.target.value })}
                placeholder="Official ZPIN number&#10;Tournament eligibility&#10;National ranking inclusion"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveType} disabled={savingType}>
              {savingType ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Confirm Payment
            </DialogTitle>
            <DialogDescription>
              Activate the pending subscription for{' '}
              <span className="font-semibold">{confirmingSub?.entityName}</span>
              {' '}({confirmingSub?.membershipTypeName} — K{confirmingSub?.amount})
            </DialogDescription>
          </DialogHeader>

          {confirmSuccess ? (
            <div className="py-6">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="font-semibold text-lg mb-2">Payment Confirmed</p>
                <p className="text-sm text-muted-foreground">{confirmSuccess}</p>
              </div>
              <div className="flex justify-center mt-6">
                <Button onClick={() => {
                  setConfirmDialogOpen(false)
                  setConfirmingSub(null)
                  setConfirmSuccess(null)
                }}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              {confirmError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{confirmError}</p>
                </div>
              )}

              <div className="space-y-4 py-4">
                <div>
                  <Label>Payment Method</Label>
                  <Select value={confirmPaymentMethod} onValueChange={setConfirmPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmPayment} disabled={confirmingPayment}>
                  {confirmingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm &amp; Activate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Receipt Dialog */}
      <Dialog open={sendReceiptOpen} onOpenChange={setSendReceiptOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Receipt
            </DialogTitle>
            <DialogDescription>
              Send receipt <span className="font-mono">{sendReceiptSub?.receiptNumber}</span> for{' '}
              <span className="font-semibold">{sendReceiptSub?.entityName}</span> to an email address.
            </DialogDescription>
          </DialogHeader>

          {sendReceiptResult ? (
            <div className="py-4">
              <p className="text-sm text-center">{sendReceiptResult}</p>
              <div className="flex justify-center mt-4">
                <Button onClick={() => setSendReceiptOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="Enter payer's email"
                    value={sendReceiptEmail}
                    onChange={(e) => setSendReceiptEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReceipt()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendReceiptOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendReceipt} disabled={sendingReceipt || !sendReceiptEmail.trim()}>
                  {sendingReceipt ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Payment Dialog */}
      <Dialog open={manualPaymentOpen} onOpenChange={setManualPaymentOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Record Manual Payment
            </DialogTitle>
            <DialogDescription>
              Record an offline payment (bank transfer, cash, cheque, etc.)
            </DialogDescription>
          </DialogHeader>

          {manualPaymentSuccess ? (
            <div className="py-6">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="font-semibold text-lg mb-2">Payment Recorded</p>
                <p className="text-sm text-muted-foreground">{manualPaymentSuccess}</p>
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" onClick={() => setManualPaymentOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleOpenManualPayment}>
                  Record Another
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Entity Type */}
                <div>
                  <Label>Payment For</Label>
                  <Select
                    value={manualEntityType}
                    onValueChange={(v: 'player' | 'club') => {
                      setManualEntityType(v)
                      setSelectedEntity(null)
                      setEntitySearchQuery('')
                      setEntitySearchResults([])
                      setManualMembershipTypeId('')
                      setManualAmount('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club">Club Affiliation</SelectItem>
                      <SelectItem value="player">Player ZPIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity Search */}
                {!selectedEntity ? (
                  <div>
                    <Label>
                      Search {manualEntityType === 'club' ? 'Club' : 'Player'}
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={manualEntityType === 'club' ? 'Search by club name...' : 'Search by player name...'}
                        value={entitySearchQuery}
                        onChange={(e) => setEntitySearchQuery(e.target.value)}
                        className="pl-9"
                      />
                      {entitySearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {entitySearchResults.length > 0 && (
                      <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {entitySearchResults.map((entity) => {
                          const name = 'firstName' in entity ? `${entity.firstName} ${entity.lastName}` : entity.name
                          return (
                            <div
                              key={entity._id}
                              className="p-3 hover:bg-muted/50 cursor-pointer flex items-center gap-2"
                              onClick={() => handleSelectEntity(entity)}
                            >
                              {manualEntityType === 'club' ? (
                                <Building2 className="h-4 w-4 text-purple-500" />
                              ) : (
                                <User className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="font-medium text-sm">{name}</span>
                              {'zpin' in entity && entity.zpin && (
                                <span className="text-xs text-muted-foreground font-mono ml-auto">{entity.zpin}</span>
                              )}
                              {'city' in entity && entity.city && (
                                <span className="text-xs text-muted-foreground ml-auto">{entity.city}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label>Selected {manualEntityType === 'club' ? 'Club' : 'Player'}</Label>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        {manualEntityType === 'club' ? (
                          <Building2 className="h-4 w-4 text-purple-500" />
                        ) : (
                          <User className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium">{selectedEntity.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEntity(null)
                          setManualMembershipTypeId('')
                          setManualAmount('')
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Year */}
                <div>
                  <Label>Payment Year</Label>
                  <Select value={manualYear} onValueChange={setManualYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: currentYear - EARLIEST_PAYABLE_YEAR + 1 },
                        (_, i) => currentYear - i
                      ).map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Membership Type */}
                <div>
                  <Label>Membership / Affiliation Type</Label>
                  <Select
                    value={manualMembershipTypeId}
                    onValueChange={(v) => {
                      setManualMembershipTypeId(v)
                      const mt = membershipTypes.find(t => t._id === v)
                      if (mt) setManualAmount(mt.amount.toString())
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {membershipTypes
                        .filter(t => t.isActive && t.category === (manualEntityType === 'club' ? 'club' : 'player'))
                        .map(t => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name} — K{t.amount}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div>
                  <Label>Payment Method</Label>
                  <Select value={manualPaymentMethod} onValueChange={setManualPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount override */}
                <div>
                  <Label>Amount (ZMW)</Label>
                  <Input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="Amount paid"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Defaults to the membership type price. Override if a different amount was paid.
                  </p>
                </div>

                {/* Transaction Reference */}
                <div>
                  <Label>Transaction / Receipt Reference (Optional)</Label>
                  <Input
                    value={manualTransactionRef}
                    onChange={(e) => setManualTransactionRef(e.target.value)}
                    placeholder="e.g. bank deposit slip number"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes (Optional)</Label>
                  <textarea
                    className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="e.g. Paid via FNB bank deposit on 15 Jan 2025"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setManualPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleManualPaymentSubmit}
                  disabled={savingManualPayment || !selectedEntity || !manualMembershipTypeId}
                >
                  {savingManualPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
