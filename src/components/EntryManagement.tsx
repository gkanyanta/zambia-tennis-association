import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Trophy, ArrowUpDown } from 'lucide-react'
import type { TournamentCategory } from '@/types/tournament'

interface EntryManagementProps {
  category: TournamentCategory
  onUpdateEntry: (entryId: string, data: { status: string; seed?: number; rejectionReason?: string }) => Promise<void>
  onAutoSeed: () => Promise<void>
}

export function EntryManagement({ category, onUpdateEntry, onAutoSeed }: EntryManagementProps) {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const [seedingMode, setSeedingMode] = useState(false)
  const [seedValues, setSeedValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const filteredEntries = category.entries.filter(entry => {
    if (filter === 'all') return true
    return entry.status === filter
  })

  const acceptedEntries = category.entries.filter(e => e.status === 'accepted')
  const pendingEntries = category.entries.filter(e => e.status === 'pending')

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

  const handleBulkAccept = async () => {
    setLoading(true)
    try {
      for (const entryId of selectedEntries) {
        await onUpdateEntry(entryId, { status: 'accepted' })
      }
      setSelectedEntries([])
    } catch (error) {
      console.error('Error in bulk accept:', error)
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
      for (const [entryId, seed] of Object.entries(seedValues)) {
        if (seed > 0) {
          await onUpdateEntry(entryId, { status: 'accepted', seed })
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{category.entries.length}</div>
            <p className="text-xs text-muted-foreground">Total Entries</p>
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
            <div className="text-2xl font-bold text-yellow-600">{pendingEntries.length}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
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

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Entry Actions</CardTitle>
            <div className="flex gap-2">
              {pendingEntries.length > 0 && selectedEntries.length > 0 && (
                <Button onClick={handleBulkAccept} disabled={loading}>
                  Accept Selected ({selectedEntries.length})
                </Button>
              )}
              {acceptedEntries.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleAutoSeed}
                    disabled={loading}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Auto-Seed by Rankings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSeedingMode(!seedingMode)}
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
      <div className="flex gap-2">
        {(['all', 'pending', 'accepted', 'rejected'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
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
                  {filter === 'pending' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedEntries.length === pendingEntries.length && pendingEntries.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEntries(pendingEntries.map(e => e.id))
                          } else {
                            setSelectedEntries([])
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">ZPIN</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Age</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Club</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Ranking</th>
                  {(filter === 'accepted' || seedingMode) && (
                    <th className="px-4 py-3 text-center text-sm font-semibold">Seed</th>
                  )}
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Entry Date</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      No entries found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/50">
                      {filter === 'pending' && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(entry.id)}
                            onChange={() => toggleSelection(entry.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-medium">{entry.playerName}</div>
                        <div className="text-xs text-muted-foreground">{entry.gender}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{entry.playerZpin}</td>
                      <td className="px-4 py-3 text-center">{entry.age}</td>
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
                          {seedingMode ? (
                            <Input
                              type="number"
                              min="1"
                              max="32"
                              className="w-16 mx-auto"
                              value={seedValues[entry.id] ?? entry.seed ?? ''}
                              onChange={(e) =>
                                setSeedValues({
                                  ...seedValues,
                                  [entry.id]: parseInt(e.target.value) || 0
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
                        {entry.status === 'accepted' && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Accepted
                          </Badge>
                        )}
                        {entry.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
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
                        <div className="flex gap-2 justify-center">
                          {entry.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAccept(entry.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(entry.id)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
