import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '@/components/Hero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { rankingService, Ranking } from '@/services/rankingService';
import { RefreshCw, Plus, Trash2, Upload, Link, ChevronDown, ChevronRight, Pencil, Globe } from 'lucide-react';

type RankingCategory = 'men_senior' | 'women_senior' | 'boys_10u' | 'boys_12u' | 'boys_14u' | 'boys_16u' | 'boys_18u' | 'girls_10u' | 'girls_12u' | 'girls_14u' | 'girls_16u' | 'girls_18u' | 'madalas_overall' | 'madalas_ladies';

const categories = [
  { id: 'men_senior' as const, label: "Men's Senior" },
  { id: 'women_senior' as const, label: "Women's Senior" },
  { id: 'boys_18u' as const, label: 'Boys 18 & Under' },
  { id: 'boys_16u' as const, label: 'Boys 16 & Under' },
  { id: 'boys_14u' as const, label: 'Boys 14 & Under' },
  { id: 'boys_12u' as const, label: 'Boys 12 & Under' },
  { id: 'boys_10u' as const, label: 'Boys 10 & Under' },
  { id: 'girls_18u' as const, label: 'Girls 18 & Under' },
  { id: 'girls_16u' as const, label: 'Girls 16 & Under' },
  { id: 'girls_14u' as const, label: 'Girls 14 & Under' },
  { id: 'girls_12u' as const, label: 'Girls 12 & Under' },
  { id: 'girls_10u' as const, label: 'Girls 10 & Under' },
  { id: 'madalas_overall' as const, label: 'Madalas Overall' },
  { id: 'madalas_ladies' as const, label: 'Madalas Ladies' },
];

export function Rankings() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<RankingCategory>('men_senior');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    rank: 0,
    playerName: '',
    club: '',
    totalPoints: 0,
    rankingPeriod: '2025'
  });
  const [linkModal, setLinkModal] = useState<{ rankingId: string; playerName: string } | null>(null);
  const [linkZpin, setLinkZpin] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Edit tournament result modal
  const [editResultModal, setEditResultModal] = useState<{
    rankingId: string; playerName: string; result: any; resultIndex: number;
  } | null>(null);
  const [editResultForm, setEditResultForm] = useState({ tournamentName: '', points: 0, position: '', year: new Date().getFullYear(), tournamentDate: '' });
  const [editResultLoading, setEditResultLoading] = useState(false);

  // Add foreign result modal
  const POSITIONS = ['W', 'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128'];
  const GRADE_POINTS: Record<string, Record<string, number>> = {
    A: { W:130, F:80, SF:48, QF:24, R16:12, R32:8, R64:4, R128:1 },
    B: { W:100, F:60, SF:36, QF:18, R16:9,  R32:5, R64:3, R128:1 },
    C: { W:50,  F:30, SF:18, QF:9,  R16:5,  R32:2 },
    D: { W:25,  F:15, SF:9,  QF:5,  R16:2,  R32:1 },
    E: { W:10,  F:6,  SF:4,  QF:2,  R16:1 },
    F: { W:5,   F:3,  SF:1 },
  };
  const [addResultModal, setAddResultModal] = useState<{ rankingId: string; playerName: string } | null>(null);
  const [addResultForm, setAddResultForm] = useState({ tournamentName: '', country: '', grade: 'B', position: 'W', points: 100, overridePoints: false, year: new Date().getFullYear(), tournamentDate: '' });
  const [addResultLoading, setAddResultLoading] = useState(false);

  useEffect(() => {
    fetchRankings();
  }, [activeCategory]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const data = await rankingService.getRankingsByCategory(activeCategory);
      setRankings(data);
    } catch (err) {
      console.error('Failed to load rankings:', err);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRanking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rankingService.createOrUpdateRanking({
        ...formData,
        category: activeCategory
      });
      alert('Ranking added successfully!');
      setShowAddForm(false);
      setFormData({ rank: 0, playerName: '', club: '', totalPoints: 0, rankingPeriod: '2025' });
      await fetchRankings();
    } catch (err: any) {
      alert(err.message || 'Failed to add ranking');
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedRows(next);
  };

  const openEditResult = (rankingId: string, playerName: string, result: any, resultIndex: number) => {
    setEditResultModal({ rankingId, playerName, result, resultIndex });
    setEditResultForm({
      tournamentName: result.tournamentName,
      points: result.points,
      position: result.position || '',
      year: result.year,
      tournamentDate: result.tournamentDate ? result.tournamentDate.slice(0, 10) : '',
    });
  };

  const handleSaveEditResult = async () => {
    if (!editResultModal) return;
    setEditResultLoading(true);
    try {
      await rankingService.updateTournamentPoints(editResultModal.rankingId, {
        tournamentName: editResultForm.tournamentName,
        tournamentDate: editResultForm.tournamentDate,
        points: editResultForm.points,
        position: editResultForm.position,
        year: editResultForm.year,
      });
      setEditResultModal(null);
      await fetchRankings();
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setEditResultLoading(false);
    }
  };

  const handleAddForeignResult = async () => {
    if (!addResultModal) return;
    setAddResultLoading(true);
    try {
      const pts = addResultForm.overridePoints
        ? addResultForm.points
        : (GRADE_POINTS[addResultForm.grade]?.[addResultForm.position] ?? 0);
      await rankingService.updateTournamentPoints(addResultModal.rankingId, {
        tournamentName: addResultForm.country
          ? `${addResultForm.tournamentName} (${addResultForm.country})`
          : addResultForm.tournamentName,
        tournamentDate: addResultForm.tournamentDate,
        points: pts,
        position: addResultForm.position,
        year: addResultForm.year,
      });
      setAddResultModal(null);
      setAddResultForm({ tournamentName: '', country: '', grade: 'B', position: 'W', points: 100, overridePoints: false, year: new Date().getFullYear(), tournamentDate: '' });
      await fetchRankings();
    } catch (err: any) {
      alert(err.message || 'Failed to add result');
    } finally {
      setAddResultLoading(false);
    }
  };

  const handleLinkPlayer = async () => {
    if (!linkModal || !linkZpin.trim()) return;
    setLinkLoading(true);
    setLinkError('');
    try {
      await rankingService.linkPlayer(linkModal.rankingId, linkZpin.trim());
      setLinkModal(null);
      setLinkZpin('');
      await fetchRankings();
    } catch (err: any) {
      setLinkError(err.message || 'Player not found. Check the ZPIN and try again.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ranking?')) return;
    try {
      await rankingService.deleteRanking(id);
      alert('Ranking deleted successfully!');
      await fetchRankings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ranking');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Link Player Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-lg mb-1">Link Player Account</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Linking <span className="font-medium text-foreground">{linkModal.playerName}</span> to a registered ZPIN account.
            </p>
            <Input
              placeholder="Enter ZPIN (e.g. ZTAS0021)"
              value={linkZpin}
              onChange={e => { setLinkZpin(e.target.value.toUpperCase()); setLinkError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLinkPlayer()}
              className="mb-2"
              autoFocus
            />
            {linkError && <p className="text-sm text-destructive mb-2">{linkError}</p>}
            <div className="flex gap-2 mt-4">
              <Button className="flex-1" onClick={handleLinkPlayer} disabled={linkLoading || !linkZpin.trim()}>
                {linkLoading ? 'Linking...' : 'Link'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setLinkModal(null); setLinkZpin(''); setLinkError(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tournament Result Modal */}
      {editResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-lg mb-1">Edit Tournament Result</h3>
            <p className="text-sm text-muted-foreground mb-4">{editResultModal.playerName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Tournament Name</label>
                <Input value={editResultForm.tournamentName} onChange={e => setEditResultForm({ ...editResultForm, tournamentName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Position</label>
                  <Input placeholder="e.g. W, F, SF, QF" value={editResultForm.position} onChange={e => setEditResultForm({ ...editResultForm, position: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Points</label>
                  <Input type="number" min="0" value={editResultForm.points} onChange={e => setEditResultForm({ ...editResultForm, points: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Year</label>
                  <Input type="number" value={editResultForm.year} onChange={e => setEditResultForm({ ...editResultForm, year: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Date</label>
                  <Input type="date" value={editResultForm.tournamentDate} onChange={e => setEditResultForm({ ...editResultForm, tournamentDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button className="flex-1" onClick={handleSaveEditResult} disabled={editResultLoading}>
                {editResultLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditResultModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Foreign Tournament Result Modal */}
      {addResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-lg mb-1">Add Tournament Result</h3>
            <p className="text-sm text-muted-foreground mb-4">{addResultModal.playerName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Tournament Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g. Botswana Open 2026" value={addResultForm.tournamentName} onChange={e => setAddResultForm({ ...addResultForm, tournamentName: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium">Country (if foreign)</label>
                <Input placeholder="e.g. Botswana, Zimbabwe" value={addResultForm.country} onChange={e => setAddResultForm({ ...addResultForm, country: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Grade</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={addResultForm.grade}
                    onChange={e => {
                      const g = e.target.value;
                      const autoPoints = GRADE_POINTS[g]?.[addResultForm.position] ?? 0;
                      setAddResultForm({ ...addResultForm, grade: g, points: autoPoints });
                    }}
                  >
                    {['A','B','C','D','E','F'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Position</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={addResultForm.position}
                    onChange={e => {
                      const pos = e.target.value;
                      const autoPoints = GRADE_POINTS[addResultForm.grade]?.[pos] ?? 0;
                      setAddResultForm({ ...addResultForm, position: pos, points: autoPoints });
                    }}
                  >
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Year</label>
                  <Input type="number" value={addResultForm.year} onChange={e => setAddResultForm({ ...addResultForm, year: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Date</label>
                  <Input type="date" value={addResultForm.tournamentDate} onChange={e => setAddResultForm({ ...addResultForm, tournamentDate: e.target.value })} />
                </div>
              </div>
              <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Points: {addResultForm.overridePoints ? addResultForm.points : (GRADE_POINTS[addResultForm.grade]?.[addResultForm.position] ?? 0)}</div>
                  <div className="text-xs text-muted-foreground">Auto-calculated from grade + position</div>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={addResultForm.overridePoints} onChange={e => setAddResultForm({ ...addResultForm, overridePoints: e.target.checked })} />
                  Override
                </label>
              </div>
              {addResultForm.overridePoints && (
                <Input type="number" min="0" placeholder="Custom points" value={addResultForm.points} onChange={e => setAddResultForm({ ...addResultForm, points: Number(e.target.value) })} />
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <Button className="flex-1" onClick={handleAddForeignResult} disabled={addResultLoading || !addResultForm.tournamentName.trim()}>
                {addResultLoading ? 'Adding...' : 'Add Result'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAddResultModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <Hero
        title="National Rankings"
        description="Official ZTA rankings across all categories, updated bi-monthly"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex gap-2 mb-6">
              <Button onClick={() => navigate('/admin/rankings/import')}>
                <Upload className="h-4 w-4 mr-2" />
                Import from CSV
              </Button>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Player'}
              </Button>
              <Button variant="outline" onClick={fetchRankings}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}

          {/* Add Form */}
          {isAdmin && showAddForm && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <form onSubmit={handleAddRanking} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    type="number"
                    placeholder="Rank"
                    value={formData.rank || ''}
                    onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) })}
                    required
                  />
                  <Input
                    placeholder="Player Name"
                    value={formData.playerName}
                    onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Club"
                    value={formData.club}
                    onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Points"
                    value={formData.totalPoints || ''}
                    onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
                    required
                  />
                  <Button type="submit" className="md:col-span-4">Add to Rankings</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Rankings Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Player</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Club</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Points</th>
                      {isAdmin && <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-muted-foreground">
                          Loading rankings...
                        </td>
                      </tr>
                    ) : rankings.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-muted-foreground">
                          No rankings available for this category.
                          {isAdmin && ' Click "Add Player" to get started.'}
                        </td>
                      </tr>
                    ) : (
                      rankings.map((player, index) => {
                        const isExpanded = expandedRows.has(player._id!);
                        return (
                          <>
                            <tr key={player._id || index} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl font-bold text-muted-foreground">{player.rank}</span>
                                  {player.rank <= 3 && (
                                    <Badge variant={player.rank === 1 ? 'default' : 'secondary'}>
                                      {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  className="text-left w-full"
                                  onClick={() => toggleRow(player._id!)}
                                >
                                  <div className="flex items-center gap-1">
                                    {isAdmin && (isExpanded
                                      ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                      : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    <span className="font-semibold text-foreground">{player.playerName}</span>
                                  </div>
                                  {isAdmin && !player.playerZpin && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400">No ZPIN linked</span>
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-muted-foreground">{player.club || '-'}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-mono font-semibold">{player.totalPoints}</span>
                              </td>
                              {isAdmin && (
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50" title="Add tournament result" onClick={() => setAddResultModal({ rankingId: player._id!, playerName: player.playerName })}>
                                      <Globe className="h-4 w-4" />
                                    </Button>
                                    {!player.playerZpin && (
                                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-400 hover:bg-amber-50" title="Link to ZPIN account" onClick={() => setLinkModal({ rankingId: player._id!, playerName: player.playerName })}>
                                        <Link className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => handleDelete(player._id!)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                            {isAdmin && isExpanded && (
                              <tr key={`${player._id}-results`} className="bg-muted/20">
                                <td colSpan={5} className="px-8 py-3">
                                  {player.tournamentResults.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No tournament results recorded.</p>
                                  ) : (
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="text-xs text-muted-foreground">
                                          <th className="text-left pb-1 font-medium w-1/2">Tournament</th>
                                          <th className="text-center pb-1 font-medium">Position</th>
                                          <th className="text-center pb-1 font-medium">Year</th>
                                          <th className="text-right pb-1 font-medium">Points</th>
                                          <th className="text-right pb-1 font-medium w-16"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/50">
                                        {player.tournamentResults.map((result, ri) => (
                                          <tr key={result._id || ri}>
                                            <td className="py-1.5 pr-4">{result.tournamentName}</td>
                                            <td className="py-1.5 text-center">
                                              <Badge variant="outline" className="text-xs">{result.position || '—'}</Badge>
                                            </td>
                                            <td className="py-1.5 text-center text-muted-foreground">{result.year}</td>
                                            <td className="py-1.5 text-right font-mono font-medium">{result.points}</td>
                                            <td className="py-1.5 text-right">
                                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditResult(player._id!, player.playerName, result, ri)}>
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="mt-8 bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-3">About Rankings</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Rankings are updated bi-monthly based on tournament performance</p>
              <p>• Points are awarded based on tournament category and finishing position</p>
              <p>• National championships carry the most ranking points</p>
              <p>• Players must maintain active ZTA membership to be ranked</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
