import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown, Calculator } from 'lucide-react'
import {
  tournamentService,
  Tournament,
  TournamentFinanceData,
  BudgetLine,
  ExpenseRecord,
  ManualIncomeRecord,
} from '@/services/tournamentService'

const INCOME_CATEGORIES = [
  { value: 'entry_fees', label: 'Entry Fees' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'food_sales', label: 'Food Sales' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'other_income', label: 'Other Income' },
]

const EXPENSE_CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'balls', label: 'Balls' },
  { value: 'trophies', label: 'Trophies' },
  { value: 'umpires', label: 'Umpires' },
  { value: 'transport', label: 'Transport' },
  { value: 'meals', label: 'Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'printing', label: 'Printing' },
  { value: 'medical', label: 'Medical' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'administration', label: 'Administration' },
  { value: 'other_expense', label: 'Other Expense' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

function formatCurrency(amount: number): string {
  return `K${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function categoryLabel(value: string): string {
  const all = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
  return all.find(c => c.value === value)?.label || value.replace(/_/g, ' ')
}

interface TournamentFinanceProps {
  tournament: Tournament
  onRefresh: () => Promise<void>
}

export function TournamentFinance({ tournament }: TournamentFinanceProps) {
  const [financeData, setFinanceData] = useState<TournamentFinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [budgetDialog, setBudgetDialog] = useState<{ open: boolean; editing?: BudgetLine }>({ open: false })
  const [expenseDialog, setExpenseDialog] = useState<{ open: boolean; editing?: ExpenseRecord }>({ open: false })
  const [incomeDialog, setIncomeDialog] = useState<{ open: boolean; editing?: ManualIncomeRecord }>({ open: false })

  const fetchFinance = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await tournamentService.getFinanceSummary(tournament._id)
      setFinanceData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinance()
  }, [tournament._id])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading finance data...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error}
          <Button variant="outline" className="ml-4" onClick={fetchFinance}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!financeData) return null

  const { summary, entryFeeIncome, budget, expenses, manualIncome } = financeData

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.budgetedIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual: {formatCurrency(summary.actualIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budgeted Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.budgetedExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual: {formatCurrency(summary.actualExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projected Profit</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.projectedProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actual Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.actualProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Fee Income */}
      <Card>
        <CardHeader>
          <CardTitle>Entry Fee Income (Auto-calculated)</CardTitle>
        </CardHeader>
        <CardContent>
          {entryFeeIncome.byCategory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Paid</TableHead>
                  <TableHead className="text-center">Waived</TableHead>
                  <TableHead className="text-center">Unpaid</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entryFeeIncome.byCategory.map((cat) => (
                  <TableRow key={cat.categoryId}>
                    <TableCell className="font-medium">{cat.categoryName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-green-600">{cat.paid.count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{cat.waived.count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{cat.unpaid.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(cat.paid.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">
                    {entryFeeIncome.byCategory.reduce((s, c) => s + c.paid.count, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {entryFeeIncome.byCategory.reduce((s, c) => s + c.waived.count, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {entryFeeIncome.byCategory.reduce((s, c) => s + c.unpaid.count, 0)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(entryFeeIncome.totals.paid)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Budget Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget</CardTitle>
          <Button size="sm" onClick={() => setBudgetDialog({ open: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent>
          {budget.length === 0 ? (
            <p className="text-muted-foreground text-sm">No budget lines yet. Add your first budget line to start planning.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.map((line) => (
                  <TableRow key={line._id}>
                    <TableCell>
                      <Badge variant={line.type === 'income' ? 'default' : 'secondary'}>
                        {line.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryLabel(line.category)}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.budgetedAmount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{line.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setBudgetDialog({ open: true, editing: line })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteBudgetLine(line._id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Income Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Other Income</CardTitle>
          <Button size="sm" onClick={() => setIncomeDialog({ open: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Income
          </Button>
        </CardHeader>
        <CardContent>
          {manualIncome.length === 0 ? (
            <p className="text-muted-foreground text-sm">No other income recorded. Add sponsorships, food sales, etc.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Received From</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Receipt Ref</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualIncome.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                    <TableCell>{categoryLabel(item.category)}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{item.receivedFrom || '-'}</TableCell>
                    <TableCell>{PAYMENT_METHODS.find(m => m.value === item.paymentMethod)?.label || '-'}</TableCell>
                    <TableCell>{item.receiptReference || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setIncomeDialog({ open: true, editing: item })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteIncome(item._id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          <Button size="sm" onClick={() => setExpenseDialog({ open: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expenses recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid To</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Receipt Ref</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp._id}>
                    <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                    <TableCell>{categoryLabel(exp.category)}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                    <TableCell>{exp.paidTo || '-'}</TableCell>
                    <TableCell>{PAYMENT_METHODS.find(m => m.value === exp.paymentMethod)?.label || '-'}</TableCell>
                    <TableCell>{exp.receiptReference || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setExpenseDialog({ open: true, editing: exp })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteExpense(exp._id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Budget vs Actuals Report */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actuals</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetVsActuals budget={budget} expenses={expenses} manualIncome={manualIncome} entryFeePaid={entryFeeIncome.totals.paid} />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BudgetLineDialog
        open={budgetDialog.open}
        editing={budgetDialog.editing}
        onClose={() => setBudgetDialog({ open: false })}
        onSave={handleSaveBudgetLine}
      />
      <ExpenseDialog
        open={expenseDialog.open}
        editing={expenseDialog.editing}
        onClose={() => setExpenseDialog({ open: false })}
        onSave={handleSaveExpense}
      />
      <IncomeDialog
        open={incomeDialog.open}
        editing={incomeDialog.editing}
        onClose={() => setIncomeDialog({ open: false })}
        onSave={handleSaveIncome}
      />
    </div>
  )

  // Handlers
  async function handleSaveBudgetLine(data: any, editId?: string) {
    try {
      if (editId) {
        await tournamentService.updateBudgetLine(tournament._id, editId, data)
      } else {
        await tournamentService.addBudgetLine(tournament._id, data)
      }
      setBudgetDialog({ open: false })
      await fetchFinance()
    } catch (err: any) {
      alert(err.message || 'Failed to save budget line')
    }
  }

  async function handleDeleteBudgetLine(id: string) {
    if (!confirm('Delete this budget line?')) return
    try {
      await tournamentService.deleteBudgetLine(tournament._id, id)
      await fetchFinance()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  async function handleSaveExpense(data: any, editId?: string) {
    try {
      if (editId) {
        await tournamentService.updateExpense(tournament._id, editId, data)
      } else {
        await tournamentService.addExpense(tournament._id, data)
      }
      setExpenseDialog({ open: false })
      await fetchFinance()
    } catch (err: any) {
      alert(err.message || 'Failed to save expense')
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    try {
      await tournamentService.deleteExpense(tournament._id, id)
      await fetchFinance()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }

  async function handleSaveIncome(data: any, editId?: string) {
    try {
      if (editId) {
        await tournamentService.updateManualIncome(tournament._id, editId, data)
      } else {
        await tournamentService.addManualIncome(tournament._id, data)
      }
      setIncomeDialog({ open: false })
      await fetchFinance()
    } catch (err: any) {
      alert(err.message || 'Failed to save income record')
    }
  }

  async function handleDeleteIncome(id: string) {
    if (!confirm('Delete this income record?')) return
    try {
      await tournamentService.deleteManualIncome(tournament._id, id)
      await fetchFinance()
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    }
  }
}

// Budget Line Dialog
function BudgetLineDialog({ open, editing, onClose, onSave }: {
  open: boolean
  editing?: BudgetLine
  onClose: () => void
  onSave: (data: any, editId?: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    description: '',
    budgetedAmount: '',
    notes: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type,
        category: editing.category,
        description: editing.description,
        budgetedAmount: String(editing.budgetedAmount),
        notes: editing.notes || '',
      })
    } else {
      setForm({ type: 'expense', category: '', description: '', budgetedAmount: '', notes: '' })
    }
  }, [editing, open])

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.budgetedAmount) return
    setSaving(true)
    await onSave({
      type: form.type,
      category: form.category,
      description: form.description,
      budgetedAmount: Number(form.budgetedAmount),
      notes: form.notes || undefined,
    }, editing?._id)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Budget Line' : 'Add Budget Line'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium block mb-1">Type</label>
            <select className="w-full p-2 border rounded-md" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any, category: '' })}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Category</label>
            <select className="w-full p-2 border rounded-md" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category...</option>
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <input className="w-full p-2 border rounded-md" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Budgeted Amount (K)</label>
            <input type="number" min="0" step="0.01" className="w-full p-2 border rounded-md" value={form.budgetedAmount} onChange={e => setForm({ ...form, budgetedAmount: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <input className="w-full p-2 border rounded-md" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.category || !form.description || !form.budgetedAmount}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Expense Dialog
function ExpenseDialog({ open, editing, onClose, onSave }: {
  open: boolean
  editing?: ExpenseRecord
  onClose: () => void
  onSave: (data: any, editId?: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paidTo: '',
    paymentMethod: '',
    receiptReference: '',
    notes: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        category: editing.category,
        description: editing.description,
        amount: String(editing.amount),
        date: editing.date ? new Date(editing.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paidTo: editing.paidTo || '',
        paymentMethod: editing.paymentMethod || '',
        receiptReference: editing.receiptReference || '',
        notes: editing.notes || '',
      })
    } else {
      setForm({ category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], paidTo: '', paymentMethod: '', receiptReference: '', notes: '' })
    }
  }, [editing, open])

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.amount) return
    setSaving(true)
    await onSave({
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      paidTo: form.paidTo || undefined,
      paymentMethod: form.paymentMethod || undefined,
      receiptReference: form.receiptReference || undefined,
      notes: form.notes || undefined,
    }, editing?._id)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select className="w-full p-2 border rounded-md" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select...</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" className="w-full p-2 border rounded-md" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <input className="w-full p-2 border rounded-md" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Amount (K)</label>
              <input type="number" min="0" step="0.01" className="w-full p-2 border rounded-md" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Payment Method</label>
              <select className="w-full p-2 border rounded-md" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="">Select...</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Paid To</label>
              <input className="w-full p-2 border rounded-md" value={form.paidTo} onChange={e => setForm({ ...form, paidTo: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Receipt Reference</label>
              <input className="w-full p-2 border rounded-md" value={form.receiptReference} onChange={e => setForm({ ...form, receiptReference: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <input className="w-full p-2 border rounded-md" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.category || !form.description || !form.amount}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Income Dialog
function IncomeDialog({ open, editing, onClose, onSave }: {
  open: boolean
  editing?: ManualIncomeRecord
  onClose: () => void
  onSave: (data: any, editId?: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    receivedFrom: '',
    paymentMethod: '',
    receiptReference: '',
    notes: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        category: editing.category,
        description: editing.description,
        amount: String(editing.amount),
        date: editing.date ? new Date(editing.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        receivedFrom: editing.receivedFrom || '',
        paymentMethod: editing.paymentMethod || '',
        receiptReference: editing.receiptReference || '',
        notes: editing.notes || '',
      })
    } else {
      setForm({ category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], receivedFrom: '', paymentMethod: '', receiptReference: '', notes: '' })
    }
  }, [editing, open])

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.amount) return
    setSaving(true)
    await onSave({
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      receivedFrom: form.receivedFrom || undefined,
      paymentMethod: form.paymentMethod || undefined,
      receiptReference: form.receiptReference || undefined,
      notes: form.notes || undefined,
    }, editing?._id)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Income' : 'Add Income'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <select className="w-full p-2 border rounded-md" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select...</option>
                {INCOME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" className="w-full p-2 border rounded-md" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <input className="w-full p-2 border rounded-md" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Amount (K)</label>
              <input type="number" min="0" step="0.01" className="w-full p-2 border rounded-md" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Payment Method</label>
              <select className="w-full p-2 border rounded-md" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="">Select...</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Received From</label>
              <input className="w-full p-2 border rounded-md" value={form.receivedFrom} onChange={e => setForm({ ...form, receivedFrom: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Receipt Reference</label>
              <input className="w-full p-2 border rounded-md" value={form.receiptReference} onChange={e => setForm({ ...form, receiptReference: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <input className="w-full p-2 border rounded-md" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.category || !form.description || !form.amount}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Budget vs Actuals breakdown
function BudgetVsActuals({ budget, expenses, manualIncome, entryFeePaid }: {
  budget: BudgetLine[]
  expenses: ExpenseRecord[]
  manualIncome: ManualIncomeRecord[]
  entryFeePaid: number
}) {
  // Group budgeted amounts by category
  const rows: Array<{ category: string; type: 'income' | 'expense'; budgeted: number; actual: number }> = []

  // Collect all unique categories from budget
  const seen = new Set<string>()

  for (const line of budget) {
    if (!seen.has(line.category)) {
      seen.add(line.category)
      const budgeted = budget.filter(b => b.category === line.category).reduce((s, b) => s + b.budgetedAmount, 0)

      let actual = 0
      if (line.type === 'expense') {
        actual = expenses.filter(e => e.category === line.category).reduce((s, e) => s + e.amount, 0)
      } else {
        if (line.category === 'entry_fees') {
          actual = entryFeePaid
        } else {
          actual = manualIncome.filter(i => i.category === line.category).reduce((s, i) => s + i.amount, 0)
        }
      }

      rows.push({ category: line.category, type: line.type, budgeted, actual })
    }
  }

  // Add expense categories that have actuals but no budget
  for (const exp of expenses) {
    if (!seen.has(exp.category)) {
      seen.add(exp.category)
      const actual = expenses.filter(e => e.category === exp.category).reduce((s, e) => s + e.amount, 0)
      rows.push({ category: exp.category, type: 'expense', budgeted: 0, actual })
    }
  }

  // Add income categories that have actuals but no budget
  for (const inc of manualIncome) {
    if (!seen.has(inc.category)) {
      seen.add(inc.category)
      const actual = manualIncome.filter(i => i.category === inc.category).reduce((s, i) => s + i.amount, 0)
      rows.push({ category: inc.category, type: 'income', budgeted: 0, actual })
    }
  }

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">Add budget lines or record transactions to see the comparison.</p>
  }

  // Sort: income first, then expense
  rows.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'income' ? -1 : 1
    return a.category.localeCompare(b.category)
  })

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Budgeted</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Variance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const variance = row.type === 'income'
            ? row.actual - row.budgeted  // positive = good for income
            : row.budgeted - row.actual   // positive = good for expense (under budget)
          return (
            <TableRow key={row.category}>
              <TableCell>
                <Badge variant={row.type === 'income' ? 'default' : 'secondary'}>{row.type}</Badge>
              </TableCell>
              <TableCell>{categoryLabel(row.category)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.budgeted)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.actual)}</TableCell>
              <TableCell className={`text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
