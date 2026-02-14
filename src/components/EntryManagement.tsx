import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Trophy, ArrowUpDown, CreditCard, Clock, User, AlertCircle } from 'lucide-react'
import type { TournamentCategory } from '@/types/tournament'

interface EntryManagementProps {
  category: TournamentCategory
  tournamentId: string
  onUpdateEntry: (entryId: string, data: { status: string; seed?: number; rejectionReason?: string; paymentStatus?: string; paymentReference?: string }) => Promise<void>
  onAutoSeed: () => Promise<void>
  onBulkAction?: (entryIds: string[], action: 'APPROVE' | 'CONFIRM_PAYMENT' | 'WAIVE_PAYMENT') => Promise<{ succeeded: number; failed: number; results: Array<{ entryId: string; success: boolean; error?: string; playerName?: string }> }>
  onBulkUpdateSeeds?: (seeds: Array<{ entryId: string; seedNumber: number }>) => Promise<void>
}

export function EntryManagement({ category, onUpdateEntry, onAutoSeed, onBulkAction, onBulkUpdateSeeds }: EntryManagementProps) {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'pending_payment' | 'pending' | 'accepted' | 'rejected'>('all')
  const [seedingMode, setSeedingMode] = useState(false)
  const [seedValues, setSeedValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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

  const handleBulkAction = async (action: 'APPROVE' | 'CONFIRM_PAYMENT' | 'WAIVE_PAYMENT') => {
    if (selectedEntries.length === 0) return

    const actionLabels: Record<string, string> = {
      APPROVE: 'approve',
      CONFIRM_PAYMENT: 'confirm payment for',
      WAIVE_PAYMENT: 'waive payment for'
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
          .map(([entryId, seedNumber]) => ({ entryId, seedNumber: seedNumber || 0 }))
        await onBulkUpdateSeeds(seeds)
      } else {
        for (const [entryId, seed] of Object.entries(seedValues)) {
          if (seed > 0) {
            await onUpdateEntry(entryId, { status: 'accepted', seed })
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

  return (
    <div className="space-y-6">
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
                        const existing: Record<string, number> = {}
                        acceptedEntries.forEach(e => {
                          if (e.seed) existing[(e as any)._id] = e.seed
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
                Enter seed numbers for players (leave blank or 0 to remove seed)
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
                                min="0"
                                max="32"
                                className="w-16 mx-auto"
                                value={seedValues[(entry as any)._id] ?? entry.seed ?? ''}
                                onChange={(e) =>
                                  setSeedValues({
                                    ...seedValues,
                                    [(entry as any)._id]: parseInt(e.target.value) || 0
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
