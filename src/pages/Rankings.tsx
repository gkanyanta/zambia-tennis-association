import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '@/components/Hero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { rankingService, Ranking } from '@/services/rankingService';
import { RefreshCw, Plus, Trash2, Upload, Link } from 'lucide-react';

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
                      rankings.map((player, index) => (
                        <tr key={player._id || index} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {player.rank}
                              </span>
                              {player.rank <= 3 && (
                                <Badge variant={player.rank === 1 ? 'default' : 'secondary'}>
                                  {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{player.playerName}</div>
                            {isAdmin && !player.playerZpin && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">No ZPIN linked</span>
                            )}
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
                                {!player.playerZpin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 border-amber-400 hover:bg-amber-50"
                                    title="Link to ZPIN account"
                                    onClick={() => setLinkModal({ rankingId: player._id!, playerName: player.playerName })}
                                  >
                                    <Link className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(player._id!)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
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
