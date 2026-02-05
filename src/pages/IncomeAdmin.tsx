import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  CreditCard,
  Heart,
  Trophy,
  Users,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Banknote
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  lencoPaymentService,
  IncomeTransaction,
  IncomeSummary,
} from '@/services/lencoPaymentService'

const TYPE_LABELS: Record<string, string> = {
  donation: 'Donation',
  membership: 'Membership',
  tournament: 'Tournament',
  coach_listing: 'Coach Listing',
}

const TYPE_ICONS: Record<string, typeof DollarSign> = {
  donation: Heart,
  membership: CreditCard,
  tournament: Trophy,
  coach_listing: Users,
}

const STATUS_VARIANT: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
}

export function IncomeAdmin() {
  const navigate = useNavigate()
  const { isAdmin, isAuthenticated } = useAuth()

  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else if (!isAdmin) {
      navigate('/')
    }
  }, [isAuthenticated, isAdmin, navigate])

  const loadSummary = useCallback(async () => {
    try {
      const params: Record<string, string> = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (filterType !== 'all') params.type = filterType
      const data = await lencoPaymentService.getIncomeStatement(params)
      setSummary(data.summary)
    } catch (err: any) {
      console.error('Failed to load income summary:', err)
    }
  }, [startDate, endDate, filterType])

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, string | number> = { page: currentPage, limit: 20 }
      if (filterType !== 'all') params.type = filterType
      if (filterStatus !== 'all') params.status = filterStatus
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const data = await lencoPaymentService.getTransactions(params as any)
      setTransactions(data.transactions)
      setTotalPages(data.pagination.pages)
      setTotalCount(data.pagination.total)
    } catch (err: any) {
      console.error('Failed to load transactions:', err)
      setError(err.message || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterType, filterStatus, startDate, endDate])

  useEffect(() => {
    if (isAdmin) {
      loadSummary()
      loadTransactions()
    }
  }, [isAdmin, loadSummary, loadTransactions])

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const formatCurrency = (amount: number) => {
    return `K${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getTypeTotal = (type: string) => {
    if (!summary) return { totalAmount: 0, count: 0 }
    const entry = summary.byType.find(b => b.type === type)
    return entry || { totalAmount: 0, count: 0 }
  }

  if (!isAdmin) return null

  return (
    <div className="flex flex-col">
      <Hero
        title="Income & Payments"
        description="Financial overview and transaction history"
        gradient
      />

      <section className="py-8">
        <div className="container-custom">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <Button onClick={() => navigate('/admin/membership')}>
              <Banknote className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lime-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-lime-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-xl font-bold">{formatCurrency(summary?.total.totalAmount || 0)}</p>
                    <p className="text-xs text-muted-foreground">{summary?.total.count || 0} transactions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(['membership', 'donation', 'tournament', 'coach_listing'] as const).map(type => {
              const data = getTypeTotal(type)
              const Icon = TYPE_ICONS[type]
              return (
                <Card key={type}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{TYPE_LABELS[type]}</p>
                        <p className="text-xl font-bold">{formatCurrency(data.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">{data.count} payments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={filterType} onValueChange={(v) => { setFilterType(v); handleFilterChange() }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="donation">Donation</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                      <SelectItem value="coach_listing">Coach Listing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); handleFilterChange() }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); handleFilterChange() }}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); handleFilterChange() }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setFilterType('all')
                      setFilterStatus('all')
                      setStartDate('')
                      setEndDate('')
                      setCurrentPage(1)
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { loadSummary(); loadTransactions() }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Transactions
                  {totalCount > 0 && (
                    <Badge variant="secondary">{totalCount}</Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions found</p>
                  <p className="text-sm mt-1">Adjust your filters or check back later</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Payer</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn) => (
                          <TableRow key={txn._id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {formatDate(txn.paymentDate || txn.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {txn.receiptNumber || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {TYPE_LABELS[txn.type] || txn.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {txn.description || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{txn.payerName}</div>
                              {txn.payerEmail && (
                                <div className="text-xs text-muted-foreground">{txn.payerEmail}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {formatCurrency(txn.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={STATUS_VARIANT[txn.status] || ''}>
                                {txn.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {txn.receiptNumber && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Download receipt"
                                  onClick={() => {
                                    const apiUrl = import.meta.env.VITE_API_URL || ''
                                    window.open(`${apiUrl}/api/lenco/receipt/${txn.receiptNumber}`, '_blank')
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages} ({totalCount} total)
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
