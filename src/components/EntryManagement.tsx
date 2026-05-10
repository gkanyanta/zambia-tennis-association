import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Trophy, ArrowUpDown, CreditCard, Clock, User, AlertCircle, Link2, UserPlus } from 'lucide-react'
import type { TournamentCategory } from '@/types/tournament'

interface EntryManagementProps {
  category: TournamentCategory
  tournamentId: string
  onUpdateEntry: (entryId: string, data: { status: string; seed?: number; rejectionReason?: string; paymentStatus?: string; paymentReference?: string; waiveSurcharge?: boolean }) => Promise<void>
  onAutoSeed: () => Promise<void>
  onBulkAction?: (entryIds: string[], action: 'APPROVE' | 'CONFIRM_PAYMENT' | 'WAIVE_PAYMENT' | 'WAIVE_SURCHARGE' | 'WAIVE_PARTNER_SURCHARGE') => Promise<{ succeeded: number; failed: number; results: Array<{ entryId: string; success: boolean; error?: string; playerName?: string }> }>
  onBulkUpdateSeeds?: (seeds: Array<{ entryId: string; seedNumber: number }>) => Promise<void>
  onLinkPlayer?: (entryId: string, zpin: string) => Promise<void>
  onCreateAccount?: (entryId: string, data: Record<string, any>) => Promise<{ zpin: string }>
}

export function EntryManagement({ category, onUpdateEntry, onAutoSeed, onBulkAction, onBulkUpdateSeeds, onLinkPlayer, onCreateAccount }: EntryManagementProps) {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'pending_payment' | 'pending' | 'accepted' | 'rejected'>('all')
  const [seedingMode, setSeedingMode] = useState(false)
  const [seedValues, setSeedValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Link player modal
  const [linkModal, setLinkModal] = useState<{ entryId: string; playerName: string } | null>(null)
  const [linkZpin, setLinkZpin] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')

  // Create account modal
  const [createModal, setCreateModal] = useState<{ entryId: string; entry: any } | null>(null)
  const [createForm, setCreateForm] = useState<Record<string, any>>({})
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createdZpin, setCreatedZpin] = useState('')

  const filteredEntries = category.entries.filter(entry => {
    if (filter === 'all') return true
    return entry.status === filter
  })

  const acceptedEntries = category.entries.filter(e => e.status === 'accepted')
  const pendingEntries = category.entries.filter(e => e.status === 'pending')
  const pendingPaymentEntries = category.entries.filter(e => e.status === 'pending_payment')

  // Entries that can be selected for bulk actions based on current filter
  const selectableEntries = filteredEntries.filter(e =>
    e.status === 'pending' || e.status === 'pending_payment'
  )

  const handleAccept = async (entryId: string) => {
    try {
      await onUpdateEntry(entryId, { status: 'accepted' })
    } catch (error) {
      console.error('Error accepting entry:', error)
    }
  }

  const handleReject = async (entryId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      await onUpdateEntry(entryId, { status: 'rejected', rejectionReason: reason })
    } catch (error) {
      console.error('Error rejecting entry:', error)
    }
  }

  const handleConfirmPayment = async (entryId: string) => {
    const reference = prompt('Enter payment reference (optional):')

    try {
      await onUpdateEntry(entryId, {
        status: 'pending',
        paymentStatus: 'paid',
        paymentReference: reference || undefined
      })
    } catch (error) {
      console.error('Error confirming payment:', error)
    }
  }

  const handleWaivePayment = async (entryId: string) => {
    if (!confirm('Are you sure you want to waive the entry fee for this player?')) return

    try {
      await onUpdateEntry(entryId, {
        status: 'pending',
        paymentStatus: 'waived'
      })
    } catch (error) {
      console.error('Error waiving payment:', error)
    }
  }

  const handleWaiveSurcharge = async (entryId: string) => {
    if (!confirm('Are you sure you want to waive the surcharge for this player? They will still need to pay the base entry fee.')) return

    try {
      await onUpdateEntry(entryId, {
        status: 'pending_payment',
        waiveSurcharge: true
      })
    } catch (error) {
      console.error('Error waiving surcharge:', error)
    }
  }

  const handleBulkAction = async (action: 'APPROVE' | 'CONFIRM_PAYMENT' | 'WAIVE_PAYMENT' | 'WAIVE_SURCHARGE') => {
    if (selectedEntries.length === 0) return

    const actionLabels: Record<string, string> = {
      APPROVE: 'approve',
      CONFIRM_PAYMENT: 'confirm payment for',
      WAIVE_PAYMENT: 'waive payment for',
      WAIVE_SURCHARGE: 'waive surcharge for'
    }

    if (!confirm(`Are you sure you want to ${actionLabels[action]} ${selectedEntries.length} entries?`)) return

    setLoading(true)
    setBulkResult(null)

    try {
      if (onBulkAction) {
        const result = await onBulkAction(selectedEntries, action)
        const failures = result.results.filter(r => !r.success)

        if (failures.length === 0) {
          setBulkResult({
            message: `${result.succeeded} entries updated successfully`,
            type: 'success'
          })
        } else {
          const failureDetails = failures.map(f => f.error || 'Unknown error').join('; ')
          setBulkResult({
            message: `${result.succeeded} succeeded, ${result.failed} failed: ${failureDetails}`,
            type: result.succeeded > 0 ? 'success' : 'error'
          })
        }
      } else {
        // Fallback: sequential individual calls
        for (const entryId of selectedEntries) {
          if (action === 'APPROVE') {
            await onUpdateEntry(entryId, { status: 'accepted' })
          } else if (action === 'CONFIRM_PAYMENT') {
            await onUpdateEntry(entryId, { status: 'pending', paymentStatus: 'paid' })
          } else if (action === 'WAIVE_PAYMENT') {
            await onUpdateEntry(entryId, { status: 'pending', paymentStatus: 'waived' })
          } else if (action === 'WAIVE_SURCHARGE') {
            await onUpdateEntry(entryId, { status: 'pending_payment', waiveSurcharge: true })
          }
        }
        setBulkResult({
          message: `${selectedEntries.length} entries updated successfully`,
          type: 'success'
        })
      }
      setSelectedEntries([])
    } catch (error: any) {
      setBulkResult({
        message: error.message || 'Bulk action failed',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAutoSeed = async () => {
    setLoading(true)
    try {
      await onAutoSeed()
    } catch (error) {
      console.error('Error auto-seeding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSeedsAll = async () => {
    setLoading(true)
    try {
      if (onBulkUpdateSeeds) {
        const seeds = Object.entries(seedValues)
          .filter(([, val]) => val !== '' && val !== undefined)
          .map(([entryId, val]) => {
            const num = parseInt(val, 10)
            return { entryId, seedNumber: isNaN(num) ? null : num }
          })
          .filter((s): s is { entryId: string; seedNumber: number } => s.seedNumber !== null && s.seedNumber >= 1)
        // Also send entries that were cleared (had a seed before, now blank) so server can unset them
        const clearedSeeds = Object.entries(seedValues)
          .filter(([, val]) => val === '')
          .map(([entryId]) => ({ entryId, seedNumber: 0 }))
        await onBulkUpdateSeeds([...seeds, ...clearedSeeds])
      } else {
        for (const [entryId, val] of Object.entries(seedValues)) {
          const num = parseInt(val, 10)
          if (!isNaN(num) && num >= 1) {
            await onUpdateEntry(entryId, { status: 'accepted', seed: num })
          }
        }
      }
      setSeedingMode(false)
      setSeedValues({})
    } catch (error) {
      console.error('Error saving seeds:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (entryId: string) => {
    setSelectedEntries(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    )
  }

  const handleSelectAll = () => {
    const ids = selectableEntries.map(e => (e as any)._id)
    if (selectedEntries.length === ids.length) {
      setSelectedEntries([])
    } else {
      setSelectedEntries(ids)
    }
  }

  // Determine which bulk actions are available based on selected entries
  const selectedStatuses = new Set(
    selectedEntries.map(id => {
      const entry = category.entries.find(e => (e as any)._id === id)
      return entry?.status
    })
  )
  const canApprove = selectedStatuses.has('pending') && selectedStatuses.size === 1
  const canConfirmPayment = selectedStatuses.has('pending_payment') && selectedStatuses.size === 1
  const canWaivePayment = selectedStatuses.has('pending_payment') && selectedStatuses.size === 1
  const canWaiveSurcharge = selectedEntries.length > 0 && selectedEntries.every(id => {
    const entry = category.entries.find(e => (e as any)._id === id)
    return entry?.status === 'pending_payment' && (entry as any).zpinPaidUp === false && (entry as any).surchargeWaived !== true
  })

  const openCreateModal = (entry: any) => {
    const nameParts = (entry.playerName || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const contact = entry.newPlayerContact || {}
    const isJunior = (entry.ageOnDec31 ?? entry.age ?? 99) < 18
    setCreateForm({
      firstName,
      lastName,
      dateOfBirth: entry.dateOfBirth ? entry.dateOfBirth.slice(0, 10) : '',
      gender: entry.gender || '',
      email: contact.email || '',
      phone: contact.phone || '',
      club: entry.clubName || '',
      membershipType: isJunior ? 'junior' : 'adult',
      parentGuardianName: '',
      parentGuardianPhone: '',
    })
    setCreateModal({ entryId: (entry as any)._id, entry })
    setCreatedZpin('')
    setCreateError('')
  }

  const handleLinkPlayer = async () => {
    if (!linkModal || !linkZpin.trim() || !onLinkPlayer) return
    setLinkLoading(true)
    setLinkError('')
    try {
      await onLinkPlayer(linkModal.entryId, linkZpin.trim())
      setLinkModal(null)
      setLinkZpin('')
    } catch (err: any) {
      setLinkError(err.message || 'Player not found. Check the ZPIN and try again.')
    } finally {
      setLinkLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!createModal || !onCreateAccount) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const result = await onCreateAccount(createModal.entryId, createForm)
      setCreatedZpin(result.zpin)
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Link Player Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-lg mb-1">Link to Existing Account</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the ZPIN of the registered account for <span className="font-medium text-foreground">{linkModal.playerName}</span>.
            </p>
            <Input
              placeholder="e.g. ZTAS0021"
              value={linkZpin}
              onChange={e => { setLinkZpin(e.target.value.toUpperCase()); setLinkError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLinkPlayer()}
              autoFocus
              className="mb-2"
            />
            {linkError && <p className="text-sm text-destructive mb-2">{linkError}</p>}
            <div className="flex gap-2 mt-4">
              <Button className="flex-1" onClick={handleLinkPlayer} disabled={linkLoading || !linkZpin.trim()}>
                {linkLoading ? 'Linking...' : 'Link'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setLinkModal(null); setLinkZpin(''); setLinkError('') }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {createdZpin ? (
              <>
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Account Created</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The player account has been created and linked to this entry.
                  </p>
                  <div className="bg-muted rounded-lg p-4 mb-4">
                    <div className="text-xs text-muted-foreground mb-1">ZPIN assigned</div>
                    <div className="text-2xl font-mono font-bold">{createdZpin}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this ZPIN with the player so they can log in.</p>
                </div>
                <Button className="w-full" onClick={() => setCreateModal(null)}>Done</Button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-1">Create Player Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Creating account for <span className="font-medium text-foreground">{createModal.entry.playerName}</span>. A ZPIN will be auto-generated.
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">First Name <span className="text-red-500">*</span></label>
                      <Input value={createForm.firstName} onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Last Name <span className="text-red-500">*</span></label>
                      <Input value={createForm.lastName} onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Date of Birth <span className="text-red-500">*</span></label>
                      <Input type="date" value={createForm.dateOfBirth} onChange={e => setCreateForm({ ...createForm, dateOfBirth: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Gender <span className="text-red-500">*</span></label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={createForm.gender} onChange={e => setCreateForm({ ...createForm, gender: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Email</label>
                      <Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="optional" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Phone</label>
                      <Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="optional" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Club</label>
                      <Input value={createForm.club} onChange={e => setCreateForm({ ...createForm, club: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Membership Type <span className="text-red-500">*</span></label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={createForm.membershipType} onChange={e => setCreateForm({ ...createForm, membershipType: e.target.value })}>
                        <option value="junior">Junior (ZTAJ####)</option>
                        <option value="adult">Adult (ZTAS####)</option>
                      </select>
                    </div>
                  </div>
                  {createForm.membershipType === 'junior' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md space-y-3">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">Parent / Guardian (required for juniors)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium">Guardian Name <span className="text-red-500">*</span></label>
                          <Input value={createForm.parentGuardianName} onChange={e => setCreateForm({ ...createForm, parentGuardianName: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Guardian Phone <span className="text-red-500">*</span></label>
                          <Input value={createForm.parentGuardianPhone} onChange={e => setCreateForm({ ...createForm, parentGuardianPhone: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {createError && <p className="text-sm text-destructive mt-3">{createError}</p>}
                <div className="flex gap-2 mt-5">
                  <Button className="flex-1" onClick={handleCreateAccount} disabled={createLoading || !createForm.firstName || !createForm.lastName || !createForm.dateOfBirth || !createForm.gender}>
                    {createLoading ? 'Creating...' : 'Create Account & Link'}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setCreateModal(null); setCreateError('') }}>Cancel</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{category.entries.length}</div>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{pendingPaymentEntries.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting Payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingEntries.length}</div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{acceptedEntries.length}</div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {category.entries.filter(e => e.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Result Toast */}
      {bulkResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          bulkResult.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {bulkResult.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span className="text-sm">{bulkResult.message}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setBulkResult(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <CardTitle>Entry Actions</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {selectedEntries.length > 0 && (
                <>
                  {canApprove && (
                    <Button
                      onClick={() => handleBulkAction('APPROVE')}
                      disabled={loading}
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve ({selectedEntries.length})
                    </Button>
                  )}
                  {canConfirmPayment && (
                    <Button
                      onClick={() => handleBulkAction('CONFIRM_PAYMENT')}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Confirm Payment ({selectedEntries.length})
                    </Button>
                  )}
                  {canWaivePayment && (
                    <Button
                      onClick={() => handleBulkAction('WAIVE_PAYMENT')}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                    >
                      Waive Payment ({selectedEntries.length})
                    </Button>
                  )}
                  {canWaiveSurcharge && (
                    <Button
                      onClick={() => handleBulkAction('WAIVE_SURCHARGE')}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="text-amber-600 border-amber-600"
                    >
                      Waive Surcharge ({selectedEntries.length})
                    </Button>
                  )}
                </>
              )}
              {acceptedEntries.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleAutoSeed}
                    disabled={loading}
                    size="sm"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Auto-Seed by Rankings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (seedingMode) {
                        setSeedingMode(false)
                        setSeedValues({})
                      } else {
                        // Pre-populate with existing seeds
                        const existing: Record<string, string> = {}
                        acceptedEntries.forEach(e => {
                          if (e.seed) existing[(e as any)._id] = String(e.seed)
                        })
                        setSeedValues(existing)
                        setSeedingMode(true)
                      }
                    }}
                    size="sm"
                  >
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    {seedingMode ? 'Cancel Seeding' : 'Manual Seeding'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {seedingMode && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Enter seed numbers for players (leave blank to remove seed)
              </p>
              <Button onClick={handleSaveSeedsAll} disabled={loading}>
                Save All Seeds
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all', label: 'All' },
          { key: 'pending_payment', label: 'Awaiting Payment' },
          { key: 'pending', label: 'Pending Approval' },
          { key: 'accepted', label: 'Accepted' },
          { key: 'rejected', label: 'Rejected' }
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilter(key)
              setSelectedEntries([])
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Entries Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    {selectableEntries.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedEntries.length === selectableEntries.length && selectableEntries.length > 0}
                        onChange={handleSelectAll}
                      />
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">ZPIN</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Tennis Age</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Club</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Ranking</th>
                  {(filter === 'accepted' || seedingMode) && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">Seed</th>
                  )}
                  <th className="px-4 py-3 text-center text-sm font-semibold">Payment</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Entry Date</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      No entries found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const isSelectable = entry.status === 'pending' || entry.status === 'pending_payment'
                    return (
                      <tr key={(entry as any)._id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {isSelectable && (
                            <input
                              type="checkbox"
                              checked={selectedEntries.includes((entry as any)._id)}
                              onChange={() => toggleSelection((entry as any)._id)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{entry.playerName}</div>
                          {(entry as any).partnerName && (
                            <div className="text-sm text-purple-600 font-medium">& {(entry as any).partnerName}</div>
                          )}
                          <div className="text-xs text-muted-foreground">{entry.gender}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">{entry.playerZpin}</td>
                        <td className="px-4 py-3 text-center">
                          {(entry as any).ageOnDec31 ?? entry.age}
                        </td>
                        <td className="px-4 py-3 text-sm">{entry.clubName}</td>
                        <td className="px-4 py-3 text-center">
                          {entry.ranking ? (
                            <Badge variant="outline">#{entry.ranking}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </td>
                        {(filter === 'accepted' || seedingMode) && (
                          <td className="px-4 py-3 text-center">
                            {seedingMode && entry.status === 'accepted' ? (
                              <Input
                                type="number"
                                min="1"
                                max="32"
                                className="w-16 mx-auto"
                                placeholder="-"
                                value={seedValues[(entry as any)._id] ?? (entry.seed ? String(entry.seed) : '')}
                                onChange={(e) =>
                                  setSeedValues({
                                    ...seedValues,
                                    [(entry as any)._id]: e.target.value
                                  })
                                }
                              />
                            ) : entry.seed ? (
                              <Badge variant="default">Seed {entry.seed}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          {(entry as any).paymentStatus === 'paid' && (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <CreditCard className="h-3 w-3" /> Paid
                            </Badge>
                          )}
                          {(entry as any).paymentStatus === 'waived' && (
                            <Badge variant="secondary" className="gap-1">
                              Waived
                            </Badge>
                          )}
                          {((entry as any).paymentStatus === 'unpaid' || !(entry as any).paymentStatus) && (
                            <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
                              <Clock className="h-3 w-3" /> Unpaid
                            </Badge>
                          )}
                          {(entry as any).surchargeWaived && (entry as any).paymentStatus !== 'waived' && (
                            <div className="text-xs text-amber-600 mt-1">
                              Surcharge waived
                            </div>
                          )}
                          {(entry as any).payer && (
                            <div className="text-xs text-muted-foreground mt-1" title={`Payer: ${(entry as any).payer.name} (${(entry as any).payer.email})`}>
                              <User className="h-3 w-3 inline mr-1" />
                              {(entry as any).payer.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.status === 'accepted' && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" /> Accepted
                            </Badge>
                          )}
                          {entry.status === 'pending' && (
                            <Badge variant="secondary">Pending Approval</Badge>
                          )}
                          {entry.status === 'pending_payment' && (
                            <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
                              <Clock className="h-3 w-3" /> Awaiting Payment
                            </Badge>
                          )}
                          {entry.status === 'rejected' && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Rejected
                            </Badge>
                          )}
                          {entry.status === 'withdrawn' && (
                            <Badge variant="outline">Withdrawn</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                          {new Date(entry.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center flex-wrap">
                            {/* Link / Create Account buttons for unregistered entries */}
                            {(entry as any).playerZpin === 'PENDING' && (
                              <>
                                {onCreateAccount && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 border-blue-400 hover:bg-blue-50"
                                    title="Create ZTA account for this player"
                                    onClick={() => openCreateModal(entry)}
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                )}
                                {onLinkPlayer && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 border-amber-400 hover:bg-amber-50"
                                    title="Link to existing ZPIN account"
                                    onClick={() => { setLinkModal({ entryId: (entry as any)._id, playerName: entry.playerName }); setLinkZpin(''); setLinkError('') }}
                                  >
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                            {entry.status === 'pending_payment' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={() => handleConfirmPayment((entry as any)._id)}
                                  title="Confirm Payment"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleWaivePayment((entry as any)._id)}
                                  title="Waive Payment"
                                >
                                  Waive
                                </Button>
                                {(entry as any).zpinPaidUp === false && (entry as any).surchargeWaived !== true && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 border-amber-600 hover:bg-amber-50"
                                    onClick={() => handleWaiveSurcharge((entry as any)._id)}
                                    title="Waive Surcharge Only"
                                  >
                                    Waive Surcharge
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject((entry as any)._id)}
                                  title="Reject Entry"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {entry.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAccept((entry as any)._id)}
                                  title="Accept Entry"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject((entry as any)._id)}
                                  title="Reject Entry"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {entry.status === 'rejected' && entry.rejectionReason && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => alert(`Rejection reason: ${entry.rejectionReason}`)}
                              >
                                View Reason
                              </Button>
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
    </div>
  )
}
