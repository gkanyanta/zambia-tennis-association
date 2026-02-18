import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  missingPlayersService,
  type DetectionSummary,
  type MissingPlayerCandidate,
  type ImportReport,
} from '@/services/missingPlayersService'
import {
  Download,
  Upload,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react'

export function MissingPlayers() {
  const { isAdmin, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<DetectionSummary | null>(null)
  const [candidates, setCandidates] = useState<MissingPlayerCandidate[]>([])
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [filterSegment, setFilterSegment] = useState<'ALL' | 'SENIOR' | 'JUNIOR'>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  if (!isAdmin) {
    navigate('/')
    return null
  }

  const runDetection = async () => {
    setLoading(true)
    setError(null)
    setImportReport(null)
    try {
      const result = await missingPlayersService.detect()
      setSummary(result.summary)
      setCandidates(result.candidates)
    } catch (err: any) {
      setError(err.message || 'Failed to detect missing players')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await missingPlayersService.downloadExport(format)
    } catch (err: any) {
      setError(err.message || 'Failed to download export')
    }
  }

  const handleImport = async (dryRun: boolean) => {
    if (!importFile) return
    setImporting(true)
    setError(null)
    setImportReport(null)
    try {
      const result = await missingPlayersService.importFile(importFile, dryRun)
      setImportReport(result.report)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const filteredCandidates = candidates.filter(c => {
    if (filterSegment !== 'ALL' && c.segment !== filterSegment) return false
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false
    return true
  })

  const statusBadge = (status: string) => {
    switch (status) {
      case 'MISSING_PLAYER':
        return <Badge variant="destructive">Missing</Badge>
      case 'HAS_PLAYER_NO_ZPIN':
        return <Badge className="bg-yellow-500 text-white">No ZPIN</Badge>
      case 'AMBIGUOUS_MATCH':
        return <Badge className="bg-orange-500 text-white">Ambiguous</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const actionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Badge className="bg-green-600 text-white">Create</Badge>
      case 'UPDATE':
        return <Badge className="bg-blue-600 text-white">Update</Badge>
      case 'SKIP':
        return <Badge variant="outline">Skip</Badge>
      default:
        return <Badge variant="secondary">{action}</Badge>
    }
  }

  return (
    <div>
      <Hero
        title="Missing Ranked Players"
        subtitle="Identify and fix players in the ranking system without ZPIN assignments"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back to Admin */}
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin
        </Button>

        {/* Error Display */}
        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Step 1: Detect Missing Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Scan the ranking database to find players who don't have a corresponding
              user record or are missing a ZPIN assignment.
            </p>
            <Button onClick={runDetection} disabled={loading}>
              {loading ? 'Scanning...' : 'Run Detection'}
            </Button>

            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{summary.total}</div>
                  <div className="text-sm text-muted-foreground">Total Ranked</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{summary.ok}</div>
                  <div className="text-sm text-muted-foreground">Matched OK</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{summary.missing}</div>
                  <div className="text-sm text-muted-foreground">Missing Players</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{summary.ambiguous}</div>
                  <div className="text-sm text-muted-foreground">Ambiguous</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{summary.missingSeniors}</div>
                  <div className="text-sm text-muted-foreground">Missing Seniors</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{summary.missingJuniors}</div>
                  <div className="text-sm text-muted-foreground">Missing Juniors</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{summary.actionable}</div>
                  <div className="text-sm text-muted-foreground">Actionable Total</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{summary.noZpin}</div>
                  <div className="text-sm text-muted-foreground">Has Player No ZPIN</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Export */}
        {summary && summary.actionable > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Step 2: Export for Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Download the spreadsheet, review the proposed actions and ZPINs.
                Edit names, change actions (CREATE/UPDATE/SKIP), and add missing details before importing.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => handleExport('csv')} variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <Button onClick={() => handleExport('xlsx')} variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download XLSX
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Step 3: Import Reviewed File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Upload the reviewed spreadsheet to create/update player records.
              Use "Dry Run" first to validate without making changes.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleImport(true)}
                  variant="outline"
                  disabled={!importFile || importing}
                >
                  {importing ? 'Validating...' : 'Dry Run'}
                </Button>
                <Button
                  onClick={() => handleImport(false)}
                  disabled={!importFile || importing}
                >
                  {importing ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </div>

            {/* Import Report */}
            {importReport && (
              <div className="mt-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  {importReport.failed === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  Import Report {importReport.dryRun && '(Dry Run)'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-muted/50 rounded p-3 text-center">
                    <div className="text-xl font-bold">{importReport.totalRows}</div>
                    <div className="text-xs text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="bg-green-50 rounded p-3 text-center">
                    <div className="text-xl font-bold text-green-700">{importReport.created}</div>
                    <div className="text-xs text-muted-foreground">Created</div>
                  </div>
                  <div className="bg-blue-50 rounded p-3 text-center">
                    <div className="text-xl font-bold text-blue-700">{importReport.updated}</div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-xl font-bold">{importReport.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="bg-red-50 rounded p-3 text-center">
                    <div className="text-xl font-bold text-red-700">{importReport.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {importReport.details.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium mb-2">Details:</h5>
                    <div className="max-h-60 overflow-y-auto bg-muted/30 rounded p-2 text-xs font-mono space-y-1">
                      {importReport.details.map((d, i) => (
                        <div key={i} className={
                          d.action.includes('FAIL') || d.action.includes('ABORT') || d.action.includes('ERROR')
                            ? 'text-red-700'
                            : d.action.includes('CREATED') || d.action.includes('UPDATED')
                            ? 'text-green-700'
                            : 'text-muted-foreground'
                        }>
                          {d.rowNum && `Row ${d.rowNum}: `}
                          [{d.action}] {d.name && `${d.name} `}
                          {d.zpin && `(${d.zpin}) `}
                          {d.reason || d.error || d.message || ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidates Table */}
        {candidates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Detected Candidates ({filteredCandidates.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  value={filterSegment}
                  onChange={e => setFilterSegment(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="ALL">All Segments</option>
                  <option value="SENIOR">Seniors Only</option>
                  <option value="JUNIOR">Juniors Only</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="MISSING_PLAYER">Missing Player</option>
                  <option value="HAS_PLAYER_NO_ZPIN">Has Player No ZPIN</option>
                  <option value="AMBIGUOUS_MATCH">Ambiguous</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Action</th>
                      <th className="px-3 py-2 text-left">Segment</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">ZPIN</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Gender</th>
                      <th className="px-3 py-2 text-left">Club</th>
                      <th className="px-3 py-2 text-left">Categories</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCandidates.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">{actionBadge(c.action)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={c.segment === 'SENIOR' ? 'default' : 'secondary'}>
                            {c.segment}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{statusBadge(c.status)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{c.proposed_zpin}</td>
                        <td className="px-3 py-2 font-medium">{c.full_name}</td>
                        <td className="px-3 py-2">{c.gender}</td>
                        <td className="px-3 py-2">{c.club || '-'}</td>
                        <td className="px-3 py-2 text-xs">{c.categories}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                          {c.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
