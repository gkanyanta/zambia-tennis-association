import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Papa, { ParseResult } from 'papaparse';
import { Hero } from '@/components/Hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { rankingService, rankingCategories } from '@/services/rankingService';

interface CSVRow {
  [key: string]: string;
}

interface ParsedRanking {
  rank: number;
  playerName: string;
  playerZpin?: string;
  club?: string;
  totalPoints: number;
  tournamentResults?: any[];
}

export function RankingsImport() {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('men_senior');
  const [rankingPeriod, setRankingPeriod] = useState('2025');
  const [parsedData, setParsedData] = useState<ParsedRanking[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // Redirect if not admin
  if (!isAdmin) {
    alert('You must be an admin to access this page');
    navigate('/');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedData([]);
      setImportResults(null);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<CSVRow>) => {
        try {
          const data = results.data as CSVRow[];
          const rankings: ParsedRanking[] = [];

          data.forEach((row, index) => {
            // Try to map common CSV column names to our schema
            const rank = parseInt(row['Rank'] || row['rank'] || row['Position'] || row['position'] || String(index + 1));
            const playerName = row['Player Name'] || row['playerName'] || row['Name'] || row['name'] || row['Player'] || row['player'] || '';
            const club = row['Club'] || row['club'] || row['Team'] || row['team'] || '';
            const totalPoints = parseInt(row['Total Points'] || row['totalPoints'] || row['Points'] || row['points'] || '0');
            const playerZpin = row['ZPIN'] || row['zpin'] || row['PlayerZpin'] || row['playerZpin'] || '';

            if (playerName && !isNaN(rank) && !isNaN(totalPoints)) {
              rankings.push({
                rank,
                playerName: playerName.trim(),
                club: club.trim(),
                totalPoints,
                playerZpin: playerZpin.trim() || undefined,
                tournamentResults: []
              });
            }
          });

          if (rankings.length === 0) {
            setError('No valid rankings found in CSV. Please check your file format.');
          } else {
            setParsedData(rankings);
            setError(null);
          }
        } catch (err: any) {
          setError(`Failed to parse CSV: ${err.message}`);
        }
      },
      error: (err: Error) => {
        setError(`CSV parsing error: ${err.message}`);
      }
    });
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      setError('No data to import');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      const result = await rankingService.importRankings(
        category,
        rankingPeriod,
        parsedData
      );

      setImportResults(result);

      // Clear form after successful import
      setTimeout(() => {
        setFile(null);
        setParsedData([]);
        setImportResults(null);
      }, 5000);
    } catch (err: any) {
      console.error('Import error:', err);
      const errorMessage = err.message || 'Failed to import rankings';

      if (errorMessage.includes('Not authorized') || errorMessage.includes('User not found')) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `Rank,Player Name,Club,Total Points,ZPIN
1,John Doe,Example Club,100,ZTA001
2,Jane Smith,Another Club,95,ZTA002
3,Bob Johnson,Sample Club,90,ZTA003`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rankings_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col">
      <Hero
        title="Import Rankings"
        description="Bulk import player rankings from CSV files"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-6xl">
          {/* Instructions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>How to Import Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <p>Follow these steps to import rankings from a CSV file:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Download the CSV template or prepare your own CSV file</li>
                  <li>Ensure your CSV has the following columns: <strong>Rank, Player Name, Club, Total Points</strong></li>
                  <li>Optional columns: <strong>ZPIN</strong> (player identification number)</li>
                  <li>Select the ranking category and period</li>
                  <li>Upload your CSV file</li>
                  <li>Review the preview and click "Import Rankings"</li>
                </ol>
                <div className="flex gap-4 mt-4">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Rankings CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Category Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    >
                      {rankingCategories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="period">Ranking Period</Label>
                    <Input
                      id="period"
                      type="text"
                      value={rankingPeriod}
                      onChange={(e) => setRankingPeriod(e.target.value)}
                      placeholder="e.g., 2025 or 2024-2025"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <Label htmlFor="file">CSV File</Label>
                  <div className="mt-1">
                    <Input
                      id="file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                  </div>
                  {file && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                      <span className="text-xs">({parsedData.length} records found)</span>
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="ml-2">{error}</span>
                  </Alert>
                )}

                {/* Success Display */}
                {importResults && (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="ml-2">
                      <p className="font-semibold">Import Successful!</p>
                      <p className="text-sm mt-1">{importResults.message}</p>
                    </div>
                  </Alert>
                )}

                {/* Preview Table */}
                {parsedData.length > 0 && !importResults && (
                  <div>
                    <h3 className="font-semibold mb-3">Preview ({parsedData.length} records)</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left">Rank</th>
                              <th className="px-4 py-2 text-left">Player Name</th>
                              <th className="px-4 py-2 text-left">Club</th>
                              <th className="px-4 py-2 text-right">Points</th>
                              <th className="px-4 py-2 text-left">ZPIN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {parsedData.slice(0, 100).map((ranking, index) => (
                              <tr key={index} className="hover:bg-muted/30">
                                <td className="px-4 py-2">{ranking.rank}</td>
                                <td className="px-4 py-2 font-medium">{ranking.playerName}</td>
                                <td className="px-4 py-2">{ranking.club || '-'}</td>
                                <td className="px-4 py-2 text-right">{ranking.totalPoints}</td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                  {ranking.playerZpin || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedData.length > 100 && (
                        <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground">
                          Showing first 100 of {parsedData.length} records
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Button */}
                {parsedData.length > 0 && !importResults && (
                  <div className="flex gap-4">
                    <Button
                      onClick={handleImport}
                      disabled={importing}
                      className="flex-1"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import {parsedData.length} Rankings
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setParsedData([]);
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="mt-6">
            <Button variant="outline" onClick={() => navigate('/rankings')}>
              Back to Rankings
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
